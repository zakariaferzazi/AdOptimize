import { clearGoogleAdsCache } from '@/lib/google-ads-api';

/**
 * Generic Google Ads mutate gateway.
 *
 * Every write operation in the AI agent funnels through this single function so
 * that authentication headers, API version fallback, error extraction, cache
 * invalidation and `validateOnly` pre-flight behave identically everywhere.
 */

const GOOGLE_ADS_API_VERSIONS = ['v26', 'v25', 'v24', 'v23'];

export type MutateService =
  | 'campaigns'
  | 'campaignBudgets'
  | 'campaignCriteria'
  | 'campaignConversionGoals'
  | 'adGroups'
  | 'adGroupCriteria'
  | 'adGroupAds'
  | 'assets'
  | 'campaignAssets'
  | 'customerNegativeCriteria'
  | 'sharedSets'
  | 'campaignSharedSets'
  | 'biddingStrategies'
  | 'userLists'
  | 'assetGroups';

export interface MutateOperation {
  updateMask?: string;
  update?: Record<string, unknown>;
  create?: Record<string, unknown>;
  remove?: string;
}

export interface MutateContext {
  customerId: string;
  accessToken: string;
  developerToken?: string;
  loginCustomerId?: string;
}

export interface MutateResult {
  success: boolean;
  results?: Array<Record<string, unknown>>;
  error?: string;
  details?: string;
  statusCode?: number;
  isAuthExpired?: boolean;
  isQuotaExhausted?: boolean;
  retryDelaySeconds?: number;
  /** Structured Google Ads error so the model can correct the request. */
  googleAdsError?: GoogleAdsErrorDetail;
}

function buildHeaders(context: MutateContext): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json',
  };
  const developerToken = context.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (developerToken) headers['developer-token'] = developerToken;
  if (context.loginCustomerId) {
    headers['login-customer-id'] = context.loginCustomerId.replace(/\D/g, '');
  }
  return headers;
}

export interface GoogleAdsErrorDetail {
  /** Top-level message from Google Ads. */
  message: string;
  /** Google Ads error code, for example "FIELD_MASK_NOT_ALLOWED". */
  code?: string;
  /** Dotted field path that caused the failure, when Google reports one. */
  fieldPath?: string;
  /** Trigger value Google echoes back for the offending field. */
  trigger?: string;
  /** Every error code found in the response, in order. */
  codes: string[];
}

/**
 * Pull the actionable parts out of a Google Ads error response.
 *
 * Google returns errors as `error.details[].errors[]`, each with an `errorCode`
 * object whose single key is the code, plus `location.fieldPathElements` and
 * `trigger`. Surfacing those lets the model correct a request instead of
 * guessing why it failed.
 */
export function extractGoogleAdsErrorDetail(body: unknown): GoogleAdsErrorDetail | undefined {
  const payload = body as
    | {
        error?: {
          message?: string;
          details?: Array<{
            errors?: Array<{
              message?: string;
              errorCode?: Record<string, string>;
              location?: { fieldPathElements?: Array<{ fieldName?: string }> };
              trigger?: { stringValue?: string };
            }>;
          }>;
        };
      }
    | undefined;

  const details = payload?.error?.details;
  if (!Array.isArray(details)) return undefined;

  const codes: string[] = [];
  let first:
    | {
        message?: string;
        errorCode?: Record<string, string>;
        location?: { fieldPathElements?: Array<{ fieldName?: string }> };
        trigger?: { stringValue?: string };
      }
    | undefined;

  for (const detail of details) {
    for (const error of detail?.errors || []) {
      const code = error?.errorCode ? Object.keys(error.errorCode)[0] : undefined;
      if (code) codes.push(code);
      if (!first && (code || error?.message)) first = error;
    }
  }

  if (!first) return undefined;

  const fieldPath = (first.location?.fieldPathElements || [])
    .map((element) => element?.fieldName)
    .filter(Boolean)
    .join('.');

  return {
    message: first.message || payload?.error?.message || 'Google Ads rejected the request.',
    code: first.errorCode ? Object.keys(first.errorCode)[0] : undefined,
    fieldPath: fieldPath || undefined,
    trigger: first.trigger?.stringValue || undefined,
    codes,
  };
}

function extractError(
  body: unknown,
  status: number,
  rawText: string
): {
  error: string;
  details?: string;
  isAuthExpired?: boolean;
  isQuotaExhausted?: boolean;
  retryDelaySeconds?: number;
  googleAdsError?: GoogleAdsErrorDetail;
} {
  const payload = body as
    | { error?: { message?: string; status?: string; details?: unknown[] } }
    | undefined;
  const detail = extractGoogleAdsErrorDetail(body);
  const message =
    detail?.message ||
    payload?.error?.message ||
    (rawText ? rawText.slice(0, 400) : `Google Ads mutate failed with HTTP ${status}.`);
  const isAuthExpired = status === 401 || status === 403;
  const isQuotaExhausted =
    status === 429 ||
    /RESOURCE_EXHAUSTED|quota/i.test(message) ||
    payload?.error?.status === 'RESOURCE_EXHAUSTED';
  return {
    error: message,
    details: detail
      ? [detail.code, detail.fieldPath, detail.trigger].filter(Boolean).join(' | ')
      : payload?.error?.details
      ? JSON.stringify(payload.error.details).slice(0, 800)
      : undefined,
    isAuthExpired,
    isQuotaExhausted,
    retryDelaySeconds: isQuotaExhausted ? 60 : undefined,
    googleAdsError: detail,
  };
}

/**
 * Apply one or more mutate operations to a Google Ads service.
 *
 * `validateOnly` performs Google Ads' own validation without applying anything.
 * It is used as a pre-flight when a proposal is created and again immediately
 * before execution.
 */
export async function mutateGoogleAdsResources(
  service: MutateService,
  operations: MutateOperation[],
  context: MutateContext,
  options: { validateOnly?: boolean } = {}
): Promise<MutateResult> {
  const cleanCid = context.customerId.replace(/\D/g, '');
  if (cleanCid.length !== 10) {
    return { success: false, error: 'A valid 10-digit Google Ads customer ID is required.', statusCode: 400 };
  }
  if (!context.accessToken) {
    return { success: false, error: 'A Google Ads access token is required.', statusCode: 401 };
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    return { success: false, error: 'At least one mutate operation is required.', statusCode: 400 };
  }

  const headers = buildHeaders(context);
  const body = JSON.stringify({
    operations,
    ...(options.validateOnly ? { validateOnly: true } : {}),
  });

  let lastError: MutateResult = {
    success: false,
    error: 'Google Ads mutate request failed.',
  };

  for (const version of GOOGLE_ADS_API_VERSIONS) {
    try {
      const response = await fetch(
        `https://googleads.googleapis.com/${version}/customers/${cleanCid}/${service}:mutate`,
        { method: 'POST', headers, body, cache: 'no-store' }
      );

      const rawText = await response.text();
      let parsed: unknown;
      try {
        parsed = rawText ? JSON.parse(rawText) : undefined;
      } catch {
        parsed = undefined;
      }

      if (response.ok) {
        if (!options.validateOnly) clearGoogleAdsCache(cleanCid);
        const results = (parsed as { results?: Array<Record<string, unknown>> } | undefined)?.results;
        return { success: true, results: results || [], statusCode: response.status };
      }

      // A 404 usually means this API version is retired; try the next one.
      if (response.status === 404) {
        lastError = { success: false, error: `Google Ads API ${version} is unavailable.`, statusCode: 404 };
        continue;
      }

      const extracted = extractError(parsed, response.status, rawText);
      return { success: false, statusCode: response.status, ...extracted };
    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : 'Google Ads mutate request failed.',
      };
    }
  }

  return lastError;
}

/** Convenience wrapper for a single update operation. */
export async function mutateGoogleAdsUpdate(
  service: MutateService,
  resourceName: string,
  updateMask: string,
  update: Record<string, unknown>,
  context: MutateContext,
  options: { validateOnly?: boolean } = {}
): Promise<MutateResult> {
  return mutateGoogleAdsResources(
    service,
    [{ updateMask, update: { resourceName, ...update } }],
    context,
    options
  );
}

/**
 * Combined mutate across several services in one atomic request.
 *
 * Campaign creation needs a budget and a campaign created together, which the
 * per-service endpoints cannot do. This uses `googleAds:mutate` with
 * `mutateOperations`.
 */
export async function mutateGoogleAdsCombined(
  mutateOperations: Array<Record<string, unknown>>,
  context: MutateContext,
  options: { validateOnly?: boolean } = {}
): Promise<MutateResult & { responses?: Array<Record<string, unknown>> }> {
  const cleanCid = context.customerId.replace(/\D/g, '');
  if (cleanCid.length !== 10) {
    return { success: false, error: 'A valid 10-digit Google Ads customer ID is required.', statusCode: 400 };
  }
  if (!context.accessToken) {
    return { success: false, error: 'A Google Ads access token is required.', statusCode: 401 };
  }
  if (!Array.isArray(mutateOperations) || mutateOperations.length === 0) {
    return { success: false, error: 'At least one mutate operation is required.', statusCode: 400 };
  }

  const headers = buildHeaders(context);
  const body = JSON.stringify({
    mutateOperations,
    ...(options.validateOnly ? { validateOnly: true } : {}),
  });

  let lastError: MutateResult = { success: false, error: 'Google Ads mutate request failed.' };

  for (const version of GOOGLE_ADS_API_VERSIONS) {
    try {
      const response = await fetch(
        `https://googleads.googleapis.com/${version}/customers/${cleanCid}/googleAds:mutate`,
        { method: 'POST', headers, body, cache: 'no-store' }
      );

      const rawText = await response.text();
      let parsed: unknown;
      try {
        parsed = rawText ? JSON.parse(rawText) : undefined;
      } catch {
        parsed = undefined;
      }

      if (response.ok) {
        if (!options.validateOnly) clearGoogleAdsCache(cleanCid);
        const responses =
          (parsed as { mutateOperationResponses?: Array<Record<string, unknown>> } | undefined)
            ?.mutateOperationResponses || [];
        return { success: true, responses, statusCode: response.status };
      }

      if (response.status === 404) {
        lastError = { success: false, error: `Google Ads API ${version} is unavailable.`, statusCode: 404 };
        continue;
      }

      const extracted = extractError(parsed, response.status, rawText);
      return { success: false, statusCode: response.status, ...extracted };
    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : 'Google Ads mutate request failed.',
      };
    }
  }

  return lastError;
}
