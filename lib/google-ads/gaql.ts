import { describeGoogleAdsFailure, type GoogleAdsFailureInfo } from './errors';

/**
 * Single Google Ads query gateway for the AI agent.
 *
 * Every read the agent performs goes through `runGaql`, so API version
 * fallback, authentication headers, timeouts, structured errors, request
 * accounting and short-lived caching behave identically everywhere.
 */

export const GOOGLE_ADS_API_VERSIONS = ['v26', 'v25', 'v24', 'v23'];

export interface GoogleAdsRequestStats {
  /** Live Google Ads HTTP requests (queries and mutates). */
  requests: number;
  /** Queries answered from the short-lived cache. */
  cacheHits: number;
  mutates: number;
}

export interface GoogleAdsContext {
  customerId: string;
  accessToken: string;
  developerToken?: string;
  loginCustomerId?: string;
  currency: string;
  accountName: string;
  timeZone?: string;
  /** Mutable per-request counters, so usage is observable. */
  stats?: GoogleAdsRequestStats;
}

export function newRequestStats(): GoogleAdsRequestStats {
  return { requests: 0, cacheHits: 0, mutates: 0 };
}

export class GoogleAdsRequestError extends Error {
  readonly info: GoogleAdsFailureInfo;
  constructor(info: GoogleAdsFailureInfo) {
    super(info.error);
    this.name = 'GoogleAdsRequestError';
    this.info = info;
  }
}

export function cleanId(value: unknown): string {
  return String(value ?? '').replace(/^camp-live-/, '').replace(/\D/g, '');
}

export function googleAdsHeaders(context: Pick<GoogleAdsContext, 'accessToken' | 'developerToken' | 'loginCustomerId'>) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json',
  };
  const developerToken = context.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (developerToken) headers['developer-token'] = developerToken;
  if (context.loginCustomerId) headers['login-customer-id'] = cleanId(context.loginCustomerId);
  return headers;
}

/** Fetch with an abort-based timeout so one slow call cannot stall a turn. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GoogleAdsRequestError({
        error: `Google Ads did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
        statusCode: 504,
        isAuthExpired: false,
        isQuotaExhausted: false,
      });
    }
    throw new GoogleAdsRequestError({
      error: error instanceof Error ? error.message : 'Google Ads could not be reached.',
      statusCode: 503,
      isAuthExpired: false,
      isQuotaExhausted: false,
    });
  } finally {
    clearTimeout(timer);
  }
}

interface CacheEntry {
  rows: Array<Record<string, any>>;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 200;
export const DEFAULT_QUERY_TTL_MS = 60_000;
const QUERY_TIMEOUT_MS = 20_000;

function tokenFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(context: GoogleAdsContext, query: string): string {
  return [
    cleanId(context.customerId),
    cleanId(context.loginCustomerId) || '-',
    tokenFingerprint(`${context.developerToken || ''}:${context.accessToken}`),
    query.replace(/\s+/g, ' ').trim(),
  ].join('|');
}

/** Drop cached reads for a customer after anything changes in the account. */
export function invalidateGaqlCache(customerId?: string): void {
  if (!customerId) {
    queryCache.clear();
    return;
  }
  const prefix = `${cleanId(customerId)}|`;
  for (const key of Array.from(queryCache.keys())) {
    if (key.startsWith(prefix)) queryCache.delete(key);
  }
}

export interface RunGaqlOptions {
  /** Cache lifetime. 0 forces a live read (used for drift and verification). */
  cacheTtlMs?: number;
  timeoutMs?: number;
}

/**
 * Run a GAQL query and return the flattened result rows (camelCase JSON as
 * returned by the REST API). Throws `GoogleAdsRequestError` with structured
 * details on failure.
 */
export async function runGaql(
  context: GoogleAdsContext,
  query: string,
  options: RunGaqlOptions = {}
): Promise<Array<Record<string, any>>> {
  const cid = cleanId(context.customerId);
  if (cid.length !== 10) {
    throw new GoogleAdsRequestError({
      error: 'A valid 10-digit Google Ads customer ID is required.',
      statusCode: 400,
      isAuthExpired: false,
      isQuotaExhausted: false,
    });
  }
  if (!context.accessToken) {
    throw new GoogleAdsRequestError({
      error: 'Google Ads access is not available. Reconnect the account.',
      statusCode: 401,
      isAuthExpired: true,
      isQuotaExhausted: false,
    });
  }

  const ttl = options.cacheTtlMs ?? DEFAULT_QUERY_TTL_MS;
  const key = cacheKey(context, query);
  if (ttl > 0) {
    const cached = queryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      if (context.stats) context.stats.cacheHits += 1;
      return cached.rows;
    }
  }

  const headers = googleAdsHeaders(context);
  const body = JSON.stringify({ query: query.replace(/\s+/g, ' ').trim() });
  let lastInfo: GoogleAdsFailureInfo | undefined;

  for (const version of GOOGLE_ADS_API_VERSIONS) {
    if (context.stats) context.stats.requests += 1;
    const response = await fetchWithTimeout(
      `https://googleads.googleapis.com/${version}/customers/${cid}/googleAds:searchStream`,
      { method: 'POST', headers, body },
      options.timeoutMs ?? QUERY_TIMEOUT_MS
    );
    const rawText = await response.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : [];
    } catch {
      parsed = undefined;
    }

    if (response.ok && parsed !== undefined) {
      const batches = Array.isArray(parsed) ? parsed : [parsed];
      const rows: Array<Record<string, any>> = [];
      for (const batch of batches) {
        for (const row of (batch as { results?: Array<Record<string, any>> })?.results || []) {
          rows.push(row);
        }
      }
      if (ttl > 0) {
        if (queryCache.size >= MAX_CACHE_ENTRIES) {
          const oldest = queryCache.keys().next().value;
          if (oldest) queryCache.delete(oldest);
        }
        queryCache.set(key, { rows, expiresAt: Date.now() + ttl });
      }
      return rows;
    }

    // A 404 without a Google Ads error body means this API version is retired.
    const info = describeGoogleAdsFailure(parsed, response.status, rawText);
    if (response.status === 404 && !info.googleAdsError) {
      lastInfo = info;
      continue;
    }
    throw new GoogleAdsRequestError(info);
  }

  throw new GoogleAdsRequestError(
    lastInfo || {
      error: 'No supported Google Ads API version responded.',
      statusCode: 404,
      isAuthExpired: false,
      isQuotaExhausted: false,
    }
  );
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

export function micros(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 1_000_000 : undefined;
}

export function toMicros(value: number): string {
  return String(Math.round(value * 1_000_000));
}

export function round(value: number | undefined, digits = 2): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function gaqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ---------------------------------------------------------------------------
// Date ranges
// ---------------------------------------------------------------------------

export const DATE_PRESETS = [
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'LAST_90_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

export interface ResolvedDateRange {
  startDate: string;
  endDate: string;
  label: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in the account time zone (UTC when unknown). */
export function accountToday(timeZone?: string, now = new Date()): Date {
  let today = isoDate(now);
  if (timeZone) {
    try {
      today = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      // Unknown zone: fall back to UTC.
    }
  }
  return new Date(`${today}T12:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value;
}

/**
 * Resolve a preset or explicit range to concrete dates. "Last N days" follows
 * the Google Ads convention: N complete days ending yesterday.
 */
export function resolveDateRange(
  input: { dateRange?: unknown; startDate?: unknown; endDate?: unknown },
  timeZone?: string,
  now = new Date()
): ResolvedDateRange {
  const today = accountToday(timeZone, now);

  if (isIsoDate(input.startDate) && isIsoDate(input.endDate)) {
    const [start, end] =
      input.startDate <= input.endDate
        ? [input.startDate, input.endDate]
        : [input.endDate, input.startDate];
    return { startDate: start, endDate: end, label: `${start} to ${end}` };
  }

  const preset = (typeof input.dateRange === 'string' ? input.dateRange : 'LAST_30_DAYS') as DatePreset;
  const yesterday = addDays(today, -1);

  switch (preset) {
    case 'TODAY':
      return { startDate: isoDate(today), endDate: isoDate(today), label: 'today' };
    case 'YESTERDAY':
      return { startDate: isoDate(yesterday), endDate: isoDate(yesterday), label: 'yesterday' };
    case 'LAST_7_DAYS':
      return { startDate: isoDate(addDays(today, -7)), endDate: isoDate(yesterday), label: 'last 7 days' };
    case 'LAST_14_DAYS':
      return { startDate: isoDate(addDays(today, -14)), endDate: isoDate(yesterday), label: 'last 14 days' };
    case 'LAST_90_DAYS':
      return { startDate: isoDate(addDays(today, -90)), endDate: isoDate(yesterday), label: 'last 90 days' };
    case 'THIS_MONTH': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 12));
      return { startDate: isoDate(start), endDate: isoDate(today), label: 'this month' };
    }
    case 'LAST_MONTH': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1, 12));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0, 12));
      return { startDate: isoDate(start), endDate: isoDate(end), label: 'last month' };
    }
    case 'LAST_30_DAYS':
    default:
      return { startDate: isoDate(addDays(today, -30)), endDate: isoDate(yesterday), label: 'last 30 days' };
  }
}

/** The equally long period immediately before `range`. */
export function previousPeriod(range: ResolvedDateRange): ResolvedDateRange {
  const start = new Date(`${range.startDate}T12:00:00Z`);
  const end = new Date(`${range.endDate}T12:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return {
    startDate: isoDate(previousStart),
    endDate: isoDate(previousEnd),
    label: `previous ${days} days`,
  };
}

export function dateFilter(range: ResolvedDateRange): string {
  return `segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`;
}
