import { clearGoogleAdsCache } from '@/lib/google-ads-api';
import {
  describeGoogleAdsFailure,
  extractGoogleAdsErrorDetail,
  type GoogleAdsErrorDetail,
} from './errors';
import {
  GOOGLE_ADS_API_VERSIONS,
  GoogleAdsRequestError,
  cleanId,
  fetchWithTimeout,
  googleAdsHeaders,
  invalidateGaqlCache,
  type GoogleAdsRequestStats,
} from './gaql';

/**
 * Generic Google Ads mutate gateway.
 *
 * Every write funnels through these functions so that authentication headers,
 * API version fallback, structured error extraction, cache invalidation,
 * timeouts and `validateOnly` pre-flight behave identically everywhere.
 */

export { extractGoogleAdsErrorDetail };
export type { GoogleAdsErrorDetail };

export type MutateService =
  | 'campaigns'
  | 'campaignBudgets'
  | 'campaignCriteria'
  | 'campaignConversionGoals'
  | 'conversionGoalCampaignConfigs'
  | 'customConversionGoals'
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
  stats?: GoogleAdsRequestStats;
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

const MUTATE_TIMEOUT_MS = 25_000;

function precheck(context: MutateContext, count: number): MutateResult | undefined {
  if (cleanId(context.customerId).length !== 10) {
    return { success: false, error: 'A valid 10-digit Google Ads customer ID is required.', statusCode: 400 };
  }
  if (!context.accessToken) {
    return { success: false, error: 'A Google Ads access token is required.', statusCode: 401, isAuthExpired: true };
  }
  if (count === 0) {
    return { success: false, error: 'At least one mutate operation is required.', statusCode: 400 };
  }
  return undefined;
}

async function postMutate(
  path: string,
  body: Record<string, unknown>,
  context: MutateContext,
  validateOnly: boolean
): Promise<{ ok: true; parsed: Record<string, unknown> } | { ok: false; result: MutateResult }> {
  const cid = cleanId(context.customerId);
  const headers = googleAdsHeaders(context);
  const payload = JSON.stringify({ ...body, ...(validateOnly ? { validateOnly: true } : {}) });
  let lastError: MutateResult = { success: false, error: 'Google Ads mutate request failed.' };

  for (const version of GOOGLE_ADS_API_VERSIONS) {
    if (context.stats) {
      context.stats.requests += 1;
      context.stats.mutates += 1;
    }
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `https://googleads.googleapis.com/${version}/customers/${cid}/${path}`,
        { method: 'POST', headers, body: payload },
        MUTATE_TIMEOUT_MS
      );
    } catch (error) {
      const info = error instanceof GoogleAdsRequestError ? error.info : undefined;
      return {
        ok: false,
        result: {
          success: false,
          error: info?.error || (error instanceof Error ? error.message : 'Google Ads mutate request failed.'),
          statusCode: info?.statusCode || 503,
        },
      };
    }

    const rawText = await response.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = undefined;
    }

    if (response.ok) {
      if (!validateOnly) {
        clearGoogleAdsCache(cid);
        invalidateGaqlCache(cid);
      }
      return { ok: true, parsed: (parsed as Record<string, unknown>) || {} };
    }

    const info = describeGoogleAdsFailure(parsed, response.status, rawText);
    if (response.status === 404 && !info.googleAdsError) {
      lastError = { success: false, error: `Google Ads API ${version} is unavailable.`, statusCode: 404 };
      continue;
    }

    const detail = info.googleAdsError;
    return {
      ok: false,
      result: {
        success: false,
        statusCode: response.status,
        error: info.error,
        details: detail ? [detail.code, detail.fieldPath, detail.trigger].filter(Boolean).join(' | ') : undefined,
        isAuthExpired: info.isAuthExpired,
        isQuotaExhausted: info.isQuotaExhausted,
        retryDelaySeconds: info.retryDelaySeconds,
        googleAdsError: detail,
      },
    };
  }

  return { ok: false, result: lastError };
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
  const invalid = precheck(context, Array.isArray(operations) ? operations.length : 0);
  if (invalid) return invalid;

  const outcome = await postMutate(`${service}:mutate`, { operations }, context, Boolean(options.validateOnly));
  if (!outcome.ok) return outcome.result;
  const results = (outcome.parsed as { results?: Array<Record<string, unknown>> }).results;
  return { success: true, results: results || [], statusCode: 200 };
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
 * Combined mutate across several services in one atomic request
 * (`googleAds:mutate` with `mutateOperations`). Used for creates that need
 * temporary resource IDs, such as a budget, campaign and ad group together.
 */
export async function mutateGoogleAdsCombined(
  mutateOperations: Array<Record<string, unknown>>,
  context: MutateContext,
  options: { validateOnly?: boolean } = {}
): Promise<MutateResult & { responses?: Array<Record<string, unknown>> }> {
  const invalid = precheck(context, Array.isArray(mutateOperations) ? mutateOperations.length : 0);
  if (invalid) return invalid;

  const outcome = await postMutate('googleAds:mutate', { mutateOperations }, context, Boolean(options.validateOnly));
  if (!outcome.ok) return outcome.result;
  const responses =
    (outcome.parsed as { mutateOperationResponses?: Array<Record<string, unknown>> })
      .mutateOperationResponses || [];
  return { success: true, responses, statusCode: 200 };
}
