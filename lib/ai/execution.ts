import { randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ProposalRecord } from '@/lib/store/types';
import { applyPlan, getOperation, validateOperationArgs } from '@/lib/google-ads/catalog';
import { newRequestStats, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { fromGoogleAdsFailure, toToolErrorPayload, type GoogleAdsFailureLike } from '@/lib/mcp/errors';
import { idempotencyKey, parseMeta, stableSerialize } from './proposals';
import { recordProposalEvent } from './conversations';

/**
 * Deterministic execution engine.
 *
 * The AI never executes a mutation. This module owns the entire write path:
 * proposal identity and account binding, re-validation, idempotency, a
 * compare-and-swap claim, a fresh live read with drift detection, the mutation
 * plan, read-back verification, the audit record, and reporting the outcome
 * back into the conversation.
 */

export type ExecutionErrorType =
  | 'conflict'
  | 'permission'
  | 'invalid_argument'
  | 'quota'
  | 'policy'
  | 'not_found'
  | 'timeout'
  | 'drift'
  | 'unknown';

export interface ExecutionError {
  type: ExecutionErrorType;
  message: string;
  next_step: string;
  google_ads_code?: string;
  field_path?: string;
}

export interface ExecutionOutcome {
  status: 'succeeded' | 'executed_unverified' | 'failed';
  operation: string;
  proposalId: string;
  revision: number;
  summary?: string;
  realIds?: Record<string, string>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  verification?: { mismatches: string[] };
  error?: ExecutionError;
  user_message: string;
  completed_at: string;
}

export interface ExecuteProposalInput {
  userId: string;
  proposalId: string;
  revision: number;
  payloadHash: string;
  /** Server-resolved credentials. Never taken from the browser. */
  customerId: string;
  accessToken: string;
  developerToken?: string;
  loginCustomerId?: string;
  currency?: string;
  accountName?: string;
}

const NEXT_STEPS: Record<ExecutionErrorType, string> = {
  conflict: 'Refresh the conversation and approve the latest proposal revision.',
  permission: 'Reconnect the Google Ads account or grant the required access, then try again.',
  invalid_argument: 'Ask the agent to prepare a corrected proposal.',
  quota: 'Google Ads is rate limiting requests. Try again shortly.',
  policy: 'Review the Google Ads policy issue and change the details.',
  not_found: 'The resource no longer exists or changed; ask the agent to re-check the account.',
  timeout: 'Check the account in a moment; ask the agent to verify before retrying.',
  drift: 'The account changed after this proposal was made. Ask the agent to prepare a new proposal from current values.',
  unknown: 'Ask the agent to review what happened before retrying.',
};

const VERIFY_ATTEMPTS = 3;

function failure(
  type: ExecutionErrorType,
  message: string,
  proposal: Pick<ProposalRecord, 'id' | 'revision' | 'operation'>,
  extra: Partial<ExecutionOutcome> & { googleAdsCode?: string; fieldPath?: string } = {}
): ExecutionOutcome {
  const { googleAdsCode, fieldPath, ...rest } = extra;
  return {
    status: 'failed',
    operation: proposal.operation,
    proposalId: proposal.id,
    revision: proposal.revision,
    ...rest,
    error: {
      type,
      message,
      next_step: NEXT_STEPS[type],
      ...(googleAdsCode ? { google_ads_code: googleAdsCode } : {}),
      ...(fieldPath ? { field_path: fieldPath } : {}),
    },
    user_message: 'The Google Ads change was not applied.',
    completed_at: new Date().toISOString(),
  };
}

function classify(result: GoogleAdsFailureLike): { type: ExecutionErrorType; code?: string; field?: string } {
  const payload = fromGoogleAdsFailure(result).payload;
  const map: Record<string, ExecutionErrorType> = {
    permission: 'permission',
    missing_configuration: 'permission',
    quota: 'quota',
    invalid_argument: 'invalid_argument',
    api_restriction: 'invalid_argument',
    unsupported: 'invalid_argument',
    policy: 'policy',
    not_found: 'not_found',
    stale_data: 'not_found',
    timeout: 'timeout',
    transient: 'timeout',
  };
  return { type: map[payload.code] || 'unknown', code: payload.google_ads_code, field: payload.field_path };
}

function sameValue(expected: unknown, actual: unknown): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') return Math.abs(expected - actual) <= 0.01;
  if ((expected === undefined || expected === null) && (actual === undefined || actual === null)) return true;
  return stableSerialize(expected) === stableSerialize(actual);
}

function driftedKeys(before: Record<string, unknown>, live: Record<string, unknown>, keys: string[]): string[] {
  return keys.filter((key) => key in before && !sameValue(before[key], live[key]));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeProposal(input: ExecuteProposalInput): Promise<ExecutionOutcome> {
  const store = await getStore();

  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) {
    return failure('not_found', 'This proposal was not found.', { id: input.proposalId, revision: input.revision, operation: 'unknown' });
  }
  if (record.revision !== input.revision || record.payload_hash !== input.payloadHash) {
    return failure('conflict', 'This proposal revision is stale.', record);
  }
  if (record.account_id.replace(/\D/g, '') !== input.customerId.replace(/\D/g, '')) {
    return failure('permission', 'This proposal belongs to a different Google Ads account than the one connected to your login.', record);
  }

  const operation = getOperation(record.operation);
  if (!operation) return failure('invalid_argument', `"${record.operation}" is not an executable operation.`, record);

  const meta = parseMeta(record);
  const payload = JSON.parse(record.payload) as Record<string, unknown>;
  const before = record.before_snapshot ? (JSON.parse(record.before_snapshot) as Record<string, unknown>) : {};

  // Idempotency: a retried request returns the original outcome.
  const key = idempotencyKey(record.id, record.revision, record.payload_hash);
  const existing = await store.executions.get(key);
  if (existing && existing.status !== 'started' && existing.error) {
    const stored = JSON.parse(existing.error);
    if (stored && typeof stored === 'object' && 'status' in stored) return stored as ExecutionOutcome;
  }

  // Compare-and-swap: only one caller can move approved -> executing.
  const claimed = await store.proposals.claim(record.id, input.userId, input.revision, input.payloadHash);
  if (!claimed) {
    const latest = await store.proposals.get(record.id, input.userId);
    if (latest?.result && ['succeeded', 'failed', 'executed_unverified'].includes(latest.status)) {
      return JSON.parse(latest.result) as ExecutionOutcome;
    }
    return failure('conflict', `This proposal is not ready for execution; its current status is ${latest?.status || 'unknown'}.`, record);
  }

  const began = await store.executions.begin({
    idempotency_key: key,
    proposal_id: record.id,
    attempt: 1,
    status: 'started',
    before: null,
    after: null,
    error: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  });
  if (!began) return failure('conflict', 'This proposal is already being executed.', record);

  const finish = async (outcome: ExecutionOutcome): Promise<ExecutionOutcome> => {
    const completed: ExecutionOutcome = { ...outcome, summary: meta.summary };
    await store.proposals.update({
      ...claimed,
      status: completed.status,
      result: JSON.stringify(completed),
      updated_at: new Date().toISOString(),
    });
    await store.executions.complete(key, {
      status: completed.status,
      before: completed.before ? JSON.stringify(completed.before) : null,
      after: completed.after ? JSON.stringify(completed.after) : null,
      error: JSON.stringify(completed),
      completed_at: completed.completed_at,
    });
    await store.audit.append({
      id: randomUUID(),
      event:
        completed.status === 'succeeded'
          ? 'execution_verified'
          : completed.status === 'executed_unverified'
          ? 'execution_unverified'
          : 'execution_failed',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: completed.completed_at,
      details: JSON.stringify({
        operation: record.operation,
        revision: record.revision,
        status: completed.status,
        realIds: completed.realIds || null,
        mismatches: completed.verification?.mismatches || null,
        error: completed.error || null,
      }),
    });
    try {
      await recordProposalEvent(record, completed.status, {
        message: completed.status === 'succeeded' ? undefined : [completed.user_message, completed.error?.message].filter(Boolean).join(' '),
        realIds: completed.realIds,
      });
    } catch (error) {
      console.warn('[AI Execution] Conversation state update failed:', error);
    }
    return completed;
  };

  const validation = validateOperationArgs(operation, payload, { allowInternal: true });
  if (!validation.valid) return finish(failure('invalid_argument', validation.errors.join(' '), record, { before }));

  const context: GoogleAdsContext = {
    customerId: input.customerId,
    accessToken: input.accessToken,
    developerToken: input.developerToken,
    loginCustomerId: input.loginCustomerId,
    currency: input.currency || 'USD',
    accountName: input.accountName || '',
    stats: newRequestStats(),
  };

  // Fresh live read for drift detection.
  let live: Record<string, unknown>;
  try {
    live = await operation.readState(payload, context);
  } catch (error) {
    const payloadError = toToolErrorPayload(error);
    return finish(failure(payloadError.code === 'permission' ? 'permission' : 'timeout', payloadError.message, record, { before }));
  }
  const isCreate = meta.target.kind === 'new_campaign';
  if (!isCreate && live.exists === false) {
    return finish(failure('not_found', 'The resource this proposal changes no longer exists.', record, { before }));
  }
  const drifted = driftedKeys(before, live, operation.driftKeys);
  if (drifted.length) {
    return finish(
      failure('drift', `The account changed after this proposal was created (${drifted.join(', ')}).`, record, { before, after: live })
    );
  }

  let plan;
  try {
    plan = operation.plan(payload, context, live);
  } catch (error) {
    return finish(failure('invalid_argument', toToolErrorPayload(error).message, record, { before }));
  }

  const applied = await applyPlan(plan, context);
  if (!applied.ok) {
    const classified = classify(applied.failure);
    const message = applied.failure.error || 'Google Ads rejected the change.';
    if (applied.appliedSteps > 0) {
      return finish({
        status: 'executed_unverified',
        operation: record.operation,
        proposalId: record.id,
        revision: record.revision,
        before,
        error: { type: classified.type, message, next_step: NEXT_STEPS[classified.type], google_ads_code: classified.code, field_path: classified.field },
        user_message: 'Part of this change was applied, but a later step was rejected by Google Ads. Ask the agent to check the current state before trying again.',
        completed_at: new Date().toISOString(),
      });
    }
    return finish(failure(classified.type, message, record, { before, googleAdsCode: classified.code, fieldPath: classified.field }));
  }

  const realIds = operation.realIds?.(payload, applied.results, context) || {};

  let after: Record<string, unknown> | undefined;
  let mismatches: string[] = ['not read back'];
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
    try {
      after = await operation.readState(payload, context, realIds);
      mismatches = operation.verify(payload, after, realIds);
      if (!mismatches.length) break;
    } catch {
      mismatches = ['read-back failed'];
    }
    if (attempt < VERIFY_ATTEMPTS - 1) await wait(800 * (attempt + 1));
  }

  if (mismatches.length) {
    return finish({
      status: 'executed_unverified',
      operation: record.operation,
      proposalId: record.id,
      revision: record.revision,
      realIds,
      before,
      after,
      verification: { mismatches },
      user_message: `Google Ads accepted the change, but reading it back did not confirm it yet (${mismatches.join('; ')}). It may still be propagating; ask the agent to re-check before changing it again.`,
      completed_at: new Date().toISOString(),
    });
  }

  return finish({
    status: 'succeeded',
    operation: record.operation,
    proposalId: record.id,
    revision: record.revision,
    realIds,
    before,
    after,
    verification: { mismatches: [] },
    user_message: isCreate
      ? `Created and verified in your live account${realIds.campaignId ? ` (campaign ID ${realIds.campaignId})` : ''}.`
      : 'Applied and verified in your live Google Ads account.',
    completed_at: new Date().toISOString(),
  });
}
