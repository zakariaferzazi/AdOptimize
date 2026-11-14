import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds } from './helpers/fake-google-ads';
import {
  invalidateGaqlCache,
  newRequestStats,
  previousPeriod,
  resolveDateRange,
  runGaql,
  type GoogleAdsContext,
} from '@/lib/google-ads/gaql';
import { searchLocations } from '@/lib/google-ads/geo';
import {
  getCampaignDetails,
  getConversionSetup,
  getPerformance,
  getSearchTerms,
  listCampaigns,
  listKeywords,
  resolveCampaign,
  runDiagnostics,
} from '@/lib/google-ads/reporting';
import { fromGoogleAdsFailure } from '@/lib/mcp/errors';
import { describeGoogleAdsFailure } from '@/lib/google-ads/errors';
import { googleAdsErrorBody } from './helpers/fake-google-ads';

let fake: FakeGoogleAds;
let context: GoogleAdsContext;

beforeEach(() => {
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
  context = {
    customerId: '1234567890',
    accessToken: 'token',
    currency: 'USD',
    accountName: 'Acme Outdoors',
    stats: newRequestStats(),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('date ranges', () => {
  const now = new Date('2026-11-11T15:00:00Z');

  it('follows the Google Ads convention of complete days ending yesterday', () => {
    expect(resolveDateRange({ dateRange: 'LAST_7_DAYS' }, 'UTC', now)).toMatchObject({ startDate: '2026-11-04', endDate: '2026-11-10' });
    expect(resolveDateRange({ dateRange: 'LAST_30_DAYS' }, 'UTC', now)).toMatchObject({ startDate: '2026-10-12', endDate: '2026-11-10' });
    expect(resolveDateRange({}, 'UTC', now).label).toBe('last 30 days');
  });

  it('handles calendar months and explicit ranges', () => {
    expect(resolveDateRange({ dateRange: 'LAST_MONTH' }, 'UTC', now)).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(resolveDateRange({ dateRange: 'THIS_MONTH' }, 'UTC', now)).toMatchObject({ startDate: '2026-11-01', endDate: '2026-11-11' });
    expect(resolveDateRange({ startDate: '2026-09-10', endDate: '2026-09-01' }, 'UTC', now)).toMatchObject({ startDate: '2026-09-01', endDate: '2026-09-10' });
  });

  it('uses the account time zone for "today"', () => {
    const lateUtc = new Date('2026-11-11T02:00:00Z');
    expect(resolveDateRange({ dateRange: 'TODAY' }, 'America/Los_Angeles', lateUtc).startDate).toBe('2026-11-10');
  });

  it('computes an equal previous period', () => {
    expect(previousPeriod({ startDate: '2026-11-04', endDate: '2026-11-10', label: '' })).toMatchObject({ startDate: '2026-10-28', endDate: '2026-11-03' });
  });
});

describe('GAQL gateway', () => {
  it('caches identical reads briefly and invalidates after a mutation', async () => {
    await runGaql(context, 'SELECT campaign.id FROM campaign');
    await runGaql(context, 'SELECT   campaign.id   FROM campaign');
    expect(fake.queries('campaign')).toHaveLength(1);
    expect(context.stats).toMatchObject({ requests: 1, cacheHits: 1 });

    invalidateGaqlCache('1234567890');
    await runGaql(context, 'SELECT campaign.id FROM campaign');
    expect(fake.queries('campaign')).toHaveLength(2);
  });

  it('bypasses the cache for fresh reads', async () => {
    await runGaql(context, 'SELECT campaign.id FROM campaign');
    await runGaql(context, 'SELECT campaign.id FROM campaign', { cacheTtlMs: 0 });
    expect(fake.queries('campaign')).toHaveLength(2);
  });

  it('turns Google Ads failures into structured, classified errors', () => {
    const info = describeGoogleAdsFailure(googleAdsErrorBody('REQUIRED', 'fieldError', 'The field is required.', 'operations.create.name'), 400, '');
    const error = fromGoogleAdsFailure(info).payload;
    expect(error).toMatchObject({ code: 'invalid_argument', google_ads_code: 'REQUIRED', google_ads_error_type: 'fieldError' });
    expect(error.field_path).toContain('name');

    const restricted = fromGoogleAdsFailure(describeGoogleAdsFailure(googleAdsErrorBody('OPERATION_NOT_PERMITTED_FOR_CAMPAIGN_TYPE', 'mutateError', 'Not allowed.'), 400, '')).payload;
    expect(restricted.code).toBe('api_restriction');

    const permission = fromGoogleAdsFailure(describeGoogleAdsFailure(googleAdsErrorBody('USER_PERMISSION_DENIED', 'authorizationError', 'Denied'), 403, '')).payload;
    expect(permission.code).toBe('permission');

    const quota = fromGoogleAdsFailure({ error: 'Too many requests', statusCode: 429, isQuotaExhausted: true }).payload;
    expect(quota).toMatchObject({ code: 'quota', retryable: true });
  });
});

describe('reporting', () => {
  it('lists every campaign with real IDs, including ones without metrics', async () => {
    const result = await listCampaigns(context, { dateRange: 'LAST_30_DAYS' });
    expect(result.totalCampaigns).toBe(4);
    expect(result.campaigns.map((campaign) => campaign.id)).toEqual(expect.arrayContaining(['111', '222', '333', '444']));
    const brand = result.campaigns.find((campaign) => campaign.id === '111')!;
    expect(brand).toMatchObject({ dailyBudget: 50, lostToBudget: 32, bidding: 'MANUAL_CPC' });
    expect(brand.metrics).toMatchObject({ cost: 900, conversions: 60, cpa: 15 });
    expect(result.campaigns.find((campaign) => campaign.id === '333')!.metrics.cpa).toBeNull();
    expect(result.dateRange.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.currency).toBe('USD');
  });

  it('flags ambiguous names instead of guessing', async () => {
    await expect(resolveCampaign(context, { campaignName: 'hiking boots' })).rejects.toMatchObject({
      payload: { code: 'ambiguous', candidates: expect.arrayContaining([expect.objectContaining({ id: '222' }), expect.objectContaining({ id: '333' })]) },
    });
    await expect(resolveCampaign(context, { campaignName: 'Generic - Hiking Boots' })).resolves.toMatchObject({ id: '222' });
    await expect(resolveCampaign(context, { campaignId: '999' })).rejects.toMatchObject({ payload: { code: 'not_found' } });
  });

  it('compares a period with the previous one', async () => {
    const result = (await getPerformance(context, { level: 'campaign', compareToPrevious: true })) as any;
    expect(result.comparison.previousRange.endDate < result.dateRange.startDate).toBe(true);
    expect(result.rows[0].previous).toBeDefined();
    expect(fake.queries('campaign').length).toBe(2);
  });

  it('finds non-converting search terms with their status', async () => {
    const result = await getSearchTerms(context, { campaignId: '222', filter: 'NON_CONVERTING' });
    expect(result.searchTerms.map((term) => term.searchTerm)).toEqual(['hiking boots repair', 'cheap hiking boots used']);
    expect(result.totalsForFilteredTerms.cost).toBe(420);
  });

  it('lists keywords with bids and quality score', async () => {
    const result = await listKeywords(context, { campaignId: '222', filter: 'LOW_QUALITY' });
    expect(result.keywords).toHaveLength(1);
    expect(result.keywords[0]).toMatchObject({ keyword: 'hiking boots', qualityScore: 3, effectiveMaxCpc: 2, adGroupId: '5002', criterionId: '7002' });
  });

  it('explains the three conversion layers for a campaign', async () => {
    const result = (await getConversionSetup(context, { campaignId: '444' })) as any;
    expect(result.conversionActions).toHaveLength(4);
    expect(result.campaign).toMatchObject({ campaignId: '444', channel: 'MULTI_CHANNEL', goalConfigLevel: 'CUSTOMER' });
    expect(result.campaign.appSelectiveOptimization).toEqual([]);
    expect(result.explanation.join(' ')).toMatch(/custom conversion goal/i);
  });

  it('produces evidence-backed diagnostics', async () => {
    const result = (await runDiagnostics(context, {})) as any;
    const types = result.findings.map((finding: any) => finding.type);
    expect(types).toEqual(expect.arrayContaining(['limited_by_budget', 'non_converting_search_terms', 'low_quality_score_keywords', 'high_cpa_campaign']));
    const budget = result.findings.find((finding: any) => finding.type === 'limited_by_budget');
    expect(budget.evidence.impressionShareLostToBudgetPercent).toBe(32);
  });

  it('reads campaign locations in getCampaignDetails and searches geo targets via searchLocations', async () => {
    const details = (await getCampaignDetails(context, { campaignId: '111' })) as any;
    expect(details.campaign.locations.targeted.map((l: any) => l.name)).toEqual(['Canada', 'United States']);
    expect(details.campaign.locations.excluded).toEqual([]);

    const searched = await searchLocations(context, { query: 'London' });
    expect(searched.totalFound).toBe(2);
    expect(searched.locations.map((l) => l.canonicalName)).toEqual([
      'London,England,United Kingdom',
      'London,Ontario,Canada',
    ]);

    const filtered = await searchLocations(context, { query: 'London', countryCode: 'GB' });
    expect(filtered.locations).toHaveLength(1);
    expect(filtered.locations[0].id).toBe('1006886');
  });
});
