import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds, metrics } from './helpers/fake-google-ads';
import { invalidateGaqlCache, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { runAdsAudit, validateAuditOptions, type AuditFinding } from '@/lib/google-ads/audit';
import { buildAuditCsv } from '@/lib/google-ads/audit-csv';
import { jsonRequest } from './helpers/model';

const mocks = vi.hoisted(() => ({ uid: 'audit-user', connected: true }));
vi.mock('@/lib/billing/http', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/billing/http')>(),
  billingIdentity: async () => ({ uid: mocks.uid }),
}));
vi.mock('@/lib/billing/store', () => ({ rateLimit: vi.fn(), hash: (value: string) => value }));
vi.mock('@/lib/billing/audit-access', () => ({
  reserveAudit: vi.fn(async () => 'audit-reservation'),
  releaseAudit: vi.fn(async () => {}),
  completeAudit: vi.fn(async () => ({ plan: 'free', limit: 5, used: 1, remaining: 4, resetsAt: '2026-12-01T00:00:00Z' })),
  getAuditUsage: vi.fn(async () => ({ plan: 'free', limit: 5, used: 0, remaining: 5, resetsAt: '2026-12-01T00:00:00Z' })),
}));
vi.mock('@/lib/ai/identity', () => ({
  requireIdentity: async () => ({ uid: mocks.uid }),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock('@/lib/ai/account-binding', () => ({
  resolveAccountBinding: async () => ({
    customerId: '1234567890', accountName: 'Acme', currency: 'USD', isConnected: mocks.connected,
  }),
  resolveFreshAccessToken: async () => ({ accessToken: 'token' }),
  AccountBindingError: class AccountBindingError extends Error {},
}));
import { POST } from '@/app/api/google-ads/audit/route';
import { completeAudit, releaseAudit, reserveAudit } from '@/lib/billing/audit-access';

let fake: FakeGoogleAds;
let context: GoogleAdsContext;
const dates = { startDate: '2026-10-10', endDate: '2026-10-16' };

beforeEach(() => {
  mocks.connected = true;
  vi.clearAllMocks();
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
  context = { customerId: '1234567890', accountName: 'Acme', accessToken: 'token', currency: 'USD' };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('audit findings CSV', () => {
  const finding: AuditFinding = {
    id: 'cpa-111', priority: 'high', category: 'Efficiency', campaignName: 'Brand',
    title: 'CPA exceeds your audit target', evidence: 'CPA 75.00 GBP vs 50.00 GBP target.',
    recommendation: 'Review expensive queries.',
  };
  const header = '"Priority","Category","Campaign","Finding","Evidence","Next step"';

  it('exports one findings table without metadata, metric summaries or footer rows', () => {
    expect(buildAuditCsv([finding, { ...finding, id: 'account', campaignName: undefined }])).toBe([
      header,
      '"high","Efficiency","Brand","CPA exceeds your audit target","CPA 75.00 GBP vs 50.00 GBP target.","Review expensive queries."',
      '"high","Efficiency","Account","CPA exceeds your audit target","CPA 75.00 GBP vs 50.00 GBP target.","Review expensive queries."',
    ].join('\r\n'));
  });

  it('keeps quoted and multiline evidence in a single cell and neutralizes spreadsheet formulas', () => {
    expect(buildAuditCsv([{
      ...finding, campaignName: '=1+1', evidence: 'Query "boots, sale"\nspent 10 GBP.',
    }])).toBe([
      header,
      `"high","Efficiency","'=1+1","CPA exceeds your audit target","Query ""boots, sale""\nspent 10 GBP.","Review expensive queries."`,
    ].join('\r\n'));
  });

  it('exports only the column headers when there are no findings', () => {
    expect(buildAuditCsv([])).toBe(header);
  });
});

describe('period-specific audit', () => {
  it('uses the exact selected and equal previous period for live reads without changing the account', async () => {
    const report = await runAdsAudit(context, { ...dates, targetCpa: 50, targetRoas: 2 });
    expect(report.dateRange).toMatchObject(dates);
    expect(report.previousRange).toMatchObject({ startDate: '2026-10-03', endDate: '2026-10-09' });
    expect(report.account).toMatchObject({ currency: 'USD', timeZone: 'America/New_York' });
    const performanceQueries = fake.queries().filter((request) => request.query?.includes('segments.date'));
    expect(performanceQueries).toHaveLength(4);
    expect(performanceQueries.filter((request) => request.query?.includes("BETWEEN '2026-10-10' AND '2026-10-16'"))).toHaveLength(3);
    expect(performanceQueries.filter((request) => request.query?.includes("BETWEEN '2026-10-03' AND '2026-10-09'"))).toHaveLength(1);
    expect(report.findings.find((finding) => finding.id === 'cpa-222')).toMatchObject({
      campaignName: 'Generic - Hiking Boots', priority: 'high',
    });
    expect(report.findings.find((finding) => finding.id === 'budget-111')).toBeDefined();
    expect(fake.mutates()).toEqual([]);
  });

  it('does not invent CPA/ROAS targets or treat missing conversion values as zero ROAS', async () => {
    fake.account.campaigns[1].metrics = metrics(100, 5, 50, 0);
    const report = await runAdsAudit(context, { ...dates, targetRoas: 3 });
    expect(report.findings.some((finding) => finding.id.startsWith('cpa-'))).toBe(false);
    expect(report.findings.some((finding) => finding.id === 'roas-222')).toBe(false);
    expect(report.campaigns.find((campaign) => campaign.id === '222')?.metrics.roas).toBeNull();
  });

  it('does not flag exact CPA/ROAS targets as failing', async () => {
    fake.account.campaigns[1].metrics = metrics(100, 2, 20, 200);
    const report = await runAdsAudit(context, { ...dates, targetCpa: 50, targetRoas: 2 });
    expect(report.findings.some((finding) => ['cpa-222', 'roas-222'].includes(finding.id))).toBe(false);
  });

  it('reports incomplete keyword/query coverage explicitly without claiming those checks passed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fake.failNext((request) => request.from === 'search_term_view', 'USER_PERMISSION_DENIED', 'authorizationError');
    fake.failNext((request) => request.from === 'keyword_view', 'USER_PERMISSION_DENIED', 'authorizationError');
    const report = await runAdsAudit(context, dates);
    expect(report.searchTerms).toBeNull();
    expect(report.keywords).toBeNull();
    expect(report.warnings.join(' ')).toContain('Search-term checks not completed');
    expect(report.warnings.join(' ')).toContain('Keyword checks not completed');
    expect(report.findings.some((finding) => ['search-terms', 'keyword-quality'].includes(finding.id))).toBe(false);
  });

  it('does not turn a failed campaign read into a healthy audit', async () => {
    fake.failNext((request) => request.from === 'campaign', 'USER_PERMISSION_DENIED', 'authorizationError');
    await expect(runAdsAudit(context, dates)).rejects.toThrow();
  });

  it('excludes already-negative queries from the relevance review finding', async () => {
    for (const term of fake.account.searchTerms) term.status = 'EXCLUDED';
    const report = await runAdsAudit(context, dates);
    expect(report.findings.some((finding) => finding.id === 'search-terms')).toBe(false);
  });

  it('makes zero-conversion measurement concerns explicit', async () => {
    for (const campaign of fake.account.campaigns) campaign.metrics.conversions = 0;
    const report = await runAdsAudit(context, dates);
    expect(report.findings[0]).toMatchObject({ id: 'measurement', priority: 'high' });
    expect(report.totals.cpa).toBeNull();
  });

  it('applies the documented budget and Quality Score thresholds exactly', async () => {
    fake.account.campaigns[0].lostToBudget = 0.20;
    fake.account.keywords[0].qualityScore = 4;
    fake.account.keywords[1].qualityScore = 5;
    let report = await runAdsAudit(context, dates);
    expect(report.findings.some((finding) => finding.id === 'budget-111')).toBe(true);
    expect(report.findings.find((finding) => finding.id === 'keyword-quality')?.evidence).toContain('1 displayed');
    fake.account.campaigns[0].lostToBudget = 0.199;
    fake.account.keywords[0].qualityScore = 5;
    invalidateGaqlCache();
    report = await runAdsAudit(context, dates);
    expect(report.findings.some((finding) => ['budget-111', 'keyword-quality'].includes(finding.id))).toBe(false);
  });

  it('discloses capped detail coverage while keeping all campaigns in summary totals', async () => {
    const template = fake.account.campaigns[0];
    fake.account.campaigns = Array.from({ length: 201 }, (_, index) => ({
      ...template, id: String(10000 + index), name: `Campaign ${index}`, metrics: metrics(10, 1),
    }));
    fake.account.adGroups = [];
    fake.account.keywords = [];
    fake.account.searchTerms = [];
    const report = await runAdsAudit(context, dates);
    expect(report.totalCampaigns).toBe(201);
    expect(report.campaigns).toHaveLength(200);
    expect(report.totals.cost).toBe(2010);
    expect(report.warnings.join(' ')).toContain('1 additional campaigns');
  });

  it('returns missing ratios rather than fabricated healthy metrics for a no-delivery period', async () => {
    for (const campaign of fake.account.campaigns) campaign.metrics = metrics(0, 0, 0);
    for (const keyword of fake.account.keywords) keyword.metrics = metrics(0, 0, 0);
    fake.account.searchTerms = [];
    const report = await runAdsAudit(context, dates);
    expect(report.totals).toMatchObject({ cost: 0, impressions: 0, conversions: 0, cpa: null, roas: null });
    expect(report.findings).toEqual([]);
  });
});

describe('audit validation and account binding', () => {
  it.each([
    { startDate: '2026-02-30', endDate: '2026-03-01' },
    { startDate: '2026-10-20', endDate: '2026-10-01' },
    { startDate: '2024-01-01', endDate: '2026-01-01' },
    { startDate: '2026-10-01' },
    { dateRange: 'MADE_UP' },
    { targetCpa: -10 },
    { targetRoas: '3' },
  ])('rejects invalid options before making Google Ads calls: %j', async (input) => {
    expect(() => validateAuditOptions(input)).toThrow();
    const response = await POST(jsonRequest('http://localhost/api/google-ads/audit', input));
    expect(response.status).toBe(400);
    expect(fake.requests).toEqual([]);
  });

  it('rejects future reporting dates in the account time zone', async () => {
    await expect(runAdsAudit(context, { startDate: '2099-01-01', endDate: '2099-01-02' })).rejects.toThrow('future');
    expect(fake.queries('campaign')).toHaveLength(0);
  });

  it('uses the server-owned account binding instead of a browser-provided customer ID', async () => {
    const response = await POST(jsonRequest('http://localhost/api/google-ads/audit', { ...dates, customerId: '9999999999' }));
    expect(response.status).toBe(200);
    expect(fake.requests.every((request) => request.url.includes('/customers/1234567890/'))).toBe(true);
    expect(fake.mutates()).toEqual([]);
    expect(await response.json()).toMatchObject({ usage: { plan: 'free', remaining: 4 } });
    expect(completeAudit).toHaveBeenCalledWith('audit-reservation', mocks.uid);
    expect(releaseAudit).not.toHaveBeenCalled();
  });

  it('requires a connected account', async () => {
    mocks.connected = false;
    const response = await POST(jsonRequest('http://localhost/api/google-ads/audit', dates));
    expect(response.status).toBe(409);
    expect(fake.requests).toEqual([]);
    expect(reserveAudit).not.toHaveBeenCalled();
  });

  it('releases the Free allowance when a campaign read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.failNext((request) => request.from === 'campaign', 'USER_PERMISSION_DENIED', 'authorizationError');
    const response = await POST(jsonRequest('http://localhost/api/google-ads/audit', dates));
    expect(response.ok).toBe(false);
    expect(reserveAudit).toHaveBeenCalledOnce();
    expect(releaseAudit).toHaveBeenCalledWith('audit-reservation');
    expect(completeAudit).not.toHaveBeenCalled();
    expect(fake.mutates()).toEqual([]);
  });
});
