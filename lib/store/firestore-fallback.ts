import firebaseConfig from '@/firebase-applet-config.json';
import { getStore, isD1Active } from './index';
import type { ExecutionRecord, ProposalRecord, ProposalStatus } from './types';

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null };

function documentUrl(path: string): string {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${path}`;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

function decodeValue(value: Record<string, unknown> | undefined): unknown {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  return undefined;
}

function encodeFields(record: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, val] of Object.entries(record)) {
    if (val !== undefined) {
      fields[key] = encodeValue(val);
    }
  }
  return fields;
}

function decodeFields(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    out[key] = decodeValue(val);
  }
  return out;
}

function shouldUseFirestoreFallback(idToken?: string): boolean {
  if (!idToken) return false;
  if (process.env.AI_STORE === 'memory') return false;
  if (isD1Active()) return false;
  return true;
}

export async function syncProposalToFirestore(
  record: ProposalRecord,
  idToken?: string
): Promise<void> {
  await getStore();
  if (!shouldUseFirestoreFallback(idToken)) return;

  try {
    const response = await fetch(
      documentUrl(`users/${record.user_id}/ai_proposals/${encodeURIComponent(record.id)}`),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: encodeFields({
            id: record.id,
            user_id: record.user_id,
            conversation_id: record.conversation_id,
            account_id: record.account_id,
            revision: record.revision,
            status: record.status,
            operation: record.operation,
            payload: record.payload,
            payload_hash: record.payload_hash,
            before_snapshot: record.before_snapshot ?? null,
            supersedes_id: record.supersedes_id ?? null,
            expires_at: record.expires_at ?? null,
            result: record.result ?? null,
            meta: record.meta ?? null,
            created_at: record.created_at,
            updated_at: record.updated_at,
          }),
        }),
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[AI Store] Firestore proposal sync failed:', response.status, detail.slice(0, 160));
    }
  } catch (error) {
    console.warn('[AI Store] Firestore proposal sync error:', error);
  }
}

export async function loadProposalFromFirestore(
  proposalId: string,
  userId: string,
  idToken?: string
): Promise<ProposalRecord | undefined> {
  await getStore();
  if (!shouldUseFirestoreFallback(idToken)) return undefined;

  try {
    const response = await fetch(
      documentUrl(`users/${userId}/ai_proposals/${encodeURIComponent(proposalId)}`),
      {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
      }
    );
    if (response.status === 404 || !response.ok) return undefined;
    const doc = (await response.json()) as { fields?: Record<string, Record<string, unknown>> };
    if (!doc.fields) return undefined;
    const raw = decodeFields(doc.fields);
    if (!raw.id || !raw.user_id || !raw.operation || !raw.payload || !raw.payload_hash) {
      return undefined;
    }
    return {
      id: String(raw.id),
      user_id: String(raw.user_id),
      conversation_id: String(raw.conversation_id || ''),
      account_id: String(raw.account_id || ''),
      revision: Number(raw.revision || 1),
      status: String(raw.status || 'pending_approval') as ProposalStatus,
      operation: String(raw.operation),
      payload: String(raw.payload),
      payload_hash: String(raw.payload_hash),
      before_snapshot: raw.before_snapshot != null ? String(raw.before_snapshot) : null,
      supersedes_id: raw.supersedes_id != null ? String(raw.supersedes_id) : null,
      expires_at: raw.expires_at != null ? String(raw.expires_at) : null,
      result: raw.result != null ? String(raw.result) : null,
      meta: raw.meta != null ? String(raw.meta) : null,
      created_at: String(raw.created_at || new Date().toISOString()),
      updated_at: String(raw.updated_at || new Date().toISOString()),
    };
  } catch (error) {
    console.warn('[AI Store] Firestore proposal read error:', error);
    return undefined;
  }
}

export async function syncExecutionToFirestore(
  record: ExecutionRecord,
  userId: string,
  idToken?: string
): Promise<void> {
  await getStore();
  if (!shouldUseFirestoreFallback(idToken)) return;

  try {
    await fetch(
      documentUrl(`users/${userId}/ai_executions/${encodeURIComponent(record.idempotency_key)}`),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: encodeFields({
            idempotency_key: record.idempotency_key,
            proposal_id: record.proposal_id,
            attempt: record.attempt,
            status: record.status,
            before: record.before ?? null,
            after: record.after ?? null,
            error: record.error ?? null,
            started_at: record.started_at,
            completed_at: record.completed_at ?? null,
          }),
        }),
        cache: 'no-store',
      }
    );
  } catch (error) {
    console.warn('[AI Store] Firestore execution sync error:', error);
  }
}

export async function loadExecutionFromFirestore(
  idempotencyKey: string,
  userId: string,
  idToken?: string
): Promise<ExecutionRecord | undefined> {
  await getStore();
  if (!shouldUseFirestoreFallback(idToken)) return undefined;

  try {
    const response = await fetch(
      documentUrl(`users/${userId}/ai_executions/${encodeURIComponent(idempotencyKey)}`),
      {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
      }
    );
    if (response.status === 404 || !response.ok) return undefined;
    const doc = (await response.json()) as { fields?: Record<string, Record<string, unknown>> };
    if (!doc.fields) return undefined;
    const raw = decodeFields(doc.fields);
    if (!raw.idempotency_key || !raw.proposal_id) return undefined;
    return {
      idempotency_key: String(raw.idempotency_key),
      proposal_id: String(raw.proposal_id),
      attempt: Number(raw.attempt || 1),
      status: String(raw.status || 'started') as ExecutionRecord['status'],
      before: raw.before != null ? String(raw.before) : null,
      after: raw.after != null ? String(raw.after) : null,
      error: raw.error != null ? String(raw.error) : null,
      started_at: String(raw.started_at || new Date().toISOString()),
      completed_at: raw.completed_at != null ? String(raw.completed_at) : null,
    };
  } catch (error) {
    console.warn('[AI Store] Firestore execution read error:', error);
    return undefined;
  }
}

/**
 * Ensures a proposal exists in the active store when running without D1 across
 * server restarts or serverless isolates by hydrating from Firestore.
 */
export async function hydrateProposalIntoStore(
  proposalId: string,
  userId: string,
  idToken?: string
): Promise<ProposalRecord | undefined> {
  const store = await getStore();
  const existing = await store.proposals.get(proposalId, userId);
  if (existing) return existing;

  const remote = await loadProposalFromFirestore(proposalId, userId, idToken);
  if (!remote || remote.user_id !== userId) return undefined;

  await store.proposals.create(remote);
  return remote;
}

/**
 * Ensures an execution idempotency marker exists in the active store when
 * running without D1 across serverless isolates.
 */
export async function hydrateExecutionIntoStore(
  idempotencyKey: string,
  userId: string,
  idToken?: string
): Promise<ExecutionRecord | undefined> {
  const store = await getStore();
  const existing = await store.executions.get(idempotencyKey);
  if (existing) return existing;

  const remote = await loadExecutionFromFirestore(idempotencyKey, userId, idToken);
  if (!remote) return undefined;

  await store.executions.begin(remote);
  return remote;
}
