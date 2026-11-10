/**
 * Structured tool errors.
 *
 * The agent receives these instead of raw Google Ads or internal errors, so it
 * can explain the situation naturally and never invent success.
 */

export type ToolErrorCode =
  | 'not_found'
  | 'ambiguous'
  | 'invalid_argument'
  | 'unsupported'
  | 'permission'
  | 'quota'
  | 'timeout'
  | 'conflict'
  | 'proposal_required'
  | 'internal';

export interface ToolErrorPayload {
  code: ToolErrorCode;
  message: string;
  next_step: string;
  candidates?: Array<{ id: string; name: string }>;
  /** Google Ads error code, for example FIELD_MASK_NOT_ALLOWED. */
  google_ads_code?: string;
  /** Dotted field path that caused the failure. */
  field_path?: string;
  /** Value Google Ads echoed back for the offending field. */
  trigger?: string;
  /** Every Google Ads error code in the response. */
  google_ads_codes?: string[];
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
  candidates?: Array<{ id: string; name: string }>
): ToolError {
  return new ToolError({ code, message, next_step: nextStep, ...(candidates ? { candidates } : {}) });
}

export function notFound(what: string): ToolError {
  return toolError(
    'not_found',
    `${what} was not found in the connected Google Ads account.`,
    'Refresh the account data and confirm the exact name or ID.'
  );
}

export function ambiguous(
  what: string,
  candidates: Array<{ id: string; name: string }>
): ToolError {
  return toolError(
    'ambiguous',
    `More than one ${what} matches that description.`,
    'Ask the user which one they mean, listing the candidates.',
    candidates
  );
}

export function invalidArgument(message: string): ToolError {
  return toolError('invalid_argument', message, 'Correct the value and try again.');
}

export function unsupported(message: string): ToolError {
  return toolError(
    'unsupported',
    message,
    'Explain that this action is not available yet and offer a supported alternative.'
  );
}

export function permissionDenied(message: string): ToolError {
  return toolError(
    'permission',
    message,
    'Ask the user to reconnect the Google Ads account or grant the required access.'
  );
}

export function quotaExhausted(message: string): ToolError {
  return toolError(
    'quota',
    message,
    'Explain that Google Ads is rate limiting requests and suggest retrying shortly.'
  );
}

export function proposalRequired(proposalId: string, summary: string): ToolError {
  return toolError(
    'proposal_required',
    `A proposal was prepared: ${summary}`,
    `Tell the user to review and approve proposal ${proposalId}. Do not claim the change was applied.`
  );
}

/** Map a Google Ads API failure onto a structured tool error. */
export function fromGoogleAdsFailure(result: {
  error?: string;
  statusCode?: number;
  isAuthExpired?: boolean;
  isQuotaExhausted?: boolean;
  googleAdsError?: {
    message: string;
    code?: string;
    fieldPath?: string;
    trigger?: string;
    codes: string[];
  };
}): ToolError {
  const message = result.error || 'Google Ads rejected the request.';
  const detail = result.googleAdsError;

  let base: ToolError;
  if (result.isQuotaExhausted || result.statusCode === 429) base = quotaExhausted(message);
  else if (result.isAuthExpired || result.statusCode === 401 || result.statusCode === 403) {
    base = permissionDenied(message);
  } else if (result.statusCode === 404) base = notFound('The requested Google Ads resource');
  else if (result.statusCode === 400) base = invalidArgument(message);
  else base = toolError('internal', message, 'Explain the failure and suggest retrying.');

  if (!detail) return base;

  // Attach the machine-readable parts so the model can correct the request
  // instead of guessing why Google Ads rejected it.
  return new ToolError({
    ...base.payload,
    google_ads_code: detail.code,
    field_path: detail.fieldPath,
    trigger: detail.trigger,
    google_ads_codes: detail.codes.length ? detail.codes : undefined,
  });
}
