import { randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ProposalRecord } from '@/lib/store/types';
import { getOperation, validateOperationArgs } from '@/lib/google-ads/catalog';
import type { CampaignSnapshot } from '@/lib/google-ads/catalog';
import { mutateGoogleAdsCombined, mutateGoogleAdsResources } from '@/lib/google-ads/mutate';
import { fetchCampaignConversionGoals, fetchCampaignSettings } from '@/lib/google-ads-api';
import { idempotencyKey } from './proposals';

/**
 * Deterministic execution engine.
 *
 * The AI never executes a mutation. This module owns the entire write path:
 * account binding, re-validation, drift detection, idempotency, the mutate
 * call, a fresh read-back, and the audit record.
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
}

export interface ExecutionOutcome {
  status: 'succeeded' | 'executed_unverified' | 'failed';
  operation: string;
  proposalId: string;
  revision: number;
  realIds?: Record<string, string>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
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
}

const NEXT_STEPS: Record<ExecutionErrorType, string> = {
  conflict: 'Refresh the conversation and approve the latest proposal revision.',
  permission: 'Reconnect the Google Ads account or grant the required access, then try again.',
  invalid_argument: 'Review the values and prepare a corrected proposal.',
  quota: 'Google Ads is rate limiting requests. Try again shortly.',
  policy: 'Review the Google Ads policy issue and change the campaign details.',
  not_found: 'Refresh the account data and confirm the campaign still exists.',
  timeout: 'Check the Google Ads connection and retry once it is stable.',
  drift: 'Refresh the campaign and prepare a new proposal from its current values.',
  unknown: 'Review the Google Ads response and retry.',
};

function failure(
  type: ExecutionErrorType,
  message: string,
  proposal: Pick<ProposalRecord, 'id' | 'revision' | 'operation'>,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): ExecutionOutcome {
  return {
    status: 'failed',
    operation: proposal.operation,
    proposalId: proposal.id,
    revision: proposal.revision,
    before,
    after,
    error: { type, message, next_step: NEXT_STEPS[type] },
    user_message: 'The Google Ads change was not applied.',
    completed_at: new Date().toISOString(),
  };
}

function classifyFailure(result: {
  error?: string;
  statusCode?: number;
  isAuthExpired?: boolean;
  isQuotaExhausted?: boolean;
}): ExecutionErrorType {
  const message = (result.error || '').toLowerCase();
  if (result.isQuotaExhausted || result.statusCode === 429) return 'quota';
  if (result.isAuthExpired || result.statusCode === 401 || result.statusCode === 403) return 'permission';
  if (result.statusCode === 404 || message.includes('not found')) return 'not_found';
  if (result.statusCode === 400 || message.includes('invalid') || message.includes('required')) {
    return 'invalid_argument';
  }
  if (message.includes('policy') || message.includes('disapproved')) return 'policy';
  if (message.includes('timeout') || message.includes('timed out') || message.includes('network')) {
    return 'timeout';
  }
  return 'unknown';
}

function toSnapshot(settings: {
  campaignId: string;
  name: string;
  status: string;
  budgetDaily?: number;
  biddingStrategyType?: string;
  targetCpaMicros?: number;
  targetRoas?: number;
  startDate?: string;
  endDate?: string;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  targetGoogleSearch?: boolean;
  targetSearchNetwork?: boolean;
  targetContentNetwork?: boolean;
  targetPartnerSearchNetwork?: boolean;
  budgetResourceName?: string;
  resourceName?: string;
}): CampaignSnapshot {
  return { ...settings };
}

function hasDrift(
  before: Record<string, unknown>,
  current: CampaignSnapshot,
  driftFields: Array<keyof CampaignSnapshot>
): boolean {
  for (const field of driftFields) {
    const expected = before[field as string];
    if (expected === undefined) continue;
    const actual = current[field];
    if (field === 'budgetDaily') {
      if (Math.abs(Number(expected) - Number(actual)) > 0.01) return true;
      continue;
    }
    if (String(expected) !== String(actual)) return true;
  }
  return false;
}

async function readSettings(input: ExecuteProposalInput, campaignId: string) {
  return fetchCampaignSettings(
    input.customerId,
    campaignId,
    input.accessToken,
    input.developerToken,
    input.loginCustomerId
  );
}

export async function executeProposal(input: ExecuteProposalInput): Promise<ExecutionOutcome> {
  const store = await getStore();

  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) {
    return failure('not_found', 'This proposal was not found.', {
      id: input.proposalId,
      revision: input.revision,
      operation: 'unknown',
    });
  }

  if (record.revision !== input.revision || record.payload_hash !== input.payloadHash) {
    return failure('conflict', 'This proposal revision is stale.', record);
  }

  if (record.account_id.replace(/\D/g, '') !== input.customerId.replace(/\D/g, '')) {
    return failure(
      'permission',
      'This proposal belongs to a different Google Ads account than the one connected to your login.',
      record
    );
  }

  const operation = getOperation(record.operation);
  if (!operation || operation.risk !== 'write') {
    return failure(
      'invalid_argument',
      `"${record.operation}" is not an executable write operation.`,
      record
    );
  }

  const payload = JSON.parse(record.payload) as Record<string, unknown>;
  const beforeSnapshot = record.before_snapshot
    ? (JSON.parse(record.before_snapshot) as Record<string, unknown>)
    : {};

  // Re-validate immediately before execution. The proposal may have been
  // created minutes ago and the schema or values must still be valid.
  const validation = validateOperationArgs(operation, payload);
  if (!validation.valid) {
    const outcome = failure('invalid_argument', validation.errors.join(' '), record, beforeSnapshot);
    await store.proposals.update({
      ...record,
      status: 'failed',
      result: JSON.stringify(outcome),
      updated_at: new Date().toISOString(),
    });
    return outcome;
  }

  const campaignId = String(payload.campaignId || beforeSnapshot.campaignId || '').replace(/\D/g, '');
  if (!campaignId && !operation.createsResource) {
    const outcome = failure('invalid_argument', 'The proposal has no campaign ID.', record, beforeSnapshot);
    await store.proposals.update({
      ...record,
      status: 'failed',
      result: JSON.stringify(outcome),
      updated_at: new Date().toISOString(),
    });
    return outcome;
  }

  // Idempotency: a retried request must not apply the change twice.
  const key = idempotencyKey(record.id, record.revision, record.payload_hash);
  const existing = await store.executions.get(key);
  if (existing && existing.status !== 'started') {
    const stored = existing.error ? JSON.parse(existing.error) : undefined;
    if (stored && typeof stored === 'object' && 'status' in stored) {
      return stored as ExecutionOutcome;
    }
  }

  // Compare-and-swap: only one caller can move approved -> executing.
  const claimed = await store.proposals.claim(
    record.id,
    input.userId,
    input.revision,
    input.payloadHash
  );
  if (!claimed) {
    const latest = await store.proposals.get(record.id, input.userId);
    if (latest?.status === 'succeeded' && latest.result) {
      return JSON.parse(latest.result) as ExecutionOutcome;
    }
    return failure(
      'conflict',
      `This proposal is not ready for execution; its current status is ${latest?.status || 'unknown'}.`,
      record
    );
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
  if (!began) {
    const concurrent = await store.executions.get(key);
    if (concurrent?.error) {
      const stored = JSON.parse(concurrent.error);
      if (stored && typeof stored === 'object' && 'status' in stored) {
        return stored as ExecutionOutcome;
      }
    }
    return failure('conflict', 'This proposal is already being executed.', record);
  }

  const finish = async (outcome: ExecutionOutcome): Promise<ExecutionOutcome> => {
    const status =
      outcome.status === 'succeeded'
        ? 'succeeded'
        : outcome.status === 'executed_unverified'
        ? 'executed_unverified'
        : 'failed';
    await store.proposals.update({
      ...claimed,
      status,
      result: JSON.stringify(outcome),
      updated_at: new Date().toISOString(),
    });
    await store.executions.complete(key, {
      status,
      before: outcome.before ? JSON.stringify(outcome.before) : null,
      after: outcome.after ? JSON.stringify(outcome.after) : null,
      error: JSON.stringify(outcome),
      completed_at: outcome.completed_at,
    });
    await store.audit.append({
      id: randomUUID(),
      event: status === 'succeeded' ? 'execution_verified' : 'execution_failed',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: outcome.completed_at,
      details: JSON.stringify({
        operation: record.operation,
        revision: record.revision,
        status: outcome.status,
        error: outcome.error || null,
      }),
    });
    return outcome;
  };

  const mutateContext = {
    customerId: input.customerId,
    accessToken: input.accessToken,
    developerToken: input.developerToken,
    loginCustomerId: input.loginCustomerId,
  };

  // Creation has no existing campaign to drift-check; it is validated and then
  // verified by reading the newly created campaign back.
  if (operation.createsResource) {
    let combined;
    try {
      combined = operation.buildCombined?.(payload, {
        customerId: input.customerId,
        accountCurrency: undefined,
      });
    } catch (error) {
      return finish(
        failure(
          'invalid_argument',
          error instanceof Error ? error.message : 'The campaign could not be built.',
          record,
          beforeSnapshot
        )
      );
    }
    if (!combined || combined.combined.length === 0) {
      return finish(
        failure('invalid_argument', 'The creation request produced no operations.', record, beforeSnapshot)
      );
    }

    const preflight = await mutateGoogleAdsCombined(combined.combined, mutateContext, {
      validateOnly: true,
    });
    if (!preflight.success) {
      return finish(
        failure(
          classifyFailure(preflight),
          preflight.error || 'Google Ads rejected the campaign during validation.',
          record,
          beforeSnapshot
        )
      );
    }

    const created = await mutateGoogleAdsCombined(combined.combined, mutateContext);
    if (!created.success) {
      return finish(
        failure(
          classifyFailure(created),
          created.error || 'Google Ads rejected the campaign creation.',
          record,
          beforeSnapshot
        )
      );
    }

    const campaignResourceName = (created.responses || [])
      .map((response) => {
        const result = (response as { campaignResult?: { resourceName?: string } }).campaignResult;
        return result?.resourceName;
      })
      .find(Boolean);
    const createdId = campaignResourceName ? String(campaignResourceName).split('/').pop() : undefined;

    if (!createdId) {
      return finish({
        status: 'executed_unverified',
        operation: record.operation,
        proposalId: record.id,
        revision: record.revision,
        before: beforeSnapshot,
        user_message:
          'Google Ads accepted the campaign creation, but the new campaign ID could not be read back.',
        completed_at: new Date().toISOString(),
      });
    }

    let createdSettings;
    for (let attempt = 0; attempt < 3 && !createdSettings; attempt += 1) {
      const read = await readSettings(input, createdId);
      if (read.success && read.settings) {
        createdSettings = toSnapshot(read.settings);
        break;
      }
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }

    if (!createdSettings || !operation.verify(payload, createdSettings)) {
      return finish({
        status: 'executed_unverified',
        operation: record.operation,
        proposalId: record.id,
        revision: record.revision,
        realIds: { campaignId: createdId },
        before: beforeSnapshot,
        after: createdSettings as unknown as Record<string, unknown> | undefined,
        user_message:
          'Google Ads accepted the campaign creation, but the read-back did not match the requested settings.',
        completed_at: new Date().toISOString(),
      });
    }

    return finish({
      status: 'succeeded',
      operation: record.operation,
      proposalId: record.id,
      revision: record.revision,
      realIds: { campaignId: createdId },
      before: beforeSnapshot,
      after: createdSettings as unknown as Record<string, unknown>,
      user_message: 'The campaign was created and verified from the live account.',
      completed_at: new Date().toISOString(),
    });
  }

  // Fresh read for drift detection.
  let current;
  try {
    current = await readSettings(input, campaignId);
  } catch (error) {
    return finish(
      failure(
        'timeout',
        error instanceof Error ? error.message : 'The live campaign read failed.',
        record,
        beforeSnapshot
      )
    );
  }
  if (!current.success || !current.settings) {
    return finish(
      failure(
        classifyFailure(current),
        current.error || 'The campaign could not be read from Google Ads.',
        record,
        beforeSnapshot
      )
    );
  }

  const liveSnapshot = toSnapshot(current.settings);
  if (hasDrift(beforeSnapshot, liveSnapshot, operation.driftFields)) {
    return finish(
      failure(
        'drift',
        'The campaign changed in Google Ads after this proposal was created.',
        record,
        beforeSnapshot,
        liveSnapshot as unknown as Record<string, unknown>
      )
    );
  }

  const operationContext = { customerId: input.customerId, campaign: liveSnapshot };

  let built;
  try {
    built = operation.buildOperations(payload, operationContext);
  } catch (error) {
    return finish(
      failure(
        'invalid_argument',
        error instanceof Error ? error.message : 'The change could not be built.',
        record,
        beforeSnapshot
      )
    );
  }

  // Pre-flight validation immediately before the real mutate.
  for (const group of built) {
    const preflight = await mutateGoogleAdsResources(group.service, group.operations, mutateContext, {
      validateOnly: true,
    });
    if (!preflight.success) {
      return finish(
        failure(
          classifyFailure(preflight),
          preflight.error || 'Google Ads rejected the change during validation.',
          record,
          beforeSnapshot
        )
      );
    }
  }

  for (const group of built) {
    const result = await mutateGoogleAdsResources(group.service, group.operations, mutateContext);
    if (!result.success) {
      return finish(
        failure(
          classifyFailure(result),
          result.error || 'Google Ads rejected the change.',
          record,
          beforeSnapshot
        )
      );
    }
  }

  // Read-back verification with a short retry for eventual consistency.
  let after: CampaignSnapshot | undefined;
  for (let attempt = 0; attempt < 3 && !after; attempt += 1) {
    const read = await readSettings(input, campaignId);
    if (read.success && read.settings) {
      after = toSnapshot(read.settings);
      break;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }

  if (!after) {
    return finish({
      status: 'executed_unverified',
      operation: record.operation,
      proposalId: record.id,
      revision: record.revision,
      before: beforeSnapshot,
      user_message:
        'Google Ads accepted the change, but the campaign could not be read back to confirm it.',
      completed_at: new Date().toISOString(),
    });
  }

  if (!operation.verify(payload, after)) {
    return finish({
      status: 'executed_unverified',
      operation: record.operation,
      proposalId: record.id,
      revision: record.revision,
      before: beforeSnapshot,
      after: after as unknown as Record<string, unknown>,
      user_message:
        'Google Ads accepted the change, but the read-back did not match the requested result.',
      completed_at: new Date().toISOString(),
    });
  }

  // Conversion goals are verified through their own read, not the campaign read.
  if (record.operation === 'update_campaign_conversion_goals') {
    const goals = await fetchCampaignConversionGoals(
      input.customerId,
      campaignId,
      input.accessToken,
      input.developerToken,
      input.loginCustomerId
    );
    const category = String(payload.category || '');
    const expected = Boolean(payload.biddable);
    const observed = goals.success
      ? (goals.goals || []).find((goal) => goal.category === category)
      : undefined;
    if (!goals.success || !observed || observed.biddable !== expected) {
      return finish({
        status: 'executed_unverified',
        operation: record.operation,
        proposalId: record.id,
        revision: record.revision,
        before: beforeSnapshot,
        after: after as unknown as Record<string, unknown>,
        user_message:
          'Google Ads accepted the conversion goal change, but the read-back did not confirm it.',
        completed_at: new Date().toISOString(),
      });
    }
  }

  return finish({
    status: 'succeeded',
    operation: record.operation,
    proposalId: record.id,
    revision: record.revision,
    realIds: { campaignId },
    before: beforeSnapshot,
    after: after as unknown as Record<string, unknown>,
    user_message: 'The Google Ads change was applied and verified from the live account.',
    completed_at: new Date().toISOString(),
  });
}
