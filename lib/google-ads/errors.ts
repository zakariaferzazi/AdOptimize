/**
 * Structured Google Ads error extraction shared by the query and mutate layers.
 *
 * Google returns errors as `error.details[].errors[]`, each with an `errorCode`
 * object whose single key is the error family and whose value is the code,
 * plus `location.fieldPathElements` and `trigger`. Surfacing those lets the
 * agent correct a request instead of guessing why it failed.
 */

export interface GoogleAdsErrorItem {
  /** Error family, for example "fieldError" or "campaignBudgetError". */
  family?: string;
  /** Error code within the family, for example "REQUIRED". */
  code?: string;
  message?: string;
  fieldPath?: string;
  trigger?: string;
  /** Index of the operation that failed in a multi-operation request. */
  operationIndex?: number;
}

export interface GoogleAdsErrorDetail {
  /** Top-level message from Google Ads. */
  message: string;
  /** First error code, for example "FIELD_MASK_NOT_ALLOWED". */
  code?: string;
  /** Dotted field path of the first error. */
  fieldPath?: string;
  /** Trigger value Google echoes back for the first offending field. */
  trigger?: string;
  /** Every error code found in the response, in order. */
  codes: string[];
  /** Every error, capped, for multi-operation diagnosis. */
  errors?: GoogleAdsErrorItem[];
  /** Google request id, useful for support escalation. */
  requestId?: string;
}

interface RawGoogleAdsError {
  message?: string;
  errorCode?: Record<string, string>;
  location?: { fieldPathElements?: Array<{ fieldName?: string; index?: number }> };
  trigger?: { stringValue?: string; int64Value?: string; doubleValue?: number };
}

export function extractGoogleAdsErrorDetail(body: unknown): GoogleAdsErrorDetail | undefined {
  const root = Array.isArray(body) ? body[0] : body;
  const payload = root as
    | {
        error?: {
          message?: string;
          details?: Array<{ errors?: RawGoogleAdsError[]; requestId?: string }>;
        };
      }
    | undefined;

  const details = payload?.error?.details;
  if (!Array.isArray(details)) return undefined;

  const items: GoogleAdsErrorItem[] = [];
  let requestId: string | undefined;

  for (const detail of details) {
    if (detail?.requestId) requestId = detail.requestId;
    for (const error of detail?.errors || []) {
      const family = error?.errorCode ? Object.keys(error.errorCode)[0] : undefined;
      const code = family ? error.errorCode?.[family] : undefined;
      const elements = error?.location?.fieldPathElements || [];
      const operationElement = elements.find(
        (element) => element?.fieldName === 'operations' || element?.fieldName === 'mutate_operations'
      );
      const fieldPath = elements
        .map((element) =>
          element?.fieldName
            ? `${element.fieldName}${typeof element.index === 'number' ? `[${element.index}]` : ''}`
            : ''
        )
        .filter(Boolean)
        .join('.');
      const trigger =
        error?.trigger?.stringValue ??
        error?.trigger?.int64Value ??
        (error?.trigger?.doubleValue !== undefined ? String(error.trigger.doubleValue) : undefined);
      items.push({
        family,
        code,
        message: error?.message,
        fieldPath: fieldPath || undefined,
        trigger: trigger || undefined,
        operationIndex: typeof operationElement?.index === 'number' ? operationElement.index : undefined,
      });
    }
  }

  if (!items.length) return undefined;
  const first = items[0];

  return {
    message: first.message || payload?.error?.message || 'Google Ads rejected the request.',
    code: first.code,
    fieldPath: first.fieldPath,
    trigger: first.trigger,
    codes: items.map((item) => item.code).filter((code): code is string => Boolean(code)),
    errors: items.slice(0, 10),
    requestId,
  };
}

export interface GoogleAdsFailureInfo {
  error: string;
  statusCode: number;
  isAuthExpired: boolean;
  isQuotaExhausted: boolean;
  retryDelaySeconds?: number;
  googleAdsError?: GoogleAdsErrorDetail;
}

/** Normalise a non-OK Google Ads HTTP response into a failure description. */
export function describeGoogleAdsFailure(
  body: unknown,
  status: number,
  rawText: string
): GoogleAdsFailureInfo {
  const root = (Array.isArray(body) ? body[0] : body) as
    | { error?: { message?: string; status?: string } }
    | undefined;
  const detail = extractGoogleAdsErrorDetail(body);
  const message =
    detail?.message ||
    root?.error?.message ||
    (rawText ? rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300) : '') ||
    `Google Ads request failed with HTTP ${status}.`;
  const isQuotaExhausted =
    status === 429 ||
    root?.error?.status === 'RESOURCE_EXHAUSTED' ||
    /RESOURCE_EXHAUSTED|RESOURCE_TEMPORARILY_EXHAUSTED/i.test(rawText || '');
  const isAuthExpired =
    status === 401 || root?.error?.status === 'UNAUTHENTICATED' || /UNAUTHENTICATED/.test(rawText || '');

  let retryDelaySeconds: number | undefined;
  if (isQuotaExhausted) {
    const match = /retryDelay"?\s*:\s*"(\d+)s"/i.exec(rawText || '');
    retryDelaySeconds = match ? Math.min(Number(match[1]), 3600) : 60;
  }

  return {
    error: message,
    statusCode: status,
    isAuthExpired,
    isQuotaExhausted,
    retryDelaySeconds,
    googleAdsError: detail,
  };
}
