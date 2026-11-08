import {
  getGoogleAdsOperation,
  ProposalExecutionContext,
  ProposalExecutionResult as RegistryExecutionResult,
} from '@/lib/google-ads-tools';
import {
  clearGoogleAdsCache,
  queryLiveCampaigns,
} from '@/lib/google-ads-api';
import {
  claimProposalForExecution,
  ProposalExecutionResult,
  ProposalRecord,
  updateProposalStatus,
} from '@/lib/chat-proposal-store';
import { GoogleAdsAccount } from '@/types/adoptimize';
import { invalidateAccountCache, recordSuccessfulCampaignWrite, clearPendingCampaignCreation } from '@/lib/conversation-state';

type TypedErrorType =
  | 'permission'
  | 'invalid_argument'
  | 'quota'
  | 'policy'
  | 'not_found'
  | 'timeout'
  | 'unknown';

interface ProposalExecutorOptions {
  conversationId: string;
  revision: number;
  payloadHash: string;
  account: GoogleAdsAccount;
  accessToken: string;
  userId?: string;
}

interface TypedExecutionError {
  type: TypedErrorType;
  message: string;
  next_step: string;
}

function typedError(result: RegistryExecutionResult | Error): TypedExecutionError {
  const statusCode = 'statusCode' in result ? result.statusCode : undefined;
  const message = result instanceof Error
    ? result.message
    : result.error || 'Google Ads execution failed.';
  const lower = message.toLowerCase();
  let type: TypedErrorType = 'unknown';

  if ('isQuotaExhausted' in result && result.isQuotaExhausted || statusCode === 429) type = 'quota';
  else if (statusCode === 401 || statusCode === 403 || ('isAuthExpired' in result && result.isAuthExpired)) type = 'permission';
  else if (statusCode === 404 || lower.includes('not found') || lower.includes('could not locate')) type = 'not_found';
  else if (statusCode === 400 || lower.includes('invalid') || lower.includes('required')) type = 'invalid_argument';
  else if (lower.includes('policy') || lower.includes('political') || lower.includes('disapproved')) type = 'policy';
  else if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('network')) type = 'timeout';

  const nextSteps: Record<TypedErrorType, string> = {
    permission: 'Reconnect the Google Ads account or grant the required account permission, then try again.',
    invalid_argument: 'Review the proposal values and submit a corrected request.',
    quota: 'Wait for the Google Ads quota window to recover, then try again.',
    policy: 'Review the Google Ads policy issue and change the campaign details before trying again.',
    not_found: 'Refresh the account data and verify that the campaign or account still exists.',
    timeout: 'Check the Google Ads account status and retry once the connection is stable.',
    unknown: 'Review the Google Ads response and contact support if the problem persists.',
  };

  return { type, message, next_step: nextSteps[type] };
}

function campaignIdMatches(left: string, right: string): boolean {
  return left === right || left.replace(/^camp-live-/, '') === right.replace(/^camp-live-/, '');
}

async function readCampaign(
  customerId: string,
  accessToken: string,
  account: GoogleAdsAccount,
  campaignId: string
) {
  clearGoogleAdsCache(customerId);
  const result = await queryLiveCampaigns(
    customerId,
    accessToken,
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    account.loginCustomerId,
    { forceRefresh: true }
  );
  if (!result.success) throw new Error(result.error || 'Google Ads campaign read failed.');
  return (result.campaigns || []).find((campaign: any) => campaignIdMatches(String(campaign.id), campaignId));
}

function hasDrift(before: Record<string, any>, current: Record<string, any> | undefined): boolean {
  if (before.exists === false) return Boolean(current);
  if (!current) return true;
  const fields = ['id', 'name', 'status', 'budgetDaily'];
  return fields.some((field) => {
    if (before[field] === undefined) return false;
    if (field === 'budgetDaily') return Math.abs(Number(before[field]) - Number(current[field])) > 0.01;
    return String(before[field]) !== String(current[field]);
  });
}

function resultMessage(result: ProposalExecutionResult): string {
  if (result.status === 'succeeded') return result.user_message;
  if (result.error) return `${result.user_message} ${result.error.message} ${result.error.next_step}`;
  return result.user_message;
}

function failedResult(
  proposal: ProposalRecord,
  error: TypedExecutionError,
  before?: Record<string, any>,
  after?: Record<string, any>
): ProposalExecutionResult {
  return {
    status: 'failed',
    operation: proposal.operation,
    before,
    after,
    error,
    user_message: 'The Google Ads operation was not completed.',
    completed_at: new Date().toISOString(),
  };
}

export async function executeProposal(
  proposalId: string,
  options: ProposalExecutorOptions
): Promise<{ result: ProposalExecutionResult; message: string }> {
  let proposal: ProposalRecord;
  try {
    proposal = await claimProposalForExecution(
      options.conversationId,
      proposalId,
      options.revision,
      options.payloadHash
    );
  } catch (error) {
    const typed = typedError(error instanceof Error ? error : new Error(String(error)));
    return {
      result: {
        status: 'failed',
        operation: 'unknown',
        error: typed,
        user_message: 'This proposal could not be started.',
        completed_at: new Date().toISOString(),
      },
      message: `This proposal could not be started. ${typed.message} ${typed.next_step}`,
    };
  }

  const operation = getGoogleAdsOperation(proposal.operation);
  if (!operation || operation.risk !== 'write') {
    const result = failedResult(proposal, {
      type: 'invalid_argument',
      message: `Operation "${proposal.operation}" is not an executable write operation.`,
      next_step: 'Create a new proposal using a supported Google Ads write operation.',
    });
    await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
    return { result, message: resultMessage(result) };
  }

  const payload = proposal.payload;
  const schema = operation.parameterSchema;
  const required = schema.required || [];
  const invalid = required.find((key) => payload[key] === undefined || payload[key] === null);
  const invalidType = Object.entries(payload).find(([key, value]) => {
    if (key === 'campaignId') return false;
    const definition = schema.properties[key];
    if (!definition) return true;
    return definition.type === 'number'
      ? typeof value !== 'number' || !Number.isFinite(value)
      : typeof value !== definition.type;
  });
  if (invalid || invalidType) {
    const result = failedResult(proposal, {
      type: 'invalid_argument',
      message: invalid
        ? `Stored proposal is missing "${invalid}".`
        : `Stored proposal field "${invalidType?.[0]}" has the wrong type.`,
      next_step: 'Create a new proposal with valid values.',
    }, proposal.before_snapshot);
    await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
    return { result, message: resultMessage(result) };
  }

  const customerId = String(options.account.clientCustomerId || '').replace(/\D/g, '');
  const executionContext: ProposalExecutionContext = {
    customerId,
    accessToken: options.accessToken,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    loginCustomerId: options.account.loginCustomerId,
  };

  let before: Record<string, any> | undefined;
  try {
    if (
      proposal.proposal.actionType !== 'CREATE_CAMPAIGN' &&
      !proposal.before_snapshot.id &&
      !proposal.before_snapshot.status &&
      proposal.before_snapshot.budgetDaily === undefined
    ) {
      const result = failedResult(proposal, {
        type: 'invalid_argument',
        message: 'This proposal does not contain a complete before snapshot.',
        next_step: 'Create a new proposal from the current Google Ads campaign values.',
      }, proposal.before_snapshot);
      await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
      return { result, message: resultMessage(result) };
    }
    const campaignId = String(payload.campaignId || proposal.before_snapshot.campaignId || '');
    const current = campaignId
      ? await readCampaign(customerId, options.accessToken, options.account, campaignId)
      : await (async () => {
          const campaigns = await queryLiveCampaigns(
            customerId,
            options.accessToken,
            process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            options.account.loginCustomerId,
            { forceRefresh: true }
          );
          if (!campaigns.success) throw new Error(campaigns.error || 'Google Ads campaign read failed.');
          return campaigns.campaigns?.find((campaign: any) => campaign.name === payload.name);
        })();
    before = current || { exists: false };
    if (hasDrift(proposal.before_snapshot, current)) {
      const result = failedResult(proposal, {
        type: 'invalid_argument',
        message: 'The Google Ads entity changed after this proposal was created (drift).',
        next_step: 'Refresh the campaign and create a new proposal using its current values.',
      }, proposal.before_snapshot, before);
      await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
      return { result, message: resultMessage(result) };
    }
  } catch (error) {
    const typed = typedError(error instanceof Error ? error : new Error(String(error)));
    const result = failedResult(proposal, typed, proposal.before_snapshot);
    await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
    return { result, message: resultMessage(result) };
  }

  let writeResult: RegistryExecutionResult;
  try {
    writeResult = await operation.execute(payload, executionContext);
    if (!writeResult.success) throw writeResult;
  } catch (error) {
    const typed = typedError(error instanceof Error ? error : {
      message: String((error as RegistryExecutionResult)?.error || 'Google Ads execution failed.'),
    } as Error);
    const result = failedResult(proposal, typed, before);
    await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
    return { result, message: resultMessage(result) };
  }

  const realIds: Record<string, string> = {};
  const returnedId = String(writeResult.data?.campaignId || payload.campaignId || '');
  if (returnedId) realIds.campaignId = returnedId;

  try {
    let after: Record<string, any> | undefined;
    for (let attempt = 0; attempt < 3 && !after; attempt += 1) {
      after = returnedId
        ? await readCampaign(customerId, options.accessToken, options.account, returnedId)
        : undefined;
      if (!after && attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    if (!after || !operation.verifyExecution(payload, before || {}, after)) {
      const result: ProposalExecutionResult = {
        status: 'executed_unverified',
        operation: proposal.operation,
        real_ids: realIds,
        before,
        after,
        user_message: 'Google Ads accepted the write, but the read-back did not match the requested result.',
        completed_at: new Date().toISOString(),
      };
      await updateProposalStatus(options.conversationId, proposalId, 'executed_unverified', result);
      try {
        await invalidateAccountCache(
          options.conversationId,
          String(options.account.clientCustomerId || 'unknown')
        );
      } catch (stateError) {
        console.error('[AI Chat] Unverified Google Ads write could not invalidate account cache:', stateError);
      }
      return { result, message: resultMessage(result) };
    }
    const result: ProposalExecutionResult = {
      status: 'succeeded',
      operation: proposal.operation,
      real_ids: realIds,
      before,
      after,
      user_message: 'The Google Ads operation completed and was verified from the live account.',
      completed_at: new Date().toISOString(),
    };
    await updateProposalStatus(options.conversationId, proposalId, 'succeeded', result);
    if (realIds.campaignId && after) {
      try {
        await recordSuccessfulCampaignWrite(
          options.conversationId,
          String(options.account.clientCustomerId || 'unknown'),
          { id: realIds.campaignId, name: String(after.name || proposal.proposal.campaignName) },
          proposal.operation
        );
        if (proposal.operation === 'create_campaign') {
          await clearPendingCampaignCreation(
            options.conversationId,
            String(options.account.clientCustomerId || 'unknown')
          );
        }
      } catch (stateError) {
        console.error('[AI Chat] Google Ads succeeded but conversation state update failed:', stateError);
      }
    }
    return { result, message: resultMessage(result) };
  } catch (error) {
    const typed = typedError(error instanceof Error ? error : new Error(String(error)));
    const result = failedResult(proposal, typed, before);
    await updateProposalStatus(options.conversationId, proposalId, 'failed', result);
    return { result, message: resultMessage(result) };
  }
}
