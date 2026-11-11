/**
 * Deterministic in-memory Google Ads backend for integration tests.
 *
 * It answers GAQL `searchStream` queries and applies `:mutate` requests to an
 * in-memory account, so proposal preparation, execution, drift detection and
 * read-back verification run against behaviour that changes when the account
 * changes. Every request is recorded so tests can assert API usage.
 */

export interface FakeMetrics {
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

export interface FakeCampaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  channel: 'SEARCH' | 'MULTI_CHANNEL' | 'DISPLAY' | 'PERFORMANCE_MAX';
  subType?: string;
  bidding: string;
  budgetId: string;
  budgetMicros: number;
  sharedBudget?: boolean;
  metrics: FakeMetrics;
  lostToBudget?: number;
  network?: { targetGoogleSearch: boolean; targetSearchNetwork: boolean; targetContentNetwork: boolean; targetPartnerSearchNetwork: boolean };
  startDateTime?: string;
  endDateTime?: string;
  targetCpaMicros?: number;
  targetRoas?: number;
  cpcCeilingMicros?: number;
  app?: { appId: string; appStore: string; biddingStrategyGoalType: string };
  selective?: string[];
}

export interface FakeAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  cpcBidMicros?: number;
  metrics: FakeMetrics;
}

export interface FakeKeyword {
  adGroupId: string;
  criterionId: string;
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  negative?: boolean;
  cpcBidMicros?: number;
  qualityScore?: number;
  metrics: FakeMetrics;
}

export interface FakeAccount {
  customerId: string;
  name: string;
  currency: string;
  timeZone: string;
  campaigns: FakeCampaign[];
  adGroups: FakeAdGroup[];
  keywords: FakeKeyword[];
  campaignNegatives: Array<{ campaignId: string; criterionId: string; text: string; matchType: string }>;
  searchTerms: Array<{ campaignId: string; adGroupId: string; term: string; status: string; metrics: FakeMetrics }>;
  conversionActions: Array<{ id: string; name: string; category: string; origin: string; type: string; status: string; primaryForGoal: boolean }>;
  campaignGoals: Array<{ campaignId: string; category: string; origin: string; biddable: boolean }>;
  goalConfigs: Record<string, { level: 'CUSTOMER' | 'CAMPAIGN'; customGoal?: string }>;
  customGoals: Array<{ id: string; name: string; actions: string[]; status: string }>;
}

export interface RecordedRequest {
  kind: 'query' | 'mutate';
  url: string;
  query?: string;
  from?: string;
  service?: string;
  body?: any;
  validateOnly?: boolean;
}

export function metrics(cost: number, conversions: number, clicks = Math.round(cost), value = conversions * 40, impressions = clicks * 20): FakeMetrics {
  return { impressions, clicks, costMicros: Math.round(cost * 1_000_000), conversions, conversionsValue: value };
}

export function defaultAccount(): FakeAccount {
  const cid = '1234567890';
  return {
    customerId: cid,
    name: 'Acme Outdoors',
    currency: 'USD',
    timeZone: 'America/New_York',
    campaigns: [
      { id: '111', name: 'Brand - Search', status: 'ENABLED', channel: 'SEARCH', bidding: 'MANUAL_CPC', budgetId: '9111', budgetMicros: 50_000_000, metrics: metrics(900, 60), lostToBudget: 0.32, network: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false, targetPartnerSearchNetwork: false } },
      { id: '222', name: 'Generic - Hiking Boots', status: 'ENABLED', channel: 'SEARCH', bidding: 'MAXIMIZE_CONVERSIONS', budgetId: '9222', budgetMicros: 80_000_000, metrics: metrics(1500, 10), network: { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false, targetPartnerSearchNetwork: false } },
      { id: '333', name: 'Generic - Hiking Boots (Old)', status: 'PAUSED', channel: 'SEARCH', bidding: 'MANUAL_CPC', budgetId: '9333', budgetMicros: 20_000_000, metrics: metrics(0, 0, 0) },
      { id: '444', name: 'Trail App Installs', status: 'ENABLED', channel: 'MULTI_CHANNEL', subType: 'APP_CAMPAIGN', bidding: 'TARGET_CPA', budgetId: '9444', budgetMicros: 30_000_000, metrics: metrics(600, 120), targetCpaMicros: 5_000_000, app: { appId: 'com.acme.trail', appStore: 'GOOGLE_APP_STORE', biddingStrategyGoalType: 'OPTIMIZE_INSTALLS_TARGET_INSTALL_COST' } },
    ],
    adGroups: [
      { id: '5001', campaignId: '111', name: 'Brand Exact', status: 'ENABLED', cpcBidMicros: 1_200_000, metrics: metrics(900, 60) },
      { id: '5002', campaignId: '222', name: 'Boots', status: 'ENABLED', cpcBidMicros: 2_000_000, metrics: metrics(1500, 10) },
    ],
    keywords: [
      { adGroupId: '5001', criterionId: '7001', text: 'acme outdoors', matchType: 'EXACT', status: 'ENABLED', qualityScore: 9, metrics: metrics(900, 60) },
      { adGroupId: '5002', criterionId: '7002', text: 'hiking boots', matchType: 'BROAD', status: 'ENABLED', qualityScore: 3, metrics: metrics(1200, 4) },
      { adGroupId: '5002', criterionId: '7003', text: 'waterproof boots', matchType: 'PHRASE', status: 'ENABLED', qualityScore: 7, metrics: metrics(300, 6) },
    ],
    campaignNegatives: [{ campaignId: '222', criterionId: '8001', text: 'free', matchType: 'BROAD' }],
    searchTerms: [
      { campaignId: '222', adGroupId: '5002', term: 'hiking boots repair', status: 'NONE', metrics: metrics(240, 0) },
      { campaignId: '222', adGroupId: '5002', term: 'cheap hiking boots used', status: 'NONE', metrics: metrics(180, 0) },
      { campaignId: '222', adGroupId: '5002', term: 'best hiking boots women', status: 'NONE', metrics: metrics(400, 7) },
      { campaignId: '111', adGroupId: '5001', term: 'acme outdoors', status: 'ADDED', metrics: metrics(900, 60) },
    ],
    conversionActions: [
      { id: '61', name: 'Website purchase', category: 'PURCHASE', origin: 'WEBSITE', type: 'WEBPAGE', status: 'ENABLED', primaryForGoal: true },
      { id: '62', name: 'Newsletter signup', category: 'SIGNUP', origin: 'WEBSITE', type: 'WEBPAGE', status: 'ENABLED', primaryForGoal: true },
      { id: '63', name: 'Android installs (Google Play)', category: 'DOWNLOAD', origin: 'APP', type: 'GOOGLE_PLAY_DOWNLOAD', status: 'ENABLED', primaryForGoal: true },
      { id: '64', name: 'In-app purchase (Firebase)', category: 'PURCHASE', origin: 'APP', type: 'FIREBASE_ANDROID_CUSTOM', status: 'ENABLED', primaryForGoal: false },
    ],
    campaignGoals: [
      { campaignId: '111', category: 'PURCHASE', origin: 'WEBSITE', biddable: true },
      { campaignId: '111', category: 'SIGNUP', origin: 'WEBSITE', biddable: true },
      { campaignId: '222', category: 'PURCHASE', origin: 'WEBSITE', biddable: true },
      { campaignId: '222', category: 'SIGNUP', origin: 'WEBSITE', biddable: true },
    ],
    goalConfigs: {},
    customGoals: [],
  };
}

const enc = (micros?: number) => (micros === undefined ? undefined : String(micros));

function metricRow(value: FakeMetrics) {
  return {
    impressions: String(value.impressions),
    clicks: String(value.clicks),
    costMicros: String(value.costMicros),
    conversions: value.conversions,
    conversionsValue: value.conversionsValue,
  };
}

function idFilter(query: string, field: string): string | undefined {
  const match = new RegExp(`${field.replace(/\./g, '\\.')}\\s*=\\s*(\\d+)`).exec(query);
  return match?.[1];
}

export function googleAdsErrorBody(code: string, family: string, message: string, fieldPath?: string) {
  return {
    error: {
      code: 400,
      message: 'Request contains an invalid argument.',
      status: 'INVALID_ARGUMENT',
      details: [
        {
          '@type': 'type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure',
          errors: [
            {
              errorCode: { [family]: code },
              message,
              ...(fieldPath ? { location: { fieldPathElements: fieldPath.split('.').map((fieldName) => ({ fieldName })) } } : {}),
            },
          ],
          requestId: 'test-request',
        },
      ],
    },
  };
}

export interface InjectedFailure {
  match: (request: RecordedRequest) => boolean;
  status?: number;
  body: unknown;
  /** Remaining times to fail. */
  times: number;
}

export class FakeGoogleAds {
  account: FakeAccount;
  requests: RecordedRequest[] = [];
  failures: InjectedFailure[] = [];
  /** When set, mutates are accepted but not applied (to test unverified outcomes). */
  dropWrites = false;
  private nextId = 900000;
  private pendingBudget?: { id: string; amount: number };

  constructor(account: FakeAccount = defaultAccount()) {
    this.account = account;
  }

  queries(from?: string) {
    return this.requests.filter((request) => request.kind === 'query' && (!from || request.from === from));
  }

  mutates(includeValidateOnly = false) {
    return this.requests.filter((request) => request.kind === 'mutate' && (includeValidateOnly || !request.validateOnly));
  }

  failNext(match: InjectedFailure['match'], code: string, family = 'fieldError', message = 'Rejected by test.', fieldPath?: string, times = 1) {
    this.failures.push({ match, body: googleAdsErrorBody(code, family, message, fieldPath), times });
  }

  fetch = async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (!url.includes('googleads.googleapis.com')) {
      return new Response(JSON.stringify({ error: 'unexpected external call in test' }), { status: 599 });
    }
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const isQuery = url.endsWith(':searchStream');
    const request: RecordedRequest = isQuery
      ? { kind: 'query', url, query: body.query, from: /FROM\s+(\w+)/i.exec(body.query || '')?.[1] }
      : { kind: 'mutate', url, service: /\/([A-Za-z]+):mutate$/.exec(url)?.[1], body, validateOnly: Boolean(body.validateOnly) };
    this.requests.push(request);

    const failure = this.failures.find((item) => item.times > 0 && item.match(request));
    if (failure) {
      failure.times -= 1;
      return new Response(JSON.stringify(failure.body), { status: failure.status || 400 });
    }

    try {
      if (isQuery) return this.json([{ results: this.query(body.query) }]);
      if (request.validateOnly) return this.json({ results: [] });
      return this.json(this.mutate(request.service || '', body));
    } catch (error) {
      return new Response(
        JSON.stringify(googleAdsErrorBody('INVALID_ARGUMENT', 'requestError', error instanceof Error ? error.message : 'error')),
        { status: 400 }
      );
    }
  };

  private json(value: unknown) {
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  private campaignRow(campaign: FakeCampaign) {
    const cid = this.account.customerId;
    return {
      customer: { id: cid, descriptiveName: this.account.name, currencyCode: this.account.currency, timeZone: this.account.timeZone },
      campaign: {
        id: campaign.id,
        resourceName: `customers/${cid}/campaigns/${campaign.id}`,
        name: campaign.name,
        status: campaign.status,
        primaryStatus: campaign.status === 'ENABLED' ? 'ELIGIBLE' : 'PAUSED',
        advertisingChannelType: campaign.channel,
        advertisingChannelSubType: campaign.subType,
        biddingStrategyType: campaign.bidding,
        campaignBudget: `customers/${cid}/campaignBudgets/${campaign.budgetId}`,
        startDateTime: campaign.startDateTime,
        endDateTime: campaign.endDateTime,
        networkSettings: campaign.network,
        ...(campaign.bidding === 'MAXIMIZE_CONVERSIONS' && campaign.targetCpaMicros ? { maximizeConversions: { targetCpaMicros: enc(campaign.targetCpaMicros) } } : {}),
        ...(campaign.bidding === 'TARGET_CPA' && campaign.targetCpaMicros ? { targetCpa: { targetCpaMicros: enc(campaign.targetCpaMicros) } } : {}),
        ...(campaign.bidding === 'MAXIMIZE_CONVERSION_VALUE' && campaign.targetRoas ? { maximizeConversionValue: { targetRoas: campaign.targetRoas } } : {}),
        ...(campaign.bidding === 'TARGET_SPEND' && campaign.cpcCeilingMicros ? { targetSpend: { cpcBidCeilingMicros: enc(campaign.cpcCeilingMicros) } } : {}),
        ...(campaign.app ? { appCampaignSetting: campaign.app } : {}),
        ...(campaign.selective ? { selectiveOptimization: { conversionActions: campaign.selective } } : {}),
      },
      campaignBudget: {
        amountMicros: String(campaign.budgetMicros),
        explicitlyShared: Boolean(campaign.sharedBudget),
        referenceCount: campaign.sharedBudget ? 3 : 1,
      },
      metrics: {
        ...metricRow(campaign.metrics),
        ...(campaign.lostToBudget !== undefined ? { searchBudgetLostImpressionShare: campaign.lostToBudget, searchImpressionShare: 0.55 } : {}),
      },
    };
  }

  private query(query: string): Array<Record<string, unknown>> {
    const from = /FROM\s+(\w+)/i.exec(query)?.[1];
    const account = this.account;
    const cid = account.customerId;
    const campaignId = idFilter(query, 'campaign.id');
    const adGroupId = idFilter(query, 'ad_group.id');
    const statusMatch = /campaign\.status = '(\w+)'/.exec(query)?.[1];
    const campaignById = (id: string) => account.campaigns.find((campaign) => campaign.id === id);

    switch (from) {
      case 'customer':
        if (/metrics\./.test(query)) {
          const total = account.campaigns.reduce((sum, campaign) => {
            sum.impressions += campaign.metrics.impressions;
            sum.clicks += campaign.metrics.clicks;
            sum.costMicros += campaign.metrics.costMicros;
            sum.conversions += campaign.metrics.conversions;
            sum.conversionsValue += campaign.metrics.conversionsValue;
            return sum;
          }, metrics(0, 0, 0, 0, 0));
          return [{ metrics: metricRow(total) }];
        }
        return [{ customer: { id: cid, descriptiveName: account.name, currencyCode: account.currency, timeZone: account.timeZone, manager: false, testAccount: false } }];
      case 'campaign':
        return account.campaigns
          .filter((campaign) => campaign.status !== 'REMOVED')
          .filter((campaign) => !campaignId || campaign.id === campaignId)
          .filter((campaign) => !statusMatch || campaign.status === statusMatch)
          .map((campaign) => this.campaignRow(campaign));
      case 'ad_group':
        return account.adGroups
          .filter((group) => group.status !== 'REMOVED')
          .filter((group) => !campaignId || group.campaignId === campaignId)
          .filter((group) => !adGroupId || group.id === adGroupId)
          .filter((group) => {
            const name = /ad_group\.name = '([^']+)'/.exec(query)?.[1];
            return !name || group.name === name;
          })
          .map((group) => {
            const campaign = campaignById(group.campaignId)!;
            return {
              campaign: { id: campaign.id, name: campaign.name, biddingStrategyType: campaign.bidding, advertisingChannelType: campaign.channel },
              adGroup: { id: group.id, name: group.name, status: group.status, type: 'SEARCH_STANDARD', cpcBidMicros: enc(group.cpcBidMicros) },
              metrics: metricRow(group.metrics),
            };
          });
      case 'ad_group_criterion':
      case 'keyword_view': {
        const negative = /negative = TRUE/.test(query) ? true : /negative = FALSE/.test(query) ? false : undefined;
        const criterionId = idFilter(query, 'ad_group_criterion.criterion_id');
        return account.keywords
          .filter((keyword) => keyword.status !== 'REMOVED')
          .filter((keyword) => negative === undefined || Boolean(keyword.negative) === negative)
          .filter((keyword) => !adGroupId || keyword.adGroupId === adGroupId)
          .filter((keyword) => !criterionId || keyword.criterionId === criterionId)
          .filter((keyword) => !campaignId || account.adGroups.find((group) => group.id === keyword.adGroupId)?.campaignId === campaignId)
          .map((keyword) => {
            const group = account.adGroups.find((item) => item.id === keyword.adGroupId)!;
            const campaign = campaignById(group.campaignId)!;
            return {
              campaign: { id: campaign.id, name: campaign.name, biddingStrategyType: campaign.bidding },
              adGroup: { id: group.id, name: group.name },
              adGroupCriterion: {
                criterionId: keyword.criterionId,
                status: keyword.status,
                negative: Boolean(keyword.negative),
                keyword: { text: keyword.text, matchType: keyword.matchType },
                cpcBidMicros: enc(keyword.cpcBidMicros),
                effectiveCpcBidMicros: enc(keyword.cpcBidMicros ?? group.cpcBidMicros),
                qualityInfo: keyword.qualityScore ? { qualityScore: keyword.qualityScore } : undefined,
              },
              metrics: metricRow(keyword.metrics),
            };
          });
      }
      case 'campaign_criterion':
        return account.campaignNegatives
          .filter((negative) => !campaignId || negative.campaignId === campaignId)
          .map((negative) => ({
            campaignCriterion: { criterionId: negative.criterionId, keyword: { text: negative.text, matchType: negative.matchType } },
          }));
      case 'search_term_view':
        return account.searchTerms
          .filter((term) => !campaignId || term.campaignId === campaignId)
          .filter((term) => !adGroupId || term.adGroupId === adGroupId)
          .map((term) => {
            const campaign = campaignById(term.campaignId)!;
            const group = account.adGroups.find((item) => item.id === term.adGroupId)!;
            return {
              campaign: { id: campaign.id, name: campaign.name },
              adGroup: { id: group.id, name: group.name },
              searchTermView: { searchTerm: term.term, status: term.status },
              metrics: metricRow(term.metrics),
            };
          });
      case 'conversion_action':
        return account.conversionActions.map((action) => ({
          conversionAction: {
            id: action.id,
            resourceName: `customers/${cid}/conversionActions/${action.id}`,
            name: action.name,
            category: action.category,
            origin: action.origin,
            type: action.type,
            status: action.status,
            primaryForGoal: action.primaryForGoal,
            includeInConversionsMetric: action.primaryForGoal,
          },
        }));
      case 'campaign_conversion_goal':
        return account.campaignGoals
          .filter((goal) => !campaignId || goal.campaignId === campaignId)
          .map((goal) => ({ campaignConversionGoal: { category: goal.category, origin: goal.origin, biddable: goal.biddable } }));
      case 'conversion_goal_campaign_config': {
        const config = account.goalConfigs[campaignId || ''] || { level: 'CUSTOMER' };
        return [{ conversionGoalCampaignConfig: { goalConfigLevel: config.level, customConversionGoal: config.customGoal } }];
      }
      case 'custom_conversion_goal': {
        const goalId = idFilter(query, 'custom_conversion_goal.id');
        return account.customGoals
          .filter((goal) => !goalId || goal.id === goalId)
          .filter((goal) => goal.status === 'ENABLED' || goalId)
          .map((goal) => ({
            customConversionGoal: {
              id: goal.id,
              resourceName: `customers/${cid}/customConversionGoals/${goal.id}`,
              name: goal.name,
              status: goal.status,
              conversionActions: goal.actions,
            },
          }));
      }
      default:
        throw new Error(`Fake does not support FROM ${from}`);
    }
  }

  private idFromResource(resource: string) {
    return resource.split('/').pop() || '';
  }

  private applyCampaignUpdate(update: Record<string, any>) {
    const campaign = this.account.campaigns.find((item) => item.id === this.idFromResource(update.resourceName));
    if (!campaign) throw new Error('campaign not found');
    if (update.status) campaign.status = update.status;
    if (update.name) campaign.name = update.name;
    if (update.networkSettings) campaign.network = { ...(campaign.network || ({} as any)), ...update.networkSettings };
    if (update.startDateTime) campaign.startDateTime = update.startDateTime;
    if (update.endDateTime) campaign.endDateTime = update.endDateTime;
    if (update.manualCpc) campaign.bidding = 'MANUAL_CPC';
    if (update.targetSpend) {
      campaign.bidding = 'TARGET_SPEND';
      campaign.cpcCeilingMicros = update.targetSpend.cpcBidCeilingMicros ? Number(update.targetSpend.cpcBidCeilingMicros) : undefined;
    }
    if (update.maximizeConversions) {
      campaign.bidding = 'MAXIMIZE_CONVERSIONS';
      campaign.targetCpaMicros = update.maximizeConversions.targetCpaMicros ? Number(update.maximizeConversions.targetCpaMicros) : undefined;
    }
    if (update.maximizeConversionValue) {
      campaign.bidding = 'MAXIMIZE_CONVERSION_VALUE';
      campaign.targetRoas = update.maximizeConversionValue.targetRoas;
    }
    if (update.targetCpa) campaign.targetCpaMicros = Number(update.targetCpa.targetCpaMicros);
    if (update.selectiveOptimization) campaign.selective = update.selectiveOptimization.conversionActions;
  }

  private mutateCombined(body: any) {
    const cid = this.account.customerId;
    const temp = new Map<string, string>();
    const real = (name: string) => temp.get(name) || name;
    const responses: Array<Record<string, unknown>> = [];
    for (const operation of body.mutateOperations || []) {
      const [kind, value] = Object.entries(operation)[0] as [string, any];
      if (kind === 'campaignBudgetOperation') {
        const id = String(this.nextId++);
        temp.set(value.create.resourceName, `customers/${cid}/campaignBudgets/${id}`);
        this.pendingBudget = { id, amount: Number(value.create.amountMicros) };
        responses.push({ campaignBudgetResult: { resourceName: `customers/${cid}/campaignBudgets/${id}` } });
      } else if (kind === 'campaignOperation') {
        const create = value.create;
        if (this.account.campaigns.some((item) => item.name === create.name)) throw new Error('DUPLICATE_CAMPAIGN_NAME');
        const id = String(this.nextId++);
        temp.set(create.resourceName, `customers/${cid}/campaigns/${id}`);
        const budget = this.pendingBudget!;
        this.account.campaigns.push({
          id,
          name: create.name,
          status: create.status,
          channel: create.advertisingChannelType,
          subType: create.advertisingChannelSubType,
          bidding: create.manualCpc
            ? 'MANUAL_CPC'
            : create.targetSpend
            ? 'TARGET_SPEND'
            : create.maximizeConversions
            ? 'MAXIMIZE_CONVERSIONS'
            : create.maximizeConversionValue
            ? 'MAXIMIZE_CONVERSION_VALUE'
            : create.targetCpa
            ? 'TARGET_CPA'
            : 'UNKNOWN',
          budgetId: budget.id,
          budgetMicros: budget.amount,
          metrics: metrics(0, 0, 0),
          network: create.networkSettings,
          cpcCeilingMicros: create.targetSpend?.cpcBidCeilingMicros ? Number(create.targetSpend.cpcBidCeilingMicros) : undefined,
          targetCpaMicros: create.maximizeConversions?.targetCpaMicros
            ? Number(create.maximizeConversions.targetCpaMicros)
            : create.targetCpa?.targetCpaMicros
            ? Number(create.targetCpa.targetCpaMicros)
            : undefined,
          app: create.appCampaignSetting,
          selective: create.selectiveOptimization?.conversionActions,
        });
        responses.push({ campaignResult: { resourceName: `customers/${cid}/campaigns/${id}` } });
      } else if (kind === 'adGroupOperation') {
        const create = value.create;
        const id = String(this.nextId++);
        temp.set(create.resourceName, `customers/${cid}/adGroups/${id}`);
        this.account.adGroups.push({
          id,
          campaignId: this.idFromResource(real(create.campaign)),
          name: create.name,
          status: create.status,
          cpcBidMicros: create.cpcBidMicros ? Number(create.cpcBidMicros) : undefined,
          metrics: metrics(0, 0, 0),
        });
        responses.push({ adGroupResult: { resourceName: `customers/${cid}/adGroups/${id}` } });
      } else if (kind === 'adGroupCriterionOperation') {
        const create = value.create;
        const id = String(this.nextId++);
        this.account.keywords.push({
          adGroupId: this.idFromResource(real(create.adGroup)),
          criterionId: id,
          text: create.keyword.text,
          matchType: create.keyword.matchType,
          status: create.status || 'ENABLED',
          negative: Boolean(create.negative),
          metrics: metrics(0, 0, 0),
        });
        responses.push({ adGroupCriterionResult: { resourceName: `customers/${cid}/adGroupCriteria/x~${id}` } });
      } else if (kind === 'adGroupAdOperation') {
        responses.push({ adGroupAdResult: { resourceName: `customers/${cid}/adGroupAds/x~${this.nextId++}` } });
      } else if (kind === 'conversionGoalCampaignConfigOperation') {
        const campaignId = this.idFromResource(value.update.resourceName);
        this.account.goalConfigs[campaignId] = { level: 'CAMPAIGN', customGoal: value.update.customConversionGoal };
        responses.push({ conversionGoalCampaignConfigResult: { resourceName: value.update.resourceName } });
      } else if (kind === 'campaignConversionGoalOperation') {
        const [campaignId, category, origin] = this.idFromResource(value.update.resourceName).split('~');
        const goal = this.account.campaignGoals.find((item) => item.campaignId === campaignId && item.category === category && item.origin === origin);
        if (!goal) throw new Error('RESOURCE_NOT_FOUND');
        goal.biddable = value.update.biddable;
        this.account.goalConfigs[campaignId] = { ...(this.account.goalConfigs[campaignId] || {}), level: 'CAMPAIGN' };
        responses.push({ campaignConversionGoalResult: { resourceName: value.update.resourceName } });
      } else {
        throw new Error(`Fake does not support ${kind}`);
      }
    }
    return { mutateOperationResponses: responses };
  }

  private mutate(service: string, body: any) {
    if (this.dropWrites) return { results: [], mutateOperationResponses: [] };
    if (service === 'googleAds') return this.mutateCombined(body);

    const cid = this.account.customerId;
    const results: Array<Record<string, unknown>> = [];
    for (const operation of body.operations || []) {
      const update = operation.update;
      const create = operation.create;
      switch (service) {
        case 'campaigns':
          this.applyCampaignUpdate(update);
          break;
        case 'campaignBudgets':
          for (const campaign of this.account.campaigns.filter((item) => item.budgetId === this.idFromResource(update.resourceName))) {
            campaign.budgetMicros = Number(update.amountMicros);
          }
          break;
        case 'adGroups': {
          const group = this.account.adGroups.find((item) => item.id === this.idFromResource(update.resourceName))!;
          if (update.status) group.status = update.status;
          if (update.cpcBidMicros) group.cpcBidMicros = Number(update.cpcBidMicros);
          if (update.name) group.name = update.name;
          break;
        }
        case 'adGroupCriteria': {
          if (create) {
            const id = String(this.nextId++);
            this.account.keywords.push({
              adGroupId: this.idFromResource(create.adGroup),
              criterionId: id,
              text: create.keyword.text,
              matchType: create.keyword.matchType,
              status: create.status || 'ENABLED',
              negative: Boolean(create.negative),
              cpcBidMicros: create.cpcBidMicros ? Number(create.cpcBidMicros) : undefined,
              metrics: metrics(0, 0, 0),
            });
            results.push({ resourceName: `customers/${cid}/adGroupCriteria/${this.idFromResource(create.adGroup)}~${id}` });
            continue;
          }
          const [groupId, criterionId] = this.idFromResource(update.resourceName).split('~');
          const keyword = this.account.keywords.find((item) => item.adGroupId === groupId && item.criterionId === criterionId)!;
          if (update.status) keyword.status = update.status;
          if (String(operation.updateMask).includes('cpcBidMicros')) keyword.cpcBidMicros = update.cpcBidMicros ? Number(update.cpcBidMicros) : undefined;
          break;
        }
        case 'campaignCriteria': {
          const id = String(this.nextId++);
          this.account.campaignNegatives.push({
            campaignId: this.idFromResource(create.campaign),
            criterionId: id,
            text: create.keyword.text,
            matchType: create.keyword.matchType,
          });
          results.push({ resourceName: `customers/${cid}/campaignCriteria/${this.idFromResource(create.campaign)}~${id}` });
          continue;
        }
        case 'customConversionGoals': {
          const id = String(this.nextId++);
          this.account.customGoals.push({ id, name: create.name, actions: create.conversionActions, status: 'ENABLED' });
          results.push({ resourceName: `customers/${cid}/customConversionGoals/${id}` });
          continue;
        }
        case 'conversionGoalCampaignConfigs': {
          const campaignId = this.idFromResource(update.resourceName);
          this.account.goalConfigs[campaignId] =
            update.goalConfigLevel === 'CUSTOMER' ? { level: 'CUSTOMER' } : { level: 'CAMPAIGN', customGoal: update.customConversionGoal };
          break;
        }
        case 'campaignConversionGoals': {
          const [campaignId, category, origin] = this.idFromResource(update.resourceName).split('~');
          const goal = this.account.campaignGoals.find((item) => item.campaignId === campaignId && item.category === category && item.origin === origin)!;
          goal.biddable = update.biddable;
          break;
        }
        default:
          throw new Error(`Fake does not support service ${service}`);
      }
      results.push({ resourceName: update?.resourceName || create?.resourceName });
    }
    return { results };
  }
}
