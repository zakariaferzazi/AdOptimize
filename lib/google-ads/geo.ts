import { ambiguous, invalidArgument, notFound } from '@/lib/mcp/errors';
import { describeGoogleAdsFailure } from './errors';
import {
  cleanId,
  fetchWithTimeout,
  gaqlString,
  googleAdsHeaders,
  GOOGLE_ADS_API_VERSIONS,
  GoogleAdsRequestError,
  runGaql,
  type GoogleAdsContext,
} from './gaql';

/**
 * Geographic target resolution via Google Ads API.
 *
 * Uses `geoTargetConstants:suggest` for location name search/disambiguation and
 * GAQL `geo_target_constant` queries for exact ID/resource lookups.
 */

export interface GeoTarget {
  id: string;
  resourceName: string;
  name: string;
  canonicalName: string;
  countryCode?: string;
  targetType?: string;
  status?: string;
}

const SUGGEST_TIMEOUT_MS = 15_000;

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  uk: 'GB',
  gb: 'GB',
  us: 'US',
  usa: 'US',
  uae: 'AE',
  ae: 'AE',
  ksa: 'SA',
  sa: 'SA',
  ca: 'CA',
  au: 'AU',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  eg: 'EG',
};

const SEGMENT_EXPANSIONS: Record<string, string> = {
  uk: 'united kingdom',
  usa: 'united states',
  us: 'united states',
  uae: 'united arab emirates',
  ksa: 'saudi arabia',
};

export function normalizeGeoName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseGeoTargetId(input: string): string | undefined {
  const trimmed = input.trim();
  const match = /^(?:geoTargetConstants\/)?(\d+)$/i.exec(trimmed);
  return match?.[1];
}

export function geoTargetResourceName(idOrResource: string): string {
  return `geoTargetConstants/${cleanId(idOrResource)}`;
}

function toGeoTarget(raw: Record<string, any>): GeoTarget {
  const resourceName = String(raw.resourceName || (raw.id ? `geoTargetConstants/${cleanId(raw.id)}` : ''));
  const id = cleanId(raw.id || resourceName.split('/').pop());
  const name = String(raw.name || '');
  const canonicalName = String(raw.canonicalName || name);
  return {
    id,
    resourceName,
    name,
    canonicalName,
    ...(raw.countryCode ? { countryCode: String(raw.countryCode) } : {}),
    ...(raw.targetType ? { targetType: String(raw.targetType) } : {}),
    ...(raw.status ? { status: String(raw.status) } : {}),
  };
}

function toCandidate(geo: GeoTarget) {
  return {
    id: geo.id,
    resourceName: geo.resourceName,
    name: geo.canonicalName || geo.name,
    shortName: geo.name,
    ...(geo.countryCode ? { countryCode: geo.countryCode } : {}),
    ...(geo.targetType ? { targetType: geo.targetType } : {}),
  };
}

/**
 * Suggest targetable locations from Google Ads (`geoTargetConstants:suggest`).
 */
export async function suggestGeoTargets(
  context: GoogleAdsContext,
  names: string[],
  options: { countryCode?: string; locale?: string } = {}
): Promise<Array<{ searchTerm: string; geo: GeoTarget }>> {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (!cleaned.length) return [];
  if (!context.accessToken) {
    throw new GoogleAdsRequestError({
      error: 'Google Ads access is not available. Reconnect the account.',
      statusCode: 401,
      isAuthExpired: true,
      isQuotaExhausted: false,
    });
  }

  const headers = googleAdsHeaders(context);
  const payload = JSON.stringify({
    locale: options.locale || 'en',
    ...(options.countryCode ? { countryCode: options.countryCode.trim().toUpperCase() } : {}),
    locationNames: { names: cleaned },
  });

  let lastInfo;
  for (const version of GOOGLE_ADS_API_VERSIONS) {
    if (context.stats) context.stats.requests += 1;
    const response = await fetchWithTimeout(
      `https://googleads.googleapis.com/${version}/geoTargetConstants:suggest`,
      { method: 'POST', headers, body: payload },
      SUGGEST_TIMEOUT_MS
    );
    const rawText = await response.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = undefined;
    }

    if (response.ok && parsed && typeof parsed === 'object') {
      const suggestions = (parsed as { geoTargetConstantSuggestions?: Array<Record<string, any>> })
        .geoTargetConstantSuggestions || [];
      return suggestions
        .filter((item) => item?.geoTargetConstant)
        .map((item) => ({
          searchTerm: String(item.searchTerm || ''),
          geo: toGeoTarget(item.geoTargetConstant),
        }))
        .filter((item) => !item.geo.status || item.geo.status === 'ENABLED');
    }

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

/**
 * Look up exact `geo_target_constant` metadata by resource names via GAQL.
 */
export async function fetchGeoTargetsByResourceNames(
  context: GoogleAdsContext,
  resourceNames: string[]
): Promise<Map<string, GeoTarget>> {
  const unique = [...new Set(resourceNames.map((name) => name.trim()).filter(Boolean))];
  const byResource = new Map<string, GeoTarget>();
  if (!unique.length) return byResource;

  const list = unique.map(gaqlString).join(', ');
  const rows = await runGaql(
    context,
    `SELECT geo_target_constant.id, geo_target_constant.resource_name, geo_target_constant.name,
            geo_target_constant.canonical_name, geo_target_constant.country_code,
            geo_target_constant.target_type, geo_target_constant.status
     FROM geo_target_constant
     WHERE geo_target_constant.resource_name IN (${list})`,
    { cacheTtlMs: 60 * 60_000 }
  );

  for (const row of rows) {
    const raw = row.geoTargetConstant;
    if (!raw) continue;
    const geo = toGeoTarget(raw);
    if (geo.resourceName) byResource.set(geo.resourceName, geo);
  }
  return byResource;
}

function dedupeGeos(items: GeoTarget[]): GeoTarget[] {
  const seen = new Set<string>();
  const out: GeoTarget[] = [];
  for (const item of items) {
    if (!item.resourceName || seen.has(item.resourceName)) continue;
    seen.add(item.resourceName);
    out.push(item);
  }
  return out;
}

function expandSegment(segment: string): string {
  const norm = normalizeGeoName(segment);
  return SEGMENT_EXPANSIONS[norm] || norm;
}

function matchBySegments(input: string, candidates: GeoTarget[]): GeoTarget | undefined {
  const rawSegments = input
    .split(',')
    .map((part) => expandSegment(part))
    .filter(Boolean);
  if (rawSegments.length < 2) return undefined;

  const [head, ...tail] = rawSegments;
  const matched = candidates.filter((candidate) => {
    const canonSegments = (candidate.canonicalName || candidate.name)
      .split(',')
      .map((part) => normalizeGeoName(part))
      .filter(Boolean);
    if (!canonSegments.length) return false;
    if (canonSegments[0] !== head) return false;
    return tail.every((seg) =>
      canonSegments.slice(1).some((c) => c === seg || c.includes(seg)) ||
      (candidate.countryCode && COUNTRY_CODE_ALIASES[seg] === candidate.countryCode.toUpperCase())
    );
  });

  return matched.length === 1 ? matched[0] : undefined;
}

function resolveFromSuggestions(rawInput: string, suggestions: GeoTarget[]): GeoTarget {
  const unique = dedupeGeos(suggestions);
  if (!unique.length) {
    throw notFound(`Location "${rawInput}"`);
  }

  const needle = normalizeGeoName(rawInput);

  // 1. Exact canonicalName match (normalized punctuation & case)
  const exactCanonical = unique.filter((geo) => normalizeGeoName(geo.canonicalName) === needle);
  if (exactCanonical.length === 1) return exactCanonical[0];

  // 2. Comma-delimited hierarchical match like "Paris, France" or "London, UK"
  const segmentMatch = matchBySegments(rawInput, unique);
  if (segmentMatch) return segmentMatch;

  // 3. Exact short name match
  const exactName = unique.filter((geo) => normalizeGeoName(geo.name) === needle);
  if (exactName.length === 1) return exactName[0];
  if (exactName.length > 1) {
    throw ambiguous('location', exactName.slice(0, 8).map(toCandidate));
  }

  // 4. Country alias / ISO code match (only when an unambiguous Country exists)
  const aliasCountryCode = COUNTRY_CODE_ALIASES[needle];
  if (aliasCountryCode) {
    const countryMatches = unique.filter(
      (geo) =>
        geo.targetType === 'Country' &&
        (geo.countryCode?.toUpperCase() === aliasCountryCode ||
          normalizeGeoName(geo.name) === SEGMENT_EXPANSIONS[needle])
    );
    if (countryMatches.length === 1) return countryMatches[0];
  }

  // 5. Single candidate returned
  if (unique.length === 1) return unique[0];

  throw ambiguous('location', unique.slice(0, 8).map(toCandidate));
}

/**
 * Resolve one or more location names or geo target IDs to canonical `GeoTarget` objects.
 * Throws `notFound`, `ambiguous`, or `invalidArgument` cleanly when resolution fails.
 */
export async function resolveLocationInputs(
  context: GoogleAdsContext,
  inputs: string[],
  fieldLabel = 'location'
): Promise<GeoTarget[]> {
  const cleaned = inputs.map((item) => item.trim()).filter(Boolean);
  if (!cleaned.length) {
    throw invalidArgument(`At least one non-empty ${fieldLabel} is required.`);
  }

  const idEntries: Array<{ raw: string; resourceName: string }> = [];
  const nameEntries: string[] = [];

  for (const raw of cleaned) {
    const id = parseGeoTargetId(raw);
    if (id) idEntries.push({ raw, resourceName: `geoTargetConstants/${id}` });
    else nameEntries.push(raw);
  }

  const byResource = idEntries.length
    ? await fetchGeoTargetsByResourceNames(
        context,
        idEntries.map((entry) => entry.resourceName)
      )
    : new Map<string, GeoTarget>();

  const toSearchTerm = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed.includes(',')) {
      return SEGMENT_EXPANSIONS[normalizeGeoName(trimmed)] || trimmed;
    }
    return trimmed
      .split(',')
      .map((part) => {
        const clean = part.trim();
        const expanded = SEGMENT_EXPANSIONS[normalizeGeoName(clean)];
        return expanded || clean;
      })
      .filter(Boolean)
      .join(', ');
  };

  // Expand shorthand country aliases so queries like "London, UK" match accurately.
  const searchNames = [...new Set(nameEntries.map(toSearchTerm))];
  const suggestRows = searchNames.length ? await suggestGeoTargets(context, searchNames) : [];

  const resolved: GeoTarget[] = [];
  for (const raw of cleaned) {
    const id = parseGeoTargetId(raw);
    if (id) {
      const resourceName = `geoTargetConstants/${id}`;
      const geo = byResource.get(resourceName);
      if (!geo) throw notFound(`Location ${raw}`);
      if (geo.status && geo.status !== 'ENABLED') {
        throw invalidArgument(`Location "${geo.canonicalName || geo.name}" (${geo.id}) is not targetable (status: ${geo.status}).`);
      }
      resolved.push(geo);
      continue;
    }

    const searchKey = toSearchTerm(raw);
    const candidates = suggestRows
      .filter((row) => normalizeGeoName(row.searchTerm) === normalizeGeoName(searchKey))
      .map((row) => row.geo);

    resolved.push(resolveFromSuggestions(raw, candidates));
  }

  return dedupeGeos(resolved);
}

/**
 * `search_locations` read tool handler.
 */
export async function searchLocations(context: GoogleAdsContext, args: Record<string, unknown>) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) throw invalidArgument('query is required (e.g. a country, state, city name, or numeric geo target ID).');

  const countryCode =
    typeof args.countryCode === 'string' && args.countryCode.trim()
      ? args.countryCode.trim().toUpperCase()
      : undefined;

  const parsedLimit = Number(args.limit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 25) : 10;

  const id = parseGeoTargetId(query);
  if (id) {
    const map = await fetchGeoTargetsByResourceNames(context, [`geoTargetConstants/${id}`]);
    const found = map.get(`geoTargetConstants/${id}`);
    const locations = found ? [found] : [];
    return {
      query,
      ...(countryCode ? { countryCode } : {}),
      totalFound: locations.length,
      locations,
    };
  }

  const expanded = SEGMENT_EXPANSIONS[normalizeGeoName(query)] || query;
  const rows = await suggestGeoTargets(context, [expanded], { countryCode });
  const locations = dedupeGeos(rows.map((row) => row.geo));

  return {
    query,
    ...(countryCode ? { countryCode } : {}),
    totalFound: locations.length,
    locations: locations.slice(0, limit),
  };
}
