import {
  cleanId,
  dateFilter,
  gaqlString,
  micros,
  previousPeriod,
  resolveDateRange,
  round,
  runGaql,
  type GoogleAdsContext,
  type ResolvedDateRange,
} from './gaql';
import { ambiguous, invalidArgument, notFound } from '@/lib/mcp/errors';

/**
 * Business-level Google Ads read capabilities.
 *
 * Each function answers one marketing question with a small, explicit result:
 * real IDs, the exact date range used, the account currency, and only the
 * fields needed to reason about it. Lists are capped and report how many rows
 * were omitted, so nothing is silently truncated.
 */

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface Metrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number | null;
  avgCpc: number | null;
  cpa: number | null;
  roas: number | null;
  conversionRate: number | null;
}

interface RawMetrics {
  impressions?: string | number;
  clicks?: string | number;
  costMicros?: string | number;
  conversions?: string | number;
  conversionsValue?: string | number;
  searchImpressionShare?: number;
  searchBudgetLostImpressionShare?: number;
  searchRankLostImpressionShare?: number;
}

const METRIC_FIELDS =
  'metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value';

function emptyTotals() {
  return { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0 };
}

type Totals = ReturnType<typeof emptyTotals>;

function addRaw(totals: Totals, raw: RawMetrics | undefined): Totals {
  totals.impressions += Number(raw?.impressions || 0);
  totals.clicks += Number(raw?.clicks || 0);
  totals.cost += (micros(raw?.costMicros) || 0);
  totals.conversions += Number(raw?.conversions || 0);
  totals.conversionValue += Number(raw?.conversionsValue || 0);
  return totals;
}

export function finalizeMetrics(totals: Totals): Metrics {
  const { impressions, clicks, cost, conversions, conversionValue } = totals;
  return {
    impressions,
    clicks,
    cost: round(cost) ?? 0,
    conversions: round(conversions) ?? 0,
    conversionValue: round(conversionValue) ?? 0,
    ctr: impressions > 0 ? round((clicks / impressions) * 100) ?? null : null,
    avgCpc: clicks > 0 ? round(cost / clicks) ?? null : null,
    cpa: conversions > 0 ? round(cost / conversions) ?? null : null,
    roas: cost > 0 && conversionValue > 0 ? round(conversionValue / cost) ?? null : null,
    conversionRate: clicks > 0 ? round((conversions / clicks) * 100) ?? null : null,
  };
}

function share(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? round(value * 100, 1) ?? null : null;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return round(((current - previous) / Math.abs(previous)) * 100, 1) ?? null;
}

function compareMetrics(current: Metrics, previous: Metrics) {
  const keys: Array<keyof Metrics> = ['cost', 'clicks', 'impressions', 'conversions', 'conversionValue', 'cpa', 'roas', 'ctr', 'avgCpc', 'conversionRate'];
  const changes: Record<string, number | null> = {};
  for (const key of keys) changes[key] = pctChange(current[key], previous[key]);
  return changes;
}

function clampLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function rangeInfo(range: ResolvedDateRange) {
  return { startDate: range.startDate, endDate: range.endDate, label: range.label };
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export interface AccountInfo {
  customerId: string;
  name: string;
  currency: string;
  timeZone: string;
  isManager: boolean;
  isTestAccount: boolean;
}

export async function getAccountInfo(context: GoogleAdsContext): Promise<AccountInfo> {
  const rows = await runGaql(
    context,
    `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone,
            customer.manager, customer.test_account
     FROM customer LIMIT 1`,
    { cacheTtlMs: 60 * 60_000 }
  );
  const customer = rows[0]?.customer || {};
  const info: AccountInfo = {
    customerId: cleanId(customer.id || context.customerId),
    name: String(customer.descriptiveName || context.accountName || ''),
    currency: String(customer.currencyCode || context.currency || 'USD'),
    timeZone: String(customer.timeZone || context.timeZone || 'UTC'),
    isManager: Boolean(customer.manager),
    isTestAccount: Boolean(customer.testAccount),
  };
  context.timeZone = info.timeZone;
  if (info.currency) context.currency = info.currency;
  return info;
}

async function rangeFor(context: GoogleAdsContext, args: Record<string, unknown>): Promise<ResolvedDateRange> {
  if (!context.timeZone) {
    try {
      await getAccountInfo(context);
    } catch {
      // Fall back to UTC dates; the range is still reported explicitly.
    }
  }
  return resolveDateRange(args, context.timeZone);
}

// ---------------------------------------------------------------------------
// Campaign resolution
// ---------------------------------------------------------------------------

export interface CampaignRef {
  id: string;
  name: string;
  status: string;
  channel: string;
  subType?: string;
}

async function campaignIndex(context: GoogleAdsContext, fresh = false): Promise<CampaignRef[]> {
  const rows = await runGaql(
    context,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            campaign.advertising_channel_sub_type
     FROM campaign WHERE campaign.status != 'REMOVED'`,
    fresh ? { cacheTtlMs: 0 } : {}
  );
  return rows.map((row) => ({
    id: cleanId(row.campaign?.id),
    name: String(row.campaign?.name || ''),
    status: String(row.campaign?.status || ''),
    channel: String(row.campaign?.advertisingChannelType || ''),
    subType: row.campaign?.advertisingChannelSubType || undefined,
  }));
}

function normalizeName(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Resolve a campaign by canonical ID (preferred) or by name. Name matching is
 * exact first, then partial; more than one partial match is ambiguous and the
 * candidates are returned so the agent can ask instead of guessing.
 */
export async function resolveCampaign(
  context: GoogleAdsContext,
  args: { campaignId?: unknown; campaignName?: unknown },
  options: { fresh?: boolean } = {}
): Promise<CampaignRef> {
  const index = await campaignIndex(context, options.fresh);
  const id = cleanId(args.campaignId);
  if (id) {
    const match = index.find((campaign) => campaign.id === id);
    if (match) return match;
    const name = typeof args.campaignName === 'string' ? args.campaignName : '';
    throw notFound(
      `Campaign ${id}`,
      name ? similarCampaigns(index, name) : undefined
    );
  }
  const rawName = typeof args.campaignName === 'string' ? args.campaignName.trim() : '';
  if (!rawName) throw invalidArgument('A campaignId (or campaignName) is required.');
  const needle = normalizeName(rawName);
  const exact = index.filter((campaign) => normalizeName(campaign.name) === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw ambiguous('campaign', exact.map(candidate));
  const partial = index.filter((campaign) => normalizeName(campaign.name).includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw ambiguous('campaign', partial.slice(0, 8).map(candidate));
  throw notFound(`Campaign "${rawName}"`, similarCampaigns(index, rawName));
}

function candidate(campaign: CampaignRef) {
  return { id: campaign.id, name: campaign.name, status: campaign.status, channel: campaign.channel };
}

function similarCampaigns(index: CampaignRef[], name: string) {
  const tokens = normalizeName(name).split(' ').filter((token) => token.length > 2);
  if (!tokens.length) return undefined;
  const scored = index
    .map((campaign) => {
      const target = normalizeName(campaign.name);
      return { campaign, score: tokens.filter((token) => target.includes(token)).length };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry) => candidate(entry.campaign));
  return scored.length ? scored : undefined;
}

// ---------------------------------------------------------------------------
// list_campaigns
// ---------------------------------------------------------------------------

export async function listCampaigns(context: GoogleAdsContext, args: Record<string, unknown>) {
  const range = await rangeFor(context, args);
  const status = typeof args.status === 'string' ? args.status : 'ALL';
  const statusFilter = status === 'ENABLED' || status === 'PAUSED' ? ` AND campaign.status = '${status}'` : '';

  const [attributes, metrics] = await Promise.all([
    runGaql(
      context,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.primary_status,
              campaign.advertising_channel_type, campaign.advertising_channel_sub_type,
              campaign.bidding_strategy_type, campaign_budget.amount_micros,
              campaign_budget.explicitly_shared
       FROM campaign WHERE campaign.status != 'REMOVED'${statusFilter}`
    ),
    runGaql(
      context,
      `SELECT campaign.id, ${METRIC_FIELDS}, metrics.search_impression_share,
              metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share
       FROM campaign WHERE campaign.status != 'REMOVED'${statusFilter} AND ${dateFilter(range)}`
    ),
  ]);

  const byId = new Map<string, RawMetrics>();
  for (const row of metrics) byId.set(cleanId(row.campaign?.id), row.metrics || {});

  const needle = typeof args.nameContains === 'string' ? normalizeName(args.nameContains) : '';
  const accountTotals = emptyTotals();
  let campaigns = attributes.map((row) => {
    const raw = byId.get(cleanId(row.campaign?.id));
    const totals = addRaw(emptyTotals(), raw);
    return {
      id: cleanId(row.campaign?.id),
      name: String(row.campaign?.name || ''),
      status: String(row.campaign?.status || ''),
      primaryStatus: row.campaign?.primaryStatus || undefined,
      channel: String(row.campaign?.advertisingChannelType || ''),
      subType: row.campaign?.advertisingChannelSubType || undefined,
      bidding: row.campaign?.biddingStrategyType || undefined,
      dailyBudget: round(micros(row.campaignBudget?.amountMicros)),
      sharedBudget: row.campaignBudget?.explicitlyShared ? true : undefined,
      metrics: finalizeMetrics(totals),
      searchImpressionShare: share(raw?.searchImpressionShare) ?? undefined,
      lostToBudget: share(raw?.searchBudgetLostImpressionShare) ?? undefined,
      lostToRank: share(raw?.searchRankLostImpressionShare) ?? undefined,
      _totals: totals,
    };
  });

  if (needle) campaigns = campaigns.filter((campaign) => normalizeName(campaign.name).includes(needle));
  for (const campaign of campaigns) {
    accountTotals.impressions += campaign._totals.impressions;
    accountTotals.clicks += campaign._totals.clicks;
    accountTotals.cost += campaign._totals.cost;
    accountTotals.conversions += campaign._totals.conversions;
    accountTotals.conversionValue += campaign._totals.conversionValue;
  }

  campaigns.sort((left, right) => right.metrics.cost - left.metrics.cost || left.name.localeCompare(right.name));
  const limit = clampLimit(args.limit, 50, 200);
  const shown = campaigns.slice(0, limit).map(({ _totals, ...campaign }) => campaign);

  return {
    currency: context.currency,
    dateRange: rangeInfo(range),
    totalCampaigns: campaigns.length,
    ...(campaigns.length > shown.length ? { omitted: campaigns.length - shown.length } : {}),
    totals: finalizeMetrics(accountTotals),
    campaigns: shown,
  };
}

// ---------------------------------------------------------------------------
// get_performance
// ---------------------------------------------------------------------------

type Level = 'account' | 'campaign' | 'ad_group' | 'keyword';
type Breakdown = 'none' | 'day' | 'device' | 'network';

const LEVEL_SOURCES: Record<Level, { from: string; idFields: string[] }> = {
  account: { from: 'customer', idFields: [] },
  campaign: { from: 'campaign', idFields: ['campaign.id', 'campaign.name'] },
  ad_group: { from: 'ad_group', idFields: ['campaign.id', 'campaign.name', 'ad_group.id', 'ad_group.name'] },
  keyword: {
    from: 'keyword_view',
    idFields: [
      'campaign.id',
      'ad_group.id',
      'ad_group.name',
      'ad_group_criterion.criterion_id',
      'ad_group_criterion.keyword.text',
      'ad_group_criterion.keyword.match_type',
    ],
  },
};

const BREAKDOWN_FIELDS: Record<Breakdown, string | undefined> = {
  none: undefined,
  day: 'segments.date',
  device: 'segments.device',
  network: 'segments.ad_network_type',
};

function entityKey(level: Level, row: Record<string, any>): { key: string; entity: Record<string, unknown> } {
  switch (level) {
    case 'campaign':
      return {
        key: cleanId(row.campaign?.id),
        entity: { campaignId: cleanId(row.campaign?.id), campaignName: row.campaign?.name },
      };
    case 'ad_group':
      return {
        key: cleanId(row.adGroup?.id),
        entity: {
          campaignId: cleanId(row.campaign?.id),
          campaignName: row.campaign?.name,
          adGroupId: cleanId(row.adGroup?.id),
          adGroupName: row.adGroup?.name,
        },
      };
    case 'keyword':
      return {
        key: `${cleanId(row.adGroup?.id)}~${cleanId(row.adGroupCriterion?.criterionId)}`,
        entity: {
          campaignId: cleanId(row.campaign?.id),
          adGroupId: cleanId(row.adGroup?.id),
          adGroupName: row.adGroup?.name,
          criterionId: cleanId(row.adGroupCriterion?.criterionId),
          keyword: row.adGroupCriterion?.keyword?.text,
          matchType: row.adGroupCriterion?.keyword?.matchType,
        },
      };
    default:
      return { key: 'account', entity: {} };
  }
}

function segmentValue(breakdown: Breakdown, row: Record<string, any>): string | undefined {
  if (breakdown === 'day') return row.segments?.date;
  if (breakdown === 'device') return row.segments?.device;
  if (breakdown === 'network') return row.segments?.adNetworkType;
  return undefined;
}

async function aggregate(
  context: GoogleAdsContext,
  level: Level,
  breakdown: Breakdown,
  range: ResolvedDateRange,
  filters: string[]
) {
  const source = LEVEL_SOURCES[level];
  const segmentField = BREAKDOWN_FIELDS[breakdown];
  const fields = [...source.idFields, ...(segmentField ? [segmentField] : []), METRIC_FIELDS].join(', ');
  const where = [dateFilter(range), ...filters].join(' AND ');
  const rows = await runGaql(context, `SELECT ${fields} FROM ${source.from} WHERE ${where}`);

  const groups = new Map<string, { entity: Record<string, unknown>; segment?: string; totals: Totals }>();
  const overall = emptyTotals();
  for (const row of rows) {
    const { key, entity } = entityKey(level, row);
    const segment = segmentValue(breakdown, row);
    const groupKey = `${key}|${segment || ''}`;
    const group = groups.get(groupKey) || { entity, segment, totals: emptyTotals() };
    addRaw(group.totals, row.metrics);
    addRaw(overall, row.metrics);
    groups.set(groupKey, group);
  }
  return { groups: [...groups.values()], overall };
}

export async function getPerformance(context: GoogleAdsContext, args: Record<string, unknown>) {
  const level = (typeof args.level === 'string' ? args.level : 'account') as Level;
  if (!LEVEL_SOURCES[level]) throw invalidArgument(`Unsupported level "${String(args.level)}".`);
  const breakdown = (typeof args.breakdown === 'string' ? args.breakdown : 'none') as Breakdown;
  if (!(breakdown in BREAKDOWN_FIELDS)) throw invalidArgument(`Unsupported breakdown "${String(args.breakdown)}".`);

  const filters: string[] = [];
  let scope: Record<string, unknown> = { level };
  if (args.campaignId !== undefined || args.campaignName !== undefined) {
    const campaign = await resolveCampaign(context, args);
    filters.push(`campaign.id = ${campaign.id}`);
    scope = { ...scope, campaignId: campaign.id, campaignName: campaign.name };
  }
  if (args.adGroupId !== undefined) {
    const adGroupId = cleanId(args.adGroupId);
    if (!adGroupId) throw invalidArgument('adGroupId must be a numeric ID.');
    filters.push(`ad_group.id = ${adGroupId}`);
    scope = { ...scope, adGroupId };
  }
  if (level === 'keyword') filters.push(`ad_group_criterion.status != 'REMOVED'`);
  if (level !== 'account') filters.push(`campaign.status != 'REMOVED'`);

  const range = await rangeFor(context, args);
  const current = await aggregate(context, level, breakdown, range, filters);
  const totals = finalizeMetrics(current.overall);

  const limit = clampLimit(args.limit, breakdown === 'day' ? 92 : 25, breakdown === 'day' ? 120 : 100);
  const rows = current.groups
    .map((group) => ({ ...group.entity, ...(group.segment ? { segment: group.segment } : {}), metrics: finalizeMetrics(group.totals) }))
    .sort((left, right) =>
      breakdown === 'day'
        ? String(left.segment).localeCompare(String(right.segment))
        : right.metrics.cost - left.metrics.cost
    );

  const result: Record<string, unknown> = {
    currency: context.currency,
    scope,
    dateRange: rangeInfo(range),
    totals,
  };

  if (level !== 'account' || breakdown !== 'none') {
    result.rows = rows.slice(0, limit);
    result.rowCount = rows.length;
    if (rows.length > limit) result.omitted = rows.length - limit;
  }

  if (args.compareToPrevious === true) {
    const prior = previousPeriod(range);
    const previous = await aggregate(context, level, 'none', prior, filters);
    const previousTotals = finalizeMetrics(previous.overall);
    result.comparison = {
      previousRange: rangeInfo(prior),
      previousTotals,
      changePercent: compareMetrics(totals, previousTotals),
    };
    if (level !== 'account' && breakdown === 'none') {
      const prevByKey = new Map<string, Metrics>();
      for (const group of previous.groups) {
        prevByKey.set(JSON.stringify(group.entity), finalizeMetrics(group.totals));
      }
      result.rows = (result.rows as Array<Record<string, any>>).map((row) => {
        const { metrics, segment, ...entity } = row;
        const before = prevByKey.get(JSON.stringify(entity));
        return before
          ? { ...row, previous: { cost: before.cost, conversions: before.conversions, cpa: before.cpa, roas: before.roas } }
          : row;
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// get_campaign_details
// ---------------------------------------------------------------------------

export interface CampaignState {
  campaignId: string;
  resourceName: string;
  name: string;
  status: string;
  primaryStatus?: string;
  primaryStatusReasons?: string[];
  servingStatus?: string;
  channel: string;
  subType?: string;
  biddingStrategyType?: string;
  portfolioBiddingStrategy?: string;
  targetCpa?: number;
  targetRoas?: number;
  maxCpcCeiling?: number;
  startDate?: string;
  endDate?: string;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  network?: {
    googleSearch?: boolean;
    searchPartners?: boolean;
    display?: boolean;
    partnerSearch?: boolean;
  };
  budget?: {
    resourceName: string;
    dailyAmount?: number;
    shared: boolean;
    campaignsUsingBudget?: number;
    deliveryMethod?: string;
  };
  app?: { appId?: string; appStore?: string; biddingGoal?: string };
  selectiveOptimizationActions?: string[];
}

function datePart(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  return value.slice(0, 10);
}

export async function readCampaignState(
  context: GoogleAdsContext,
  campaignId: string,
  options: { fresh?: boolean } = {}
): Promise<CampaignState | undefined> {
  const id = cleanId(campaignId);
  if (!id) throw invalidArgument('A numeric campaignId is required.');
  const rows = await runGaql(
    context,
    `SELECT campaign.id, campaign.resource_name, campaign.name, campaign.status,
            campaign.primary_status, campaign.primary_status_reasons, campaign.serving_status,
            campaign.advertising_channel_type, campaign.advertising_channel_sub_type,
            campaign.bidding_strategy_type, campaign.bidding_strategy,
            campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas,
            campaign.maximize_conversions.target_cpa_micros,
            campaign.maximize_conversion_value.target_roas,
            campaign.target_spend.cpc_bid_ceiling_micros,
            campaign.start_date_time, campaign.end_date_time,
            campaign.tracking_url_template, campaign.final_url_suffix,
            campaign.network_settings.target_google_search,
            campaign.network_settings.target_search_network,
            campaign.network_settings.target_content_network,
            campaign.network_settings.target_partner_search_network,
            campaign.app_campaign_setting.app_id, campaign.app_campaign_setting.app_store,
            campaign.app_campaign_setting.bidding_strategy_goal_type,
            campaign.selective_optimization.conversion_actions,
            campaign.campaign_budget, campaign_budget.amount_micros,
            campaign_budget.explicitly_shared, campaign_budget.reference_count,
            campaign_budget.delivery_method
     FROM campaign WHERE campaign.id = ${id} LIMIT 1`,
    { cacheTtlMs: options.fresh ? 0 : 15_000 }
  );
  const row = rows[0];
  if (!row) return undefined;
  const campaign = row.campaign || {};
  const budget = row.campaignBudget || {};
  const network = campaign.networkSettings || {};
  const app = campaign.appCampaignSetting;
  const targetCpa = micros(campaign.maximizeConversions?.targetCpaMicros) ?? micros(campaign.targetCpa?.targetCpaMicros);
  const targetRoas = campaign.maximizeConversionValue?.targetRoas ?? campaign.targetRoas?.targetRoas;

  return {
    campaignId: cleanId(campaign.id || id),
    resourceName: String(campaign.resourceName || ''),
    name: String(campaign.name || ''),
    status: String(campaign.status || ''),
    primaryStatus: campaign.primaryStatus || undefined,
    primaryStatusReasons: Array.isArray(campaign.primaryStatusReasons) && campaign.primaryStatusReasons.length
      ? campaign.primaryStatusReasons
      : undefined,
    servingStatus: campaign.servingStatus || undefined,
    channel: String(campaign.advertisingChannelType || ''),
    subType: campaign.advertisingChannelSubType || undefined,
    biddingStrategyType: campaign.biddingStrategyType || undefined,
    portfolioBiddingStrategy: campaign.biddingStrategy || undefined,
    targetCpa: round(targetCpa),
    targetRoas: typeof targetRoas === 'number' ? round(targetRoas) : undefined,
    maxCpcCeiling: round(micros(campaign.targetSpend?.cpcBidCeilingMicros)),
    startDate: datePart(campaign.startDateTime),
    endDate: datePart(campaign.endDateTime),
    trackingUrlTemplate: campaign.trackingUrlTemplate || undefined,
    finalUrlSuffix: campaign.finalUrlSuffix || undefined,
    network:
      campaign.networkSettings !== undefined
        ? {
            googleSearch: network.targetGoogleSearch,
            searchPartners: network.targetSearchNetwork,
            display: network.targetContentNetwork,
            partnerSearch: network.targetPartnerSearchNetwork,
          }
        : undefined,
    budget: campaign.campaignBudget
      ? {
          resourceName: String(campaign.campaignBudget),
          dailyAmount: round(micros(budget.amountMicros)),
          shared: Boolean(budget.explicitlyShared),
          campaignsUsingBudget: budget.referenceCount !== undefined ? Number(budget.referenceCount) : undefined,
          deliveryMethod: budget.deliveryMethod || undefined,
        }
      : undefined,
    app: app ? { appId: app.appId, appStore: app.appStore, biddingGoal: app.biddingStrategyGoalType } : undefined,
    selectiveOptimizationActions: Array.isArray(campaign.selectiveOptimization?.conversionActions)
      ? campaign.selectiveOptimization.conversionActions
      : undefined,
  };
}

export async function getCampaignDetails(context: GoogleAdsContext, args: Record<string, unknown>) {
  const ref = await resolveCampaign(context, args);
  const state = await readCampaignState(context, ref.id);
  if (!state) throw notFound(`Campaign ${ref.id}`);
  const { resourceName, ...visible } = state;
  return {
    currency: context.currency,
    campaign: {
      ...visible,
      budget: visible.budget
        ? { ...visible.budget, resourceName: undefined, budgetId: cleanId(visible.budget.resourceName.split('/').pop()) }
        : undefined,
    },
    notes: biddingNotes(state),
  };
}

function biddingNotes(state: CampaignState): string[] {
  const notes: string[] = [];
  const bidding = String(state.biddingStrategyType || '');
  if (bidding === 'MANUAL_CPC') {
    notes.push('Manual CPC: max CPC bids are set on ad groups and keywords, not on the campaign.');
  }
  if (bidding === 'TARGET_SPEND') {
    notes.push('TARGET_SPEND is the API name for Maximize clicks; maxCpcCeiling is its optional max CPC bid limit.');
  }
  if (state.budget?.shared) {
    notes.push(
      `This campaign uses a shared budget (used by ${state.budget.campaignsUsingBudget ?? 'several'} campaigns); changing it affects all of them.`
    );
  }
  if (state.portfolioBiddingStrategy) {
    notes.push('This campaign uses a portfolio bidding strategy shared with other campaigns.');
  }
  if (state.channel === 'MULTI_CHANNEL') {
    notes.push('App campaign: bidding is driven by the app bidding goal and target CPA/ROAS, not by CPC bids.');
  }
  return notes;
}

// ---------------------------------------------------------------------------
// get_conversion_setup
// ---------------------------------------------------------------------------

export interface ConversionActionInfo {
  id: string;
  resourceName: string;
  name: string;
  category: string;
  type: string;
  origin: string;
  status: string;
  primaryForGoal: boolean;
  includeInConversions?: boolean;
  appId?: string;
}

export async function listConversionActions(
  context: GoogleAdsContext,
  options: { fresh?: boolean } = {}
): Promise<ConversionActionInfo[]> {
  const rows = await runGaql(
    context,
    `SELECT conversion_action.id, conversion_action.resource_name, conversion_action.name,
            conversion_action.category, conversion_action.type, conversion_action.origin,
            conversion_action.status, conversion_action.primary_for_goal,
            conversion_action.include_in_conversions_metric, conversion_action.app_id
     FROM conversion_action WHERE conversion_action.status != 'REMOVED'`,
    options.fresh ? { cacheTtlMs: 0 } : {}
  );
  return rows.map((row) => {
    const action = row.conversionAction || {};
    return {
      id: cleanId(action.id),
      resourceName: String(action.resourceName || ''),
      name: String(action.name || ''),
      category: String(action.category || ''),
      type: String(action.type || ''),
      origin: String(action.origin || ''),
      status: String(action.status || ''),
      primaryForGoal: Boolean(action.primaryForGoal),
      includeInConversions: action.includeInConversionsMetric,
      appId: action.appId || undefined,
    };
  });
}

export interface CampaignGoalState {
  goalConfigLevel?: string;
  customGoal?: { id: string; resourceName: string; name?: string; status?: string; conversionActions: string[] };
  goals: Array<{ category: string; origin: string; biddable: boolean }>;
}

export async function readCampaignGoals(
  context: GoogleAdsContext,
  campaignId: string,
  options: { fresh?: boolean } = {}
): Promise<CampaignGoalState> {
  const ttl = options.fresh ? { cacheTtlMs: 0 } : {};
  const id = cleanId(campaignId);
  const [goalRows, configRows] = await Promise.all([
    runGaql(
      context,
      `SELECT campaign_conversion_goal.category, campaign_conversion_goal.origin,
              campaign_conversion_goal.biddable
       FROM campaign_conversion_goal WHERE campaign.id = ${id}`,
      ttl
    ),
    runGaql(
      context,
      `SELECT conversion_goal_campaign_config.goal_config_level,
              conversion_goal_campaign_config.custom_conversion_goal
       FROM conversion_goal_campaign_config WHERE campaign.id = ${id}`,
      ttl
    ),
  ]);
  const config = configRows[0]?.conversionGoalCampaignConfig || {};
  const customGoalResource: string | undefined = config.customConversionGoal || undefined;
  let customGoal: CampaignGoalState['customGoal'];
  if (customGoalResource) {
    const goalId = cleanId(customGoalResource.split('/').pop());
    const customRows = await runGaql(
      context,
      `SELECT custom_conversion_goal.id, custom_conversion_goal.resource_name, custom_conversion_goal.name,
              custom_conversion_goal.status, custom_conversion_goal.conversion_actions
       FROM custom_conversion_goal WHERE custom_conversion_goal.id = ${goalId}`,
      ttl
    );
    const goal = customRows[0]?.customConversionGoal;
    customGoal = {
      id: goalId,
      resourceName: customGoalResource,
      name: goal?.name,
      status: goal?.status,
      conversionActions: Array.isArray(goal?.conversionActions) ? goal.conversionActions : [],
    };
  }
  return {
    goalConfigLevel: config.goalConfigLevel || undefined,
    customGoal,
    goals: goalRows.map((row) => ({
      category: String(row.campaignConversionGoal?.category || ''),
      origin: String(row.campaignConversionGoal?.origin || ''),
      biddable: Boolean(row.campaignConversionGoal?.biddable),
    })),
  };
}

export async function listCustomConversionGoals(context: GoogleAdsContext, options: { fresh?: boolean } = {}) {
  const rows = await runGaql(
    context,
    `SELECT custom_conversion_goal.id, custom_conversion_goal.resource_name, custom_conversion_goal.name,
            custom_conversion_goal.status, custom_conversion_goal.conversion_actions
     FROM custom_conversion_goal WHERE custom_conversion_goal.status = 'ENABLED'`,
    options.fresh ? { cacheTtlMs: 0 } : {}
  );
  return rows.map((row) => ({
    id: cleanId(row.customConversionGoal?.id),
    resourceName: String(row.customConversionGoal?.resourceName || ''),
    name: String(row.customConversionGoal?.name || ''),
    conversionActions: Array.isArray(row.customConversionGoal?.conversionActions)
      ? (row.customConversionGoal.conversionActions as string[])
      : [],
  }));
}

export async function getConversionSetup(context: GoogleAdsContext, args: Record<string, unknown>) {
  const actions = await listConversionActions(context);
  const actionName = new Map(actions.map((action) => [action.resourceName, action.name]));
  const describeActions = (resources: string[]) =>
    resources.map((resource) => ({
      conversionActionId: cleanId(resource.split('/').pop()),
      name: actionName.get(resource) || 'unknown or not in this account',
    }));

  const result: Record<string, unknown> = {
    conversionActions: actions.map(({ resourceName, ...action }) => action),
    explanation: [
      'Account level: conversion actions are what can be counted. primaryForGoal=true actions feed account goals used for bidding by default.',
      'Campaign level: campaign goals are category+origin pairs; biddable=true means the campaign bids toward that whole category, not one specific action.',
      'Specific actions only: non-app campaigns use a custom conversion goal (goalConfigLevel CAMPAIGN); App campaigns use selective optimization.',
    ],
  };

  if (args.campaignId !== undefined || args.campaignName !== undefined) {
    const ref = await resolveCampaign(context, args);
    const [goals, state] = await Promise.all([readCampaignGoals(context, ref.id), readCampaignState(context, ref.id)]);
    result.campaign = {
      campaignId: ref.id,
      name: ref.name,
      channel: ref.channel,
      subType: ref.subType,
      goalConfigLevel: goals.goalConfigLevel || 'CUSTOMER',
      campaignGoals: goals.goals,
      customGoal: goals.customGoal
        ? { id: goals.customGoal.id, name: goals.customGoal.name, actions: describeActions(goals.customGoal.conversionActions) }
        : null,
      appSelectiveOptimization:
        ref.channel === 'MULTI_CHANNEL' ? describeActions(state?.selectiveOptimizationActions || []) : undefined,
      appBiddingGoal: state?.app?.biddingGoal,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// list_ad_groups
// ---------------------------------------------------------------------------

export async function listAdGroups(context: GoogleAdsContext, args: Record<string, unknown>) {
  const campaign = await resolveCampaign(context, args);
  const range = await rangeFor(context, args);
  const [attributes, metrics] = await Promise.all([
    runGaql(
      context,
      `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros,
              ad_group.effective_target_cpa_micros
       FROM ad_group WHERE campaign.id = ${campaign.id} AND ad_group.status != 'REMOVED'`
    ),
    runGaql(
      context,
      `SELECT ad_group.id, ${METRIC_FIELDS}
       FROM ad_group WHERE campaign.id = ${campaign.id} AND ad_group.status != 'REMOVED' AND ${dateFilter(range)}`
    ),
  ]);
  const byId = new Map<string, RawMetrics>();
  for (const row of metrics) byId.set(cleanId(row.adGroup?.id), row.metrics || {});
  const adGroups = attributes
    .map((row) => ({
      adGroupId: cleanId(row.adGroup?.id),
      name: String(row.adGroup?.name || ''),
      status: String(row.adGroup?.status || ''),
      type: row.adGroup?.type || undefined,
      defaultMaxCpc: round(micros(row.adGroup?.cpcBidMicros)),
      targetCpa: round(micros(row.adGroup?.effectiveTargetCpaMicros)),
      metrics: finalizeMetrics(addRaw(emptyTotals(), byId.get(cleanId(row.adGroup?.id)))),
    }))
    .sort((left, right) => right.metrics.cost - left.metrics.cost);
  const limit = clampLimit(args.limit, 50, 200);
  return {
    currency: context.currency,
    campaign: { campaignId: campaign.id, name: campaign.name },
    dateRange: rangeInfo(range),
    totalAdGroups: adGroups.length,
    ...(adGroups.length > limit ? { omitted: adGroups.length - limit } : {}),
    adGroups: adGroups.slice(0, limit),
  };
}

// ---------------------------------------------------------------------------
// list_keywords
// ---------------------------------------------------------------------------

export async function listKeywords(context: GoogleAdsContext, args: Record<string, unknown>) {
  const filters = [`ad_group_criterion.type = 'KEYWORD'`, `ad_group_criterion.negative = FALSE`, `ad_group_criterion.status != 'REMOVED'`, `campaign.status != 'REMOVED'`];
  let scope: Record<string, unknown> = {};
  if (args.campaignId !== undefined || args.campaignName !== undefined) {
    const campaign = await resolveCampaign(context, args);
    filters.push(`campaign.id = ${campaign.id}`);
    scope = { campaignId: campaign.id, campaignName: campaign.name };
  }
  if (args.adGroupId !== undefined) {
    const adGroupId = cleanId(args.adGroupId);
    if (!adGroupId) throw invalidArgument('adGroupId must be a numeric ID.');
    filters.push(`ad_group.id = ${adGroupId}`);
    scope = { ...scope, adGroupId };
  }
  if (args.status === 'ENABLED' || args.status === 'PAUSED') {
    filters.push(`ad_group_criterion.status = '${args.status}'`);
  }
  const range = await rangeFor(context, args);
  const where = filters.join(' AND ');
  const [attributes, metrics] = await Promise.all([
    runGaql(
      context,
      `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.criterion_id,
              ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
              ad_group_criterion.status, ad_group_criterion.cpc_bid_micros,
              ad_group_criterion.effective_cpc_bid_micros, ad_group_criterion.quality_info.quality_score
       FROM ad_group_criterion WHERE ${where}`
    ),
    runGaql(
      context,
      `SELECT ad_group.id, ad_group_criterion.criterion_id, ${METRIC_FIELDS}
       FROM keyword_view WHERE ${where} AND ${dateFilter(range)}`
    ),
  ]);
  const byKey = new Map<string, RawMetrics>();
  for (const row of metrics) {
    byKey.set(`${cleanId(row.adGroup?.id)}~${cleanId(row.adGroupCriterion?.criterionId)}`, row.metrics || {});
  }
  let keywords = attributes.map((row) => {
    const key = `${cleanId(row.adGroup?.id)}~${cleanId(row.adGroupCriterion?.criterionId)}`;
    return {
      campaignId: cleanId(row.campaign?.id),
      campaignName: row.campaign?.name,
      adGroupId: cleanId(row.adGroup?.id),
      adGroupName: row.adGroup?.name,
      criterionId: cleanId(row.adGroupCriterion?.criterionId),
      keyword: String(row.adGroupCriterion?.keyword?.text || ''),
      matchType: row.adGroupCriterion?.keyword?.matchType,
      status: row.adGroupCriterion?.status,
      maxCpc: round(micros(row.adGroupCriterion?.cpcBidMicros)),
      effectiveMaxCpc: round(micros(row.adGroupCriterion?.effectiveCpcBidMicros)),
      qualityScore: row.adGroupCriterion?.qualityInfo?.qualityScore ?? null,
      metrics: finalizeMetrics(addRaw(emptyTotals(), byKey.get(key))),
    };
  });
  const minCost = Number(args.minCost);
  if (Number.isFinite(minCost) && minCost > 0) keywords = keywords.filter((keyword) => keyword.metrics.cost >= minCost);
  if (args.filter === 'NON_CONVERTING') keywords = keywords.filter((keyword) => keyword.metrics.conversions === 0 && keyword.metrics.cost > 0);
  if (args.filter === 'LOW_QUALITY') keywords = keywords.filter((keyword) => typeof keyword.qualityScore === 'number' && keyword.qualityScore <= 4);
  keywords.sort((left, right) => right.metrics.cost - left.metrics.cost || left.keyword.localeCompare(right.keyword));
  const limit = clampLimit(args.limit, 30, 150);
  return {
    currency: context.currency,
    scope,
    dateRange: rangeInfo(range),
    totalKeywords: keywords.length,
    ...(keywords.length > limit ? { omitted: keywords.length - limit } : {}),
    keywords: keywords.slice(0, limit),
  };
}

// ---------------------------------------------------------------------------
// get_search_terms
// ---------------------------------------------------------------------------

export async function getSearchTerms(context: GoogleAdsContext, args: Record<string, unknown>) {
  const filters = [`campaign.status != 'REMOVED'`];
  let scope: Record<string, unknown> = {};
  if (args.campaignId !== undefined || args.campaignName !== undefined) {
    const campaign = await resolveCampaign(context, args);
    filters.push(`campaign.id = ${campaign.id}`);
    scope = { campaignId: campaign.id, campaignName: campaign.name };
  }
  if (args.adGroupId !== undefined) {
    const adGroupId = cleanId(args.adGroupId);
    if (!adGroupId) throw invalidArgument('adGroupId must be a numeric ID.');
    filters.push(`ad_group.id = ${adGroupId}`);
    scope = { ...scope, adGroupId };
  }
  if (typeof args.contains === 'string' && args.contains.trim()) {
    filters.push(`search_term_view.search_term LIKE ${gaqlString(`%${args.contains.trim()}%`)}`);
  }
  const range = await rangeFor(context, args);
  const rows = await runGaql(
    context,
    `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, search_term_view.search_term,
            search_term_view.status, ${METRIC_FIELDS}
     FROM search_term_view WHERE ${[...filters, dateFilter(range)].join(' AND ')}`
  );

  const grouped = new Map<string, { row: Record<string, any>; totals: Totals }>();
  for (const row of rows) {
    const key = `${cleanId(row.adGroup?.id)}|${row.searchTermView?.searchTerm}`;
    const entry = grouped.get(key) || { row, totals: emptyTotals() };
    addRaw(entry.totals, row.metrics);
    grouped.set(key, entry);
  }

  let terms = [...grouped.values()].map(({ row, totals }) => ({
    searchTerm: String(row.searchTermView?.searchTerm || ''),
    status: row.searchTermView?.status,
    campaignId: cleanId(row.campaign?.id),
    campaignName: row.campaign?.name,
    adGroupId: cleanId(row.adGroup?.id),
    adGroupName: row.adGroup?.name,
    metrics: finalizeMetrics(totals),
  }));

  const filter = typeof args.filter === 'string' ? args.filter : 'ALL';
  if (filter === 'NON_CONVERTING') terms = terms.filter((term) => term.metrics.conversions === 0 && term.metrics.cost > 0);
  if (filter === 'CONVERTING') terms = terms.filter((term) => term.metrics.conversions > 0);
  const minCost = Number(args.minCost);
  if (Number.isFinite(minCost) && minCost > 0) terms = terms.filter((term) => term.metrics.cost >= minCost);

  const sortBy = typeof args.sortBy === 'string' ? args.sortBy : 'cost';
  terms.sort((left, right) => {
    if (sortBy === 'conversions') return right.metrics.conversions - left.metrics.conversions;
    if (sortBy === 'clicks') return right.metrics.clicks - left.metrics.clicks;
    return right.metrics.cost - left.metrics.cost;
  });

  const totals = terms.reduce((sum, term) => {
    sum.cost += term.metrics.cost;
    sum.conversions += term.metrics.conversions;
    sum.clicks += term.metrics.clicks;
    return sum;
  }, { cost: 0, conversions: 0, clicks: 0 });

  const limit = clampLimit(args.limit, 30, 150);
  return {
    currency: context.currency,
    scope,
    dateRange: rangeInfo(range),
    filter,
    totalTerms: terms.length,
    totalsForFilteredTerms: { cost: round(totals.cost), conversions: round(totals.conversions), clicks: totals.clicks },
    ...(terms.length > limit ? { omitted: terms.length - limit } : {}),
    searchTerms: terms.slice(0, limit),
    statusMeaning: 'ADDED = already a keyword, EXCLUDED = already a negative, NONE = neither.',
  };
}

// ---------------------------------------------------------------------------
// run_account_diagnostics
// ---------------------------------------------------------------------------

export async function runDiagnostics(context: GoogleAdsContext, args: Record<string, unknown>) {
  const scoped = args.campaignId !== undefined || args.campaignName !== undefined;
  const campaignsResult = await listCampaigns(context, { ...args, limit: 200, status: 'ALL' });
  const allCampaigns = campaignsResult.campaigns;
  let campaigns = allCampaigns;
  let scope: Record<string, unknown> = { level: 'account' };
  if (scoped) {
    const ref = await resolveCampaign(context, args);
    campaigns = allCampaigns.filter((campaign) => campaign.id === ref.id);
    scope = { level: 'campaign', campaignId: ref.id, campaignName: ref.name };
  }

  const [termsResult, keywordsResult] = await Promise.all([
    getSearchTerms(context, { ...args, filter: 'NON_CONVERTING', limit: 15 }),
    listKeywords(context, { ...args, limit: 150 }),
  ]);

  const enabled = campaigns.filter((campaign) => campaign.status === 'ENABLED');
  const totals = campaigns.reduce(
    (sum, campaign) => {
      sum.cost += campaign.metrics.cost;
      sum.conversions += campaign.metrics.conversions;
      sum.value += campaign.metrics.conversionValue;
      return sum;
    },
    { cost: 0, conversions: 0, value: 0 }
  );
  const blendedCpa = totals.conversions > 0 ? totals.cost / totals.conversions : null;

  const findings: Array<Record<string, unknown>> = [];

  for (const campaign of enabled) {
    if (campaign.metrics.cost > 0 && campaign.metrics.conversions === 0) {
      findings.push({
        type: 'campaign_without_conversions',
        severity: campaign.metrics.cost >= (blendedCpa ?? Infinity) ? 'high' : 'medium',
        campaignId: campaign.id,
        campaignName: campaign.name,
        evidence: { cost: campaign.metrics.cost, clicks: campaign.metrics.clicks, conversions: 0 },
      });
    } else if (blendedCpa && campaign.metrics.cpa && campaign.metrics.cpa > blendedCpa * 1.5 && campaign.metrics.conversions >= 2) {
      findings.push({
        type: 'high_cpa_campaign',
        severity: 'medium',
        campaignId: campaign.id,
        campaignName: campaign.name,
        evidence: { cpa: campaign.metrics.cpa, accountCpa: round(blendedCpa), conversions: campaign.metrics.conversions },
      });
    }
    if (typeof campaign.lostToBudget === 'number' && campaign.lostToBudget >= 10 && campaign.metrics.conversions > 0) {
      findings.push({
        type: 'limited_by_budget',
        severity: blendedCpa && campaign.metrics.cpa && campaign.metrics.cpa <= blendedCpa ? 'opportunity' : 'info',
        campaignId: campaign.id,
        campaignName: campaign.name,
        evidence: {
          impressionShareLostToBudgetPercent: campaign.lostToBudget,
          dailyBudget: campaign.dailyBudget,
          cpa: campaign.metrics.cpa,
          accountCpa: blendedCpa ? round(blendedCpa) : null,
        },
      });
    }
  }

  if (termsResult.totalTerms > 0) {
    findings.push({
      type: 'non_converting_search_terms',
      severity: termsResult.totalsForFilteredTerms.cost && blendedCpa && termsResult.totalsForFilteredTerms.cost > blendedCpa ? 'high' : 'medium',
      evidence: {
        terms: termsResult.totalTerms,
        cost: termsResult.totalsForFilteredTerms.cost,
        top: termsResult.searchTerms.slice(0, 10).map((term) => ({
          searchTerm: term.searchTerm,
          cost: term.metrics.cost,
          clicks: term.metrics.clicks,
          campaignId: term.campaignId,
          adGroupId: term.adGroupId,
          status: term.status,
        })),
      },
    });
  }

  const keywords = keywordsResult.keywords;
  const wastedKeywords = keywords.filter(
    (keyword) => keyword.status === 'ENABLED' && keyword.metrics.conversions === 0 && blendedCpa !== null && keyword.metrics.cost >= blendedCpa
  );
  if (wastedKeywords.length) {
    findings.push({
      type: 'keywords_spending_without_conversions',
      severity: 'medium',
      evidence: wastedKeywords.slice(0, 10).map((keyword) => ({
        keyword: keyword.keyword,
        matchType: keyword.matchType,
        cost: keyword.metrics.cost,
        adGroupId: keyword.adGroupId,
        criterionId: keyword.criterionId,
      })),
    });
  }
  const lowQuality = keywords.filter(
    (keyword) => typeof keyword.qualityScore === 'number' && keyword.qualityScore <= 4 && keyword.metrics.cost > 0
  );
  if (lowQuality.length) {
    findings.push({
      type: 'low_quality_score_keywords',
      severity: 'low',
      evidence: lowQuality.slice(0, 10).map((keyword) => ({
        keyword: keyword.keyword,
        qualityScore: keyword.qualityScore,
        cost: keyword.metrics.cost,
        adGroupId: keyword.adGroupId,
        criterionId: keyword.criterionId,
      })),
    });
  }

  return {
    currency: context.currency,
    scope,
    dateRange: campaignsResult.dateRange,
    summary: {
      cost: round(totals.cost),
      conversions: round(totals.conversions),
      cpa: blendedCpa ? round(blendedCpa) : null,
      roas: totals.cost > 0 && totals.value > 0 ? round(totals.value / totals.cost) : null,
      enabledCampaigns: enabled.length,
      campaignsAnalysed: campaigns.length,
      keywordsAnalysed: keywordsResult.totalKeywords,
    },
    findings,
    method:
      'Deterministic checks: zero-conversion spend, CPA above 1.5x account CPA, search impression share lost to budget, non-converting search terms, keywords spending more than one account CPA without converting, quality score <= 4.',
  };
}
