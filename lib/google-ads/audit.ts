import { invalidArgument } from '@/lib/mcp/errors';
import {
  accountToday, DATE_PRESETS, isIsoDate, previousPeriod, resolveDateRange,
  type GoogleAdsContext,
} from './gaql';
import { getAccountInfo, getSearchTerms, listCampaigns, listKeywords } from './reporting';

export interface AuditOptions {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  targetCpa?: number;
  targetRoas?: number;
}

export interface AuditFinding {
  id: string;
  priority: 'high' | 'medium';
  category: 'Measurement' | 'Efficiency' | 'Search terms' | 'Keyword quality' | 'Budget';
  title: string;
  evidence: string;
  recommendation: string;
  campaignId?: string;
  campaignName?: string;
}

export function validateAuditOptions(input: Record<string, unknown>): AuditOptions {
  const options: AuditOptions = {};
  const hasDates = input.startDate !== undefined || input.endDate !== undefined;
  if (hasDates) {
    if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate)) {
      throw invalidArgument('Choose valid start and end dates.');
    }
    if (input.startDate > input.endDate) throw invalidArgument('Start date must not be after end date.');
    const days = (Date.parse(input.endDate) - Date.parse(input.startDate)) / 86_400_000 + 1;
    if (days > 366) throw invalidArgument('Choose a reporting period of 366 days or fewer.');
    options.startDate = input.startDate;
    options.endDate = input.endDate;
  } else {
    if (input.dateRange !== undefined && !DATE_PRESETS.some((preset) => preset === input.dateRange)) {
      throw invalidArgument('Choose a supported reporting period.');
    }
    options.dateRange = typeof input.dateRange === 'string' ? input.dateRange : 'LAST_30_DAYS';
  }
  for (const key of ['targetCpa', 'targetRoas'] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw invalidArgument(`${key === 'targetCpa' ? 'Target CPA' : 'Target ROAS'} must be greater than zero.`);
    }
    options[key] = value;
  }
  return options;
}

type CampaignReport = Awaited<ReturnType<typeof listCampaigns>>;
type KeywordReport = Awaited<ReturnType<typeof listKeywords>>;
type SearchTermReport = Awaited<ReturnType<typeof getSearchTerms>>;

export function buildAuditFindings(
  campaigns: CampaignReport,
  keywords: KeywordReport | null,
  terms: SearchTermReport | null,
  options: AuditOptions,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const money = (value: number) => `${value.toFixed(2)} ${campaigns.currency}`;
  if (campaigns.totals.cost > 0 && campaigns.totals.conversions === 0) {
    findings.push({
      id: 'measurement', priority: 'high', category: 'Measurement',
      title: 'Spend with no recorded conversions',
      evidence: `${money(campaigns.totals.cost)} spent and 0 conversions recorded in this period.`,
      recommendation: 'Verify primary conversion actions, tracking and conversion lag before changing bids or budgets. Zero conversions alone does not prove wasted spend.',
    });
  }
  for (const campaign of campaigns.campaigns) {
    const base = { campaignId: campaign.id, campaignName: campaign.name };
    const metrics = campaign.metrics;
    if (metrics.cost === 0) continue;
    if (metrics.conversions === 0) {
      findings.push({
        ...base, id: `no-conversions-${campaign.id}`, priority: 'high', category: 'Efficiency',
        title: 'Campaign spend without recorded conversions',
        evidence: `${money(metrics.cost)} spent from ${metrics.clicks} clicks; 0 conversions.`,
        recommendation: 'Review search intent, landing pages and tracking. Allow for conversion lag; do not pause solely because this period has no conversions.',
      });
    } else if (options.targetCpa && metrics.cpa !== null && metrics.cpa > options.targetCpa) {
      findings.push({
        ...base, id: `cpa-${campaign.id}`, priority: 'high', category: 'Efficiency',
        title: 'CPA exceeds your audit target',
        evidence: `CPA ${money(metrics.cpa)} vs your ${money(options.targetCpa)} target; ${metrics.conversions} conversions.`,
        recommendation: 'Inspect expensive queries and conversion quality before adjusting bids. This audit target does not change campaign bidding settings.',
      });
    }
    // Missing conversion values are not a measured zero ROAS.
    if (options.targetRoas && metrics.roas !== null && metrics.roas < options.targetRoas) {
      findings.push({
        ...base, id: `roas-${campaign.id}`, priority: 'high', category: 'Efficiency',
        title: 'ROAS is below your audit target',
        evidence: `ROAS ${metrics.roas.toFixed(2)}x vs your ${options.targetRoas.toFixed(2)}x target; ${money(metrics.conversionValue)} recorded value.`,
        recommendation: 'Confirm conversion values reflect business value, then review low-return traffic and products before changing spend.',
      });
    }
    if (campaign.channel === 'SEARCH' && campaign.lostToBudget !== undefined && campaign.lostToBudget >= 20) {
      findings.push({
        ...base, id: `budget-${campaign.id}`, priority: 'medium', category: 'Budget',
        title: 'Search visibility constrained by budget',
        evidence: `${campaign.lostToBudget.toFixed(1)}% Search lost impression share (budget); ${money(metrics.cost)} period spend.`,
        recommendation: 'Review profitability and lead quality before adding budget. Lost impression share is missed eligible impressions, not guaranteed incremental revenue.',
      });
    }
  }
  const reviewTerms = terms?.searchTerms.filter((term) => term.status !== 'EXCLUDED' && term.metrics.cost > 0 && term.metrics.conversions === 0) || [];
  if (reviewTerms.length) {
    findings.push({
      id: 'search-terms', priority: 'high', category: 'Search terms',
      title: 'Search queries need a relevance review',
      evidence: `${reviewTerms.length} displayed, non-excluded queries spent ${money(reviewTerms.reduce((sum, term) => sum + term.metrics.cost, 0))} with no recorded conversions.`,
      recommendation: 'Review the query table for irrelevant intent before proposing negatives. This overlaps campaign spend and is not an additional savings estimate.',
    });
  }
  const lowQuality = keywords?.keywords.filter((keyword) =>
    keyword.metrics.cost > 0 && typeof keyword.qualityScore === 'number' && keyword.qualityScore <= 4) || [];
  if (lowQuality.length) {
    findings.push({
      id: 'keyword-quality', priority: 'medium', category: 'Keyword quality',
      title: 'Spending keywords have low current Quality Scores',
      evidence: `${lowQuality.length} displayed keywords have a current Quality Score of 4/10 or below.`,
      recommendation: 'Review ad relevance, expected CTR and landing-page experience. Quality Score is a current diagnostic, not a historical score for the selected period.',
    });
  }
  return findings.sort((left, right) => Number(right.priority === 'high') - Number(left.priority === 'high'));
}

export async function runAdsAudit(context: GoogleAdsContext, input: Record<string, unknown>) {
  const options = validateAuditOptions(input);
  const account = await getAccountInfo(context);
  if (account.isManager) throw invalidArgument('Select a client Google Ads account, not a manager account.');
  const range = resolveDateRange(options, account.timeZone);
  const today = accountToday(account.timeZone).toISOString().slice(0, 10);
  if (range.endDate > today) throw invalidArgument('The audit period cannot include future dates in the account time zone.');
  const prior = previousPeriod(range);
  const args = { startDate: range.startDate, endDate: range.endDate };
  const [campaigns, previous, keywordResult, termResult] = await Promise.all([
    listCampaigns(context, { ...args, limit: 200 }),
    listCampaigns(context, { startDate: prior.startDate, endDate: prior.endDate, limit: 200 }),
    listKeywords(context, { ...args, limit: 150 }).then(
      (data) => ({ data, error: null }),
      (error: unknown) => ({ data: null, error: error instanceof Error ? error.message : 'Keyword data unavailable.' }),
    ),
    getSearchTerms(context, { ...args, filter: 'NON_CONVERTING', limit: 150 }).then(
      (data) => ({ data, error: null }),
      (error: unknown) => ({ data: null, error: error instanceof Error ? error.message : 'Search-term data unavailable.' }),
    ),
  ]);
  const warnings = [
    'Read-only, rules-based diagnostics from Google Ads. No AI confidence score or guaranteed savings are generated.',
    'Campaign performance excludes removed campaigns. Search-term reporting omits queries withheld by Google for privacy; it is not a full account spend breakdown.',
    'Campaign status, budgets and Quality Scores are current settings; performance metrics use the selected period. Recent conversions may still be attributed later.',
  ];
  if (keywordResult.error) {
    console.warn('[Ads Audit] Keyword coverage unavailable:', keywordResult.error);
    warnings.push(`Keyword checks not completed: ${keywordResult.error}`);
  }
  if (termResult.error) {
    console.warn('[Ads Audit] Search-term coverage unavailable:', termResult.error);
    warnings.push(`Search-term checks not completed: ${termResult.error}`);
  }
  if (campaigns.omitted) warnings.push(`Campaign detail checks cover the top 200 by spend; ${campaigns.omitted} additional campaigns are included in summary totals only.`);
  if (keywordResult.data?.omitted) warnings.push(`${keywordResult.data.omitted} additional keywords are outside the top-150 keyword detail review.`);
  if (termResult.data?.omitted) warnings.push(`${termResult.data.omitted} additional non-converting queries are outside the top-150 query detail review.`);
  if (campaigns.totals.cost > 0 && campaigns.totals.conversionValue === 0) warnings.push('No conversion value is reported. ROAS is unavailable, not zero. Verify value tracking if revenue is your goal.');
  if (range.endDate === today) warnings.push('The selected period includes today and is incomplete.');
  return {
    account, dateRange: range, previousRange: prior, generatedAt: new Date().toISOString(),
    targets: { cpa: options.targetCpa ?? null, roas: options.targetRoas ?? null },
    totals: campaigns.totals, previousTotals: previous.totals,
    campaigns: campaigns.campaigns,
    totalCampaigns: campaigns.totalCampaigns,
    keywords: keywordResult.data?.keywords ?? null,
    searchTerms: termResult.data?.searchTerms ?? null,
    findings: buildAuditFindings(campaigns, keywordResult.data, termResult.data, options),
    warnings,
  };
}

export type AdsAuditReport = Awaited<ReturnType<typeof runAdsAudit>>;
