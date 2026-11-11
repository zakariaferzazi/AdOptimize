/**
 * Structured tool errors.
 *
 * The agent receives these instead of raw Google Ads or internal errors, so it
 * can reason about the failure (what was rejected, why, whether retrying could
 * help) and explain it naturally without ever inventing success.
 */

import type { GoogleAdsErrorDetail } from '@/lib/google-ads/errors';
import { GoogleAdsRequestError } from '@/lib/google-ads/gaql';

export type ToolErrorCode =
  | 'not_found'
  | 'ambiguous'
  | 'invalid_argument'
  | 'unsupported'
  | 'permission'
  | 'missing_configuration'
  | 'stale_data'
  | 'api_restriction'
  | 'policy'
  | 'quota'
  | 'timeout'
  | 'transient'
  | 'conflict'
  | 'repeated_call'
  | 'limit_reached'
  | 'proposal_required'
  | 'internal';

export interface ToolErrorPayload {
  code: ToolErrorCode;
  message: string;
  next_step: string;
  /** True when retrying the same request later could succeed. */
  retryable?: boolean;
  candidates?: Array<{ id: string; name: string; [key: string]: unknown }>;
  /** Google Ads error code, for example FIELD_MASK_NOT_ALLOWED. */
  google_ads_code?: string;
  /** Google Ads error family, for example fieldError. */
  google_ads_error_type?: string;
  /** Dotted field path that caused the failure. */
  field_path?: string;
  /** Value Google Ads echoed back for the offending field. */
  trigger?: string;
  /** Every Google Ads error code in the response. */
  google_ads_codes?: string[];
  /** Index of the rejected operation in a multi-operation request. */
  operation_index?: number;
  /** Seconds to wait before retrying, when Google Ads reports one. */
  retry_after_seconds?: number;
}

export class ToolError extends Error {
  readonly payload: ToolErrorPayload;
  constructor(payload: ToolErrorPayload) {
    super(payload.message);
    this.name = 'ToolError';
    this.payload = payload;
  }
}

export function toolError(
  code: ToolErrorCode,
  message: string,
  nextStep: string,
  candidates?: ToolErrorPayload['candidates']
): ToolError {
  return new ToolError({ code, message, next_step: nextStep, ...(candidates ? { candidates } : {}) });
}

export function notFound(what: string, candidates?: ToolErrorPayload['candidates']): ToolError {
  return toolError(
    'not_found',
    `${what} was not found in the connected Google Ads account.`,
    candidates?.length
      ? 'Check whether one of the candidates is what the user meant; ask if it is not obvious.'
      : 'List the relevant resources to find the correct ID, or ask the user to clarify.',
    candidates
  );
}

export function ambiguous(what: string, candidates: NonNullable<ToolErrorPayload['candidates']>): ToolError {
  return toolError(
    'ambiguous',
    `More than one ${what} matches that description.`,
    'Ask the user which one they mean, naming the candidates.',
    candidates
  );
}

export function invalidArgument(message: string): ToolError {
  return new ToolError({
    code: 'invalid_argument',
    message,
    next_step: 'Correct the value. Ask the user only if the correct value cannot be inferred.',
    retryable: false,
  });
}

export function unsupported(message: string, alternative?: string): ToolError {
  return new ToolError({
    code: 'unsupported',
    message,
    next_step: alternative
      ? `Explain the limitation precisely and offer this alternative: ${alternative}`
      : 'Explain precisely what is not possible and offer the closest supported alternative.',
    retryable: false,
  });
}

export function permissionDenied(message: string): ToolError {
  return new ToolError({
    code: 'permission',
    message,
    next_step: 'Ask the user to reconnect Google Ads or grant the required access level.',
    retryable: false,
  });
}

export function quotaExhausted(message: string, retryAfterSeconds?: number): ToolError {
  return new ToolError({
    code: 'quota',
    message,
    next_step: 'Google Ads is rate limiting requests. Do not retry now; tell the user to try again shortly.',
    retryable: true,
    ...(retryAfterSeconds ? { retry_after_seconds: retryAfterSeconds } : {}),
  });
}

export function proposalRequired(proposalId: string, summary: string): ToolError {
  return toolError(
    'proposal_required',
    `A proposal was prepared: ${summary}`,
    `Tell the user to review and approve proposal ${proposalId}. Do not claim the change was applied.`
  );
}

const PERMISSION_CODES = new Set([
  'USER_PERMISSION_DENIED',
  'CUSTOMER_NOT_ENABLED',
  'NOT_ADS_USER',
  'OAUTH_TOKEN_EXPIRED',
  'OAUTH_TOKEN_INVALID',
  'OAUTH_TOKEN_REVOKED',
  'AUTHENTICATION_ERROR',
  'CUSTOMER_NOT_FOUND',
  'MISSING_LOGIN_CUSTOMER_ID',
  'INVALID_LOGIN_CUSTOMER_ID',
]);

const API_RESTRICTION_CODES = new Set([
  'DEVELOPER_TOKEN_NOT_APPROVED',
  'DEVELOPER_TOKEN_PROHIBITED',
  'OPERATION_NOT_PERMITTED_FOR_CONTEXT',
  'OPERATION_NOT_PERMITTED_FOR_CAMPAIGN_TYPE',
  'OPERATION_NOT_PERMITTED_FOR_REMOVED_RESOURCE',
  'MUTATE_NOT_ALLOWED',
  'NOT_ALLOWLISTED',
  'NOT_ALLOWED',
  'CANNOT_MODIFY_FOR_CAMPAIGN_TYPE',
  'INCOMPATIBLE_CAMPAIGN_FIELD',
  'INCOMPATIBLE_WITH_RESTRICTION',
  'OPERATION_NOT_SUPPORTED',
  'ADVERTISING_CHANNEL_TYPE_NOT_SUPPORTED',
  'CANNOT_SET_DATE_TO_PAST',
  'BIDDING_STRATEGY_NOT_SUPPORTED_WITH_AD_SCHEDULE',
  'BIDDING_STRATEGY_TYPE_INCOMPATIBLE_WITH_SHARED_BUDGET',
  'STRATEGY_NOT_SUPPORTED_FOR_CHANNEL_TYPE',
  'BIDDING_STRATEGY_NOT_SUPPORTED',
  'INVALID_BIDDING_STRATEGY_TYPE',
]);

const STALE_CODES = new Set([
  'RESOURCE_NOT_FOUND',
  'INVALID_RESOURCE_NAME',
  'CAMPAIGN_NOT_FOUND',
  'AD_GROUP_NOT_FOUND',
  'CRITERION_NOT_FOUND',
  'RESOURCE_ALREADY_REMOVED',
  'OPERATION_NOT_PERMITTED_FOR_REMOVED_RESOURCE',
]);

const TRANSIENT_CODES = new Set([
  'CONCURRENT_MODIFICATION',
  'INTERNAL_ERROR',
  'TRANSIENT_ERROR',
  'DEADLINE_EXCEEDED',
  'RESOURCE_TEMPORARILY_EXHAUSTED',
]);

const MISSING_CONFIG_CODES = new Set([
  'CONVERSION_TRACKING_NOT_ENABLED',
  'CUSTOMER_NOT_ACTIVE',
  'BILLING_SETUP_REQUIRED',
  'MISSING_BILLING',
  'NO_CONVERSION_ACTIONS',
  'CANNOT_USE_CONVERSION_ACTIONS_FROM_OTHER_CUSTOMER',
]);

function classifyGoogleAdsDetail(
  detail: GoogleAdsErrorDetail | undefined,
  status: number | undefined
): { code: ToolErrorCode; nextStep: string; retryable: boolean } | undefined {
  const codes = detail?.codes || [];
  const families = (detail?.errors || []).map((item) => (item.family || '').toLowerCase());

  if (codes.some((code) => PERMISSION_CODES.has(code)) || families.some((f) => f.startsWith('authorization') || f.startsWith('authentication'))) {
    return {
      code: 'permission',
      nextStep: 'The connected Google login lacks access for this action. Ask the user to reconnect or grant access.',
      retryable: false,
    };
  }
  if (codes.some((code) => MISSING_CONFIG_CODES.has(code))) {
    return {
      code: 'missing_configuration',
      nextStep: 'Explain which account setup is missing and how the user can complete it in Google Ads.',
      retryable: false,
    };
  }
  if (families.some((f) => f.startsWith('policy')) || codes.some((code) => /POLICY|DISAPPROVED|PROHIBITED_TEXT/.test(code))) {
    return {
      code: 'policy',
      nextStep: 'Explain the policy issue and propose compliant wording or settings.',
      retryable: false,
    };
  }
  if (codes.some((code) => STALE_CODES.has(code))) {
    return {
      code: 'stale_data',
      nextStep: 'The resource no longer exists or changed. Re-read current data before trying again.',
      retryable: false,
    };
  }
  if (codes.some((code) => TRANSIENT_CODES.has(code)) || (status !== undefined && status >= 500)) {
    return {
      code: 'transient',
      nextStep: 'This was a temporary Google Ads failure. One later retry is reasonable; do not loop.',
      retryable: true,
    };
  }
  if (codes.some((code) => API_RESTRICTION_CODES.has(code))) {
    return {
      code: 'api_restriction',
      nextStep:
        'Google Ads does not allow this combination. Explain the restriction and look for a supported alternative (different setting, bidding strategy or level).',
      retryable: false,
    };
  }
  if (detail || status === 400) {
    return {
      code: 'invalid_argument',
      nextStep:
        'Read field_path and google_ads_code, correct the specific value and try once more. If the fix needs user input, ask for it.',
      retryable: false,
    };
  }
  return undefined;
}

export interface GoogleAdsFailureLike {
  error?: string;
  statusCode?: number;
  isAuthExpired?: boolean;
  isQuotaExhausted?: boolean;
  retryDelaySeconds?: number;
  googleAdsError?: GoogleAdsErrorDetail;
}

/** Map a Google Ads API failure onto a structured, classified tool error. */
export function fromGoogleAdsFailure(result: GoogleAdsFailureLike): ToolError {
  const message = result.error || 'Google Ads rejected the request.';
  const detail = result.googleAdsError;

  let base: ToolError;
  if (result.isQuotaExhausted || result.statusCode === 429) {
    base = quotaExhausted(message, result.retryDelaySeconds);
  } else if (result.isAuthExpired || result.statusCode === 401) {
    base = permissionDenied('Google Ads access has expired or was revoked.');
  } else if (result.statusCode === 504) {
    base = new ToolError({
      code: 'timeout',
      message,
      next_step: 'Google Ads was slow to respond. Narrow the request or try again shortly.',
      retryable: true,
    });
  } else {
    const classified = classifyGoogleAdsDetail(detail, result.statusCode);
    if (classified) {
      base = new ToolError({ code: classified.code, message, next_step: classified.nextStep, retryable: classified.retryable });
    } else if (result.statusCode === 403) {
      base = permissionDenied(message);
    } else if (result.statusCode === 404) {
      base = notFound('The requested Google Ads resource');
    } else {
      base = new ToolError({
        code: 'transient',
        message,
        next_step: 'Explain that Google Ads could not complete the request and suggest retrying shortly.',
        retryable: true,
      });
    }
  }

  if (!detail) return base;

  const first = detail.errors?.[0];
  return new ToolError({
    ...base.payload,
    google_ads_code: detail.code,
    google_ads_error_type: first?.family,
    field_path: detail.fieldPath,
    trigger: detail.trigger,
    google_ads_codes: detail.codes.length > 1 ? detail.codes : undefined,
    operation_index: first?.operationIndex,
  });
}

/** Convert any thrown value into a structured tool error payload. */
export function toToolErrorPayload(error: unknown): ToolErrorPayload {
  if (error instanceof ToolError) return error.payload;
  if (error instanceof GoogleAdsRequestError) return fromGoogleAdsFailure(error.info).payload;
  return {
    code: 'internal',
    message: 'An internal error interrupted this step.',
    next_step: 'Tell the user this step failed without changing anything and offer to try again.',
    retryable: true,
  };
}
