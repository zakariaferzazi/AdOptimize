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
}): ToolError {
  const message = result.error || 'Google Ads rejected the request.';
  if (result.isQuotaExhausted || result.statusCode === 429) return quotaExhausted(message);
  if (result.isAuthExpired || result.statusCode === 401 || result.statusCode === 403) {
    return permissionDenied(message);
  }
  if (result.statusCode === 404) return notFound('The requested Google Ads resource');
  if (result.statusCode === 400) return invalidArgument(message);
  return toolError('internal', message, 'Explain the failure and suggest retrying.');
}
