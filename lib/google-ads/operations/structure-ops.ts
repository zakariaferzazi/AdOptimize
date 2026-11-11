import { invalidArgument, notFound, unsupported } from '@/lib/mcp/errors';
import { cleanId, micros, round, runGaql, toMicros, type GoogleAdsContext } from '../gaql';
import { loadCampaignForWrite } from './campaign-ops';
import {
  assertAccountCurrency,
  campaignIdProperty,
  currencyProperty,
  customerPath,
  formatMoney,
  humanize,
  keywordItemSchema,
  normalizeKeywordText,
  reasonProperty,
  resultResourceNames,
  validateKeywordList,
  type OperationDescriptor,
} from './types';

const adGroupIdProperty = { type: 'string' as const, description: 'Numeric ad group ID (from list_ad_groups or list_keywords).' };

interface AdGroupState {
  adGroupId: string;
  name: string;
  status: string;
  type?: string;
  defaultMaxCpc?: number;
  campaignId: string;
  campaignName: string;
  campaignBidding?: string;
  campaignChannel?: string;
}

export async function readAdGroup(context: GoogleAdsContext, adGroupId: unknown): Promise<AdGroupState | undefined> {
  const id = cleanId(adGroupId);
  if (!id) throw invalidArgument('adGroupId must be a numeric ad group ID.');
  const rows = await runGaql(
    context,
    `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros,
            campaign.id, campaign.name, campaign.bidding_strategy_type, campaign.advertising_channel_type
     FROM ad_group WHERE ad_group.id = ${id} LIMIT 1`,
    { cacheTtlMs: 0 }
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    adGroupId: cleanId(row.adGroup?.id),
    name: String(row.adGroup?.name || ''),
    status: String(row.adGroup?.status || ''),
    type: row.adGroup?.type,
    defaultMaxCpc: round(micros(row.adGroup?.cpcBidMicros)),
    campaignId: cleanId(row.campaign?.id),
    campaignName: String(row.campaign?.name || ''),
    campaignBidding: row.campaign?.biddingStrategyType,
    campaignChannel: row.campaign?.advertisingChannelType,
  };
}

async function loadAdGroupForWrite(args: Record<string, unknown>, context: GoogleAdsContext): Promise<AdGroupState> {
  const state = await readAdGroup(context, args.adGroupId);
  if (!state || state.status === 'REMOVED') throw notFound(`Ad group ${cleanId(args.adGroupId)}`);
  return state;
}

async function readKeywords(context: GoogleAdsContext, adGroupId: string, negative: boolean) {
  const rows = await runGaql(
    context,
    `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            ad_group_criterion.status
     FROM ad_group_criterion
     WHERE ad_group.id = ${cleanId(adGroupId)} AND ad_group_criterion.type = 'KEYWORD'
       AND ad_group_criterion.negative = ${negative ? 'TRUE' : 'FALSE'} AND ad_group_criterion.status != 'REMOVED'`,
    { cacheTtlMs: 0 }
  );
  return rows.map((row) => ({
    criterionId: cleanId(row.adGroupCriterion?.criterionId),
    text: normalizeKeywordText(String(row.adGroupCriterion?.keyword?.text || '')),
    matchType: String(row.adGroupCriterion?.keyword?.matchType || ''),
  }));
}

async function readCampaignNegatives(context: GoogleAdsContext, campaignId: string) {
  const rows = await runGaql(
    context,
    `SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
     FROM campaign_criterion
     WHERE campaign.id = ${cleanId(campaignId)} AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE`,
    { cacheTtlMs: 0 }
  );
  return rows.map((row) => ({
    text: normalizeKeywordText(String(row.campaignCriterion?.keyword?.text || '')),
    matchType: String(row.campaignCriterion?.keyword?.matchType || ''),
  }));
}

const keywordKey = (keyword: { text: string; matchType: string }) => `${normalizeKeywordText(keyword.text)}|${keyword.matchType}`;

function bidWarning(state: { campaignBidding?: string }): string[] {
  const bidding = String(state.campaignBidding || '');
  if (bidding && bidding !== 'MANUAL_CPC') {
    return [`The campaign uses ${humanize(bidding === 'TARGET_SPEND' ? 'MAXIMIZE_CLICKS' : bidding)} bidding, so manual max CPC bids are ignored until it uses Manual CPC.`];
  }
  return [];
}

// ---------------------------------------------------------------------------

export const updateAdGroup: OperationDescriptor = {
  name: 'update_ad_group',
  title: 'Change ad group',
  description: 'Pause/enable an ad group, change its default max CPC bid (used with Manual CPC), or rename it.',
  schema: {
    type: 'object',
    properties: {
      adGroupId: adGroupIdProperty,
      status: { type: 'string', enum: ['ENABLED', 'PAUSED'] },
      defaultMaxCpc: { type: 'number', minimum: 0.01, description: 'Default max CPC bid in the account currency.' },
      name: { type: 'string', maxLength: 255 },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['adGroupId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: (args) => args.status === 'PAUSED',
  targetKey: (args) => `ad_group:${cleanId(args.adGroupId)}`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const state = await loadAdGroupForWrite(args, context);
    const changes: string[] = [];
    const normalized: Record<string, unknown> = { adGroupId: state.adGroupId };
    if (args.status && args.status !== state.status) {
      normalized.status = args.status;
      changes.push(`Status: ${humanize(state.status)} → ${humanize(args.status)}`);
    }
    if (typeof args.defaultMaxCpc === 'number' && round(args.defaultMaxCpc) !== state.defaultMaxCpc) {
      normalized.defaultMaxCpc = round(args.defaultMaxCpc);
      changes.push(`Default max CPC: ${formatMoney(state.defaultMaxCpc, context.currency)} → ${formatMoney(args.defaultMaxCpc, context.currency)}`);
    }
    if (typeof args.name === 'string' && args.name && args.name !== state.name) {
      normalized.name = args.name;
      changes.push(`Name: ${state.name} → ${args.name}`);
    }
    if (!changes.length) throw invalidArgument(`Ad group "${state.name}" already has these settings.`);
    if (args.reason) normalized.reason = args.reason;
    return {
      args: normalized,
      summary: `Update ad group "${state.name}" in "${state.campaignName}".`,
      changes,
      before: { ...state },
      target: { kind: 'ad_group', campaignId: state.campaignId, campaignName: state.campaignName, adGroupId: state.adGroupId, adGroupName: state.name, label: `${state.campaignName} › ${state.name}` },
      warnings: normalized.defaultMaxCpc !== undefined ? bidWarning(state) : [],
    };
  },
  async readState(args, context) {
    return ((await readAdGroup(context, args.adGroupId)) || { exists: false }) as unknown as Record<string, unknown>;
  },
  driftKeys: ['status', 'defaultMaxCpc', 'name'],
  plan(args, context) {
    const update: Record<string, unknown> = { resourceName: `${customerPath(context)}/adGroups/${cleanId(args.adGroupId)}` };
    const masks: string[] = [];
    if (args.status) {
      update.status = args.status;
      masks.push('status');
    }
    if (typeof args.defaultMaxCpc === 'number') {
      update.cpcBidMicros = toMicros(args.defaultMaxCpc);
      masks.push('cpcBidMicros');
    }
    if (args.name) {
      update.name = args.name;
      masks.push('name');
    }
    return [{ kind: 'service', service: 'adGroups', operations: [{ updateMask: masks.join(','), update }] }];
  },
  verify(args, after) {
    const issues: string[] = [];
    if (args.status && after.status !== args.status) issues.push(`status is ${String(after.status)}`);
    if (typeof args.defaultMaxCpc === 'number' && Math.abs(Number(after.defaultMaxCpc) - args.defaultMaxCpc) > 0.01) {
      issues.push(`default max CPC is ${String(after.defaultMaxCpc)}`);
    }
    if (args.name && after.name !== args.name) issues.push(`name is ${String(after.name)}`);
    return issues;
  },
};

// ---------------------------------------------------------------------------

async function readKeyword(context: GoogleAdsContext, adGroupId: unknown, criterionId: unknown) {
  const rows = await runGaql(
    context,
    `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            ad_group_criterion.status, ad_group_criterion.cpc_bid_micros, ad_group_criterion.negative,
            ad_group.id, ad_group.name, campaign.id, campaign.name, campaign.bidding_strategy_type
     FROM ad_group_criterion
     WHERE ad_group.id = ${cleanId(adGroupId)} AND ad_group_criterion.criterion_id = ${cleanId(criterionId)} LIMIT 1`,
    { cacheTtlMs: 0 }
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    adGroupId: cleanId(row.adGroup?.id),
    adGroupName: String(row.adGroup?.name || ''),
    criterionId: cleanId(row.adGroupCriterion?.criterionId),
    keyword: String(row.adGroupCriterion?.keyword?.text || ''),
    matchType: row.adGroupCriterion?.keyword?.matchType,
    status: String(row.adGroupCriterion?.status || ''),
    maxCpc: round(micros(row.adGroupCriterion?.cpcBidMicros)) ?? null,
    negative: Boolean(row.adGroupCriterion?.negative),
    campaignId: cleanId(row.campaign?.id),
    campaignName: String(row.campaign?.name || ''),
    campaignBidding: row.campaign?.biddingStrategyType,
  };
}

export const updateKeyword: OperationDescriptor = {
  name: 'update_keyword',
  title: 'Change keyword',
  description:
    'Pause/enable a keyword or set/remove its own max CPC bid (Manual CPC). Identify it by adGroupId + criterionId from list_keywords.',
  schema: {
    type: 'object',
    properties: {
      adGroupId: adGroupIdProperty,
      criterionId: { type: 'string', description: 'Keyword criterion ID.' },
      status: { type: 'string', enum: ['ENABLED', 'PAUSED'] },
      maxCpc: { type: 'number', minimum: 0.01, description: 'Keyword max CPC in the account currency.' },
      removeMaxCpc: { type: 'boolean', description: 'True to fall back to the ad group default bid.' },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['adGroupId', 'criterionId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: (args) => args.status === 'PAUSED',
  targetKey: (args) => `keyword:${cleanId(args.adGroupId)}~${cleanId(args.criterionId)}`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const state = await readKeyword(context, args.adGroupId, args.criterionId);
    if (!state || state.status === 'REMOVED') throw notFound(`Keyword ${cleanId(args.criterionId)} in ad group ${cleanId(args.adGroupId)}`);
    if (state.negative) throw unsupported('That criterion is a negative keyword; negatives have no status or bid to change.');
    if (typeof args.maxCpc === 'number' && args.removeMaxCpc) throw invalidArgument('Provide maxCpc or removeMaxCpc, not both.');
    const normalized: Record<string, unknown> = { adGroupId: state.adGroupId, criterionId: state.criterionId };
    const changes: string[] = [];
    if (args.status && args.status !== state.status) {
      normalized.status = args.status;
      changes.push(`Status: ${humanize(state.status)} → ${humanize(args.status)}`);
    }
    if (typeof args.maxCpc === 'number' && round(args.maxCpc) !== state.maxCpc) {
      normalized.maxCpc = round(args.maxCpc);
      changes.push(`Max CPC: ${state.maxCpc === null ? 'ad group default' : formatMoney(state.maxCpc, context.currency)} → ${formatMoney(args.maxCpc, context.currency)}`);
    }
    if (args.removeMaxCpc && state.maxCpc !== null) {
      normalized.removeMaxCpc = true;
      changes.push(`Max CPC: ${formatMoney(state.maxCpc, context.currency)} → ad group default`);
    }
    if (!changes.length) throw invalidArgument(`Keyword "${state.keyword}" already has these settings.`);
    if (args.reason) normalized.reason = args.reason;
    return {
      args: normalized,
      summary: `Update keyword "${state.keyword}" (${humanize(state.matchType)}) in "${state.adGroupName}".`,
      changes,
      before: state as unknown as Record<string, unknown>,
      target: {
        kind: 'keyword',
        campaignId: state.campaignId,
        campaignName: state.campaignName,
        adGroupId: state.adGroupId,
        adGroupName: state.adGroupName,
        criterionId: state.criterionId,
        label: `${state.campaignName} › ${state.adGroupName} › ${state.keyword}`,
      },
      warnings: normalized.maxCpc !== undefined ? bidWarning(state) : [],
    };
  },
  async readState(args, context) {
    return ((await readKeyword(context, args.adGroupId, args.criterionId)) || { exists: false }) as unknown as Record<string, unknown>;
  },
  driftKeys: ['status', 'maxCpc'],
  plan(args, context) {
    const update: Record<string, unknown> = {
      resourceName: `${customerPath(context)}/adGroupCriteria/${cleanId(args.adGroupId)}~${cleanId(args.criterionId)}`,
    };
    const masks: string[] = [];
    if (args.status) {
      update.status = args.status;
      masks.push('status');
    }
    if (typeof args.maxCpc === 'number') {
      update.cpcBidMicros = toMicros(args.maxCpc);
      masks.push('cpcBidMicros');
    }
    if (args.removeMaxCpc) masks.push('cpcBidMicros');
    return [{ kind: 'service', service: 'adGroupCriteria', operations: [{ updateMask: masks.join(','), update }] }];
  },
  verify(args, after) {
    const issues: string[] = [];
    if (args.status && after.status !== args.status) issues.push(`status is ${String(after.status)}`);
    if (typeof args.maxCpc === 'number' && Math.abs(Number(after.maxCpc) - args.maxCpc) > 0.01) issues.push(`max CPC is ${String(after.maxCpc)}`);
    if (args.removeMaxCpc && after.maxCpc !== null && after.maxCpc !== undefined && after.maxCpc !== 0) issues.push(`max CPC is ${String(after.maxCpc)}`);
    return issues;
  },
};

// ---------------------------------------------------------------------------

export const addKeywords: OperationDescriptor = {
  name: 'add_keywords',
  title: 'Add keywords',
  description: 'Add positive keywords to an existing ad group, optionally with a keyword-level max CPC. Duplicates already in the ad group are skipped.',
  schema: {
    type: 'object',
    properties: {
      adGroupId: adGroupIdProperty,
      keywords: { type: 'array', minItems: 1, maxItems: 100, items: keywordItemSchema },
      maxCpc: { type: 'number', minimum: 0.01 },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['adGroupId', 'keywords'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `ad_group:${cleanId(args.adGroupId)}:add_keywords`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const state = await loadAdGroupForWrite(args, context);
    if (state.campaignChannel && !['SEARCH', 'DISPLAY'].includes(state.campaignChannel)) {
      throw unsupported(`Keywords cannot be added to ${humanize(state.campaignChannel)} campaigns.`);
    }
    const requested = validateKeywordList(args.keywords as Array<{ text: string; matchType: string }>);
    const existing = new Set((await readKeywords(context, state.adGroupId, false)).map(keywordKey));
    const fresh = requested.filter((keyword) => !existing.has(keywordKey(keyword)));
    const skipped = requested.length - fresh.length;
    if (!fresh.length) throw invalidArgument('All of these keywords already exist in this ad group.');
    return {
      args: {
        adGroupId: state.adGroupId,
        keywords: fresh,
        ...(typeof args.maxCpc === 'number' ? { maxCpc: round(args.maxCpc) } : {}),
        ...(args.reason ? { reason: args.reason } : {}),
      },
      summary: `Add ${fresh.length} keyword${fresh.length === 1 ? '' : 's'} to "${state.name}" in "${state.campaignName}".`,
      changes: fresh.map((keyword) => `+ ${keyword.text} (${humanize(keyword.matchType)})`),
      before: { adGroupId: state.adGroupId, status: state.status },
      target: { kind: 'ad_group', campaignId: state.campaignId, campaignName: state.campaignName, adGroupId: state.adGroupId, adGroupName: state.name, label: `${state.campaignName} › ${state.name}` },
      warnings: [
        ...(skipped ? [`${skipped} keyword(s) already existed and were skipped.`] : []),
        ...(typeof args.maxCpc === 'number' ? bidWarning(state) : []),
      ],
    };
  },
  async readState(args, context) {
    const state = await readAdGroup(context, args.adGroupId);
    if (!state) return { exists: false };
    return { status: state.status, keywords: (await readKeywords(context, state.adGroupId, false)).map(keywordKey) };
  },
  driftKeys: ['status'],
  plan(args, context) {
    const adGroup = `${customerPath(context)}/adGroups/${cleanId(args.adGroupId)}`;
    return [
      {
        kind: 'service',
        service: 'adGroupCriteria',
        operations: (args.keywords as Array<{ text: string; matchType: string }>).map((keyword) => ({
          create: {
            adGroup,
            status: 'ENABLED',
            keyword: { text: keyword.text, matchType: keyword.matchType },
            ...(typeof args.maxCpc === 'number' ? { cpcBidMicros: toMicros(args.maxCpc) } : {}),
          },
        })),
      },
    ];
  },
  verify(args, after) {
    const present = new Set((after.keywords || []) as string[]);
    return (args.keywords as Array<{ text: string; matchType: string }>)
      .filter((keyword) => !present.has(keywordKey(keyword)))
      .map((keyword) => `missing ${keyword.text} (${keyword.matchType})`);
  },
};

// ---------------------------------------------------------------------------

export const addNegativeKeywords: OperationDescriptor = {
  name: 'add_negative_keywords',
  title: 'Add negative keywords',
  description:
    'Block search terms by adding negative keywords to a campaign (or to one ad group when adGroupId is given). Existing negatives are skipped. Not available for App campaigns.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      adGroupId: { type: 'string', description: 'Optional: add at ad group level instead of campaign level.' },
      keywords: { type: 'array', minItems: 1, maxItems: 200, items: keywordItemSchema },
      reason: reasonProperty,
    },
    required: ['campaignId', 'keywords'],
    additionalProperties: false,
  },
  actionType: () => 'ADD_NEGATIVE_KEYWORD',
  destructive: () => false,
  targetKey: (args) => (args.adGroupId ? `ad_group:${cleanId(args.adGroupId)}:negatives` : `campaign:${cleanId(args.campaignId)}:negatives`),
  async prepare(args, context) {
    const campaign = await loadCampaignForWrite(args, context);
    if (campaign.channel === 'MULTI_CHANNEL') {
      throw unsupported('App campaigns do not support negative keywords.', 'Exclude placements or adjust the app campaign assets instead.');
    }
    const requested = validateKeywordList(args.keywords as Array<{ text: string; matchType: string }>);
    let adGroupName: string | undefined;
    let existing: Array<{ text: string; matchType: string }>;
    if (args.adGroupId) {
      const adGroup = await loadAdGroupForWrite(args, context);
      if (adGroup.campaignId !== campaign.campaignId) throw invalidArgument(`Ad group ${adGroup.adGroupId} is not in campaign "${campaign.name}".`);
      adGroupName = adGroup.name;
      existing = await readKeywords(context, adGroup.adGroupId, true);
    } else {
      existing = await readCampaignNegatives(context, campaign.campaignId);
    }
    const known = new Set(existing.map(keywordKey));
    const fresh = requested.filter((keyword) => !known.has(keywordKey(keyword)));
    if (!fresh.length) throw invalidArgument('All of these negative keywords are already in place.');
    const where = adGroupName ? `ad group "${adGroupName}"` : `campaign "${campaign.name}"`;
    return {
      args: {
        campaignId: campaign.campaignId,
        ...(args.adGroupId ? { adGroupId: cleanId(args.adGroupId) } : {}),
        keywords: fresh,
        ...(args.reason ? { reason: args.reason } : {}),
      },
      summary: `Add ${fresh.length} negative keyword${fresh.length === 1 ? '' : 's'} to ${where}.`,
      changes: fresh.map((keyword) => `− ${keyword.text} (${humanize(keyword.matchType)})`),
      before: { campaignId: campaign.campaignId, status: campaign.status },
      target: {
        kind: args.adGroupId ? 'ad_group' : 'campaign',
        campaignId: campaign.campaignId,
        campaignName: campaign.name,
        ...(args.adGroupId ? { adGroupId: cleanId(args.adGroupId), adGroupName } : {}),
        label: adGroupName ? `${campaign.name} › ${adGroupName}` : campaign.name,
      },
      warnings:
        requested.length > fresh.length ? [`${requested.length - fresh.length} negative keyword(s) already existed and were skipped.`] : [],
    };
  },
  async readState(args, context) {
    const negatives = args.adGroupId
      ? await readKeywords(context, cleanId(args.adGroupId), true)
      : await readCampaignNegatives(context, cleanId(args.campaignId));
    return { negatives: negatives.map(keywordKey) };
  },
  driftKeys: [],
  plan(args, context) {
    const keywords = args.keywords as Array<{ text: string; matchType: string }>;
    if (args.adGroupId) {
      const adGroup = `${customerPath(context)}/adGroups/${cleanId(args.adGroupId)}`;
      return [
        {
          kind: 'service',
          service: 'adGroupCriteria',
          operations: keywords.map((keyword) => ({ create: { adGroup, negative: true, keyword: { text: keyword.text, matchType: keyword.matchType } } })),
        },
      ];
    }
    const campaign = `${customerPath(context)}/campaigns/${cleanId(args.campaignId)}`;
    return [
      {
        kind: 'service',
        service: 'campaignCriteria',
        operations: keywords.map((keyword) => ({ create: { campaign, negative: true, keyword: { text: keyword.text, matchType: keyword.matchType } } })),
      },
    ];
  },
  verify(args, after) {
    const present = new Set((after.negatives || []) as string[]);
    return (args.keywords as Array<{ text: string; matchType: string }>)
      .filter((keyword) => !present.has(keywordKey(keyword)))
      .map((keyword) => `missing negative ${keyword.text} (${keyword.matchType})`);
  },
};

// ---------------------------------------------------------------------------

export const createAdGroup: OperationDescriptor = {
  name: 'create_ad_group',
  title: 'Create ad group',
  description: 'Create a Search ad group in an existing Search campaign, optionally with a default max CPC and keywords, in one atomic request.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      name: { type: 'string', maxLength: 255 },
      defaultMaxCpc: { type: 'number', minimum: 0.01 },
      status: { type: 'string', enum: ['ENABLED', 'PAUSED'] },
      keywords: { type: 'array', maxItems: 100, items: keywordItemSchema },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['campaignId', 'name'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:new_ad_group:${String(args.name).toLowerCase()}`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const campaign = await loadCampaignForWrite(args, context);
    if (campaign.channel !== 'SEARCH') {
      throw unsupported(`Ad groups can only be created here for Search campaigns; "${campaign.name}" is ${humanize(campaign.channel)}.`);
    }
    const rows = await runGaql(
      context,
      `SELECT ad_group.id, ad_group.name FROM ad_group WHERE campaign.id = ${campaign.campaignId} AND ad_group.status != 'REMOVED'`,
      { cacheTtlMs: 0 }
    );
    const name = String(args.name).trim();
    if (rows.some((row) => String(row.adGroup?.name || '').toLowerCase() === name.toLowerCase())) {
      throw invalidArgument(`Campaign "${campaign.name}" already has an ad group named "${name}".`);
    }
    const keywords = Array.isArray(args.keywords) && args.keywords.length ? validateKeywordList(args.keywords as Array<{ text: string; matchType: string }>) : [];
    const warnings: string[] = [];
    if (campaign.biddingStrategyType === 'MANUAL_CPC' && typeof args.defaultMaxCpc !== 'number') {
      warnings.push('The campaign uses Manual CPC; without a default max CPC Google Ads applies its minimum default bid.');
    }
    if (!keywords.length) warnings.push('The ad group has no keywords yet, so it cannot serve until keywords and ads are added.');
    warnings.push('No ads are created by this change; the ad group needs a responsive search ad to serve.');
    return {
      args: {
        campaignId: campaign.campaignId,
        name,
        status: args.status || 'ENABLED',
        ...(typeof args.defaultMaxCpc === 'number' ? { defaultMaxCpc: round(args.defaultMaxCpc) } : {}),
        ...(keywords.length ? { keywords } : {}),
        ...(args.reason ? { reason: args.reason } : {}),
      },
      summary: `Create ad group "${name}" in "${campaign.name}"${keywords.length ? ` with ${keywords.length} keywords` : ''}.`,
      changes: [
        `New ad group: ${name} (${humanize(args.status || 'ENABLED')})`,
        ...(typeof args.defaultMaxCpc === 'number' ? [`Default max CPC: ${formatMoney(args.defaultMaxCpc, context.currency)}`] : []),
        ...keywords.map((keyword) => `+ ${keyword.text} (${humanize(keyword.matchType)})`),
      ],
      before: { campaignId: campaign.campaignId, campaignStatus: campaign.status, adGroupExists: false },
      target: { kind: 'campaign', campaignId: campaign.campaignId, campaignName: campaign.name, label: campaign.name },
      warnings,
    };
  },
  async readState(args, context, realIds) {
    if (realIds?.adGroupId) {
      const adGroup = await readAdGroup(context, realIds.adGroupId);
      if (!adGroup) return { adGroupExists: false };
      const keywords = await readKeywords(context, adGroup.adGroupId, false);
      return { adGroupExists: true, ...adGroup, keywords: keywords.map(keywordKey) };
    }
    const rows = await runGaql(
      context,
      `SELECT ad_group.id FROM ad_group WHERE campaign.id = ${cleanId(args.campaignId)} AND ad_group.name = '${String(args.name).replace(/'/g, "\\'")}' AND ad_group.status != 'REMOVED'`,
      { cacheTtlMs: 0 }
    );
    return { adGroupExists: rows.length > 0 };
  },
  driftKeys: ['adGroupExists'],
  plan(args, context) {
    const customer = customerPath(context);
    const temp = `${customer}/adGroups/-1`;
    const operations: Array<Record<string, unknown>> = [
      {
        adGroupOperation: {
          create: {
            resourceName: temp,
            campaign: `${customer}/campaigns/${cleanId(args.campaignId)}`,
            name: args.name,
            status: args.status || 'ENABLED',
            type: 'SEARCH_STANDARD',
            ...(typeof args.defaultMaxCpc === 'number' ? { cpcBidMicros: toMicros(args.defaultMaxCpc) } : {}),
          },
        },
      },
      ...((args.keywords || []) as Array<{ text: string; matchType: string }>).map((keyword) => ({
        adGroupCriterionOperation: { create: { adGroup: temp, status: 'ENABLED', keyword: { text: keyword.text, matchType: keyword.matchType } } },
      })),
    ];
    return [{ kind: 'combined', operations }];
  },
  realIds(_args, results): Record<string, string> {
    const adGroup = resultResourceNames(results[0]).find((name) => name.includes('/adGroups/'));
    return adGroup ? { adGroupId: cleanId(adGroup.split('/').pop()) } : {};
  },
  verify(args, after) {
    const issues: string[] = [];
    if (!after.adGroupExists) return ['ad group not found after creation'];
    if (after.name !== args.name) issues.push(`name is ${String(after.name)}`);
    if (typeof args.defaultMaxCpc === 'number' && Math.abs(Number(after.defaultMaxCpc) - args.defaultMaxCpc) > 0.01) {
      issues.push(`default max CPC is ${String(after.defaultMaxCpc)}`);
    }
    const present = new Set((after.keywords || []) as string[]);
    const missing = ((args.keywords || []) as Array<{ text: string; matchType: string }>).filter((keyword) => !present.has(keywordKey(keyword)));
    if (missing.length) issues.push(`${missing.length} keyword(s) missing`);
    return issues;
  },
};

export const STRUCTURE_OPERATIONS: OperationDescriptor[] = [
  updateAdGroup,
  updateKeyword,
  addKeywords,
  addNegativeKeywords,
  createAdGroup,
];
