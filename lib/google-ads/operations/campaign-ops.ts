import { invalidArgument, notFound, unsupported } from '@/lib/mcp/errors';
import { cleanId, isIsoDate, round, toMicros, type GoogleAdsContext } from '../gaql';
import { readCampaignState, resolveCampaign, type CampaignState } from '../reporting';
import {
  assertAccountCurrency,
  campaignIdProperty,
  currencyProperty,
  customerPath,
  formatMoney,
  humanize,
  reasonProperty,
  type OperationDescriptor,
  type PreparedChange,
} from './types';

/** Fresh campaign state for a write, with a clear error when it is gone. */
export async function loadCampaignForWrite(args: Record<string, unknown>, context: GoogleAdsContext): Promise<CampaignState> {
  const id = cleanId(args.campaignId);
  if (!id) throw invalidArgument('campaignId must be the numeric Google Ads campaign ID.');
  const state = await readCampaignState(context, id, { fresh: true });
  if (!state || state.status === 'REMOVED') {
    throw notFound(`Campaign ${id}`);
  }
  return state;
}

export async function campaignStateRecord(args: Record<string, unknown>, context: GoogleAdsContext) {
  const state = await readCampaignState(context, cleanId(args.campaignId), { fresh: true });
  return (state || { exists: false }) as unknown as Record<string, unknown>;
}

function campaignTarget(state: CampaignState): PreparedChange['target'] {
  return { kind: 'campaign', campaignId: state.campaignId, campaignName: state.name, label: state.name };
}

function campaignResource(context: GoogleAdsContext, campaignId: unknown): string {
  return `${customerPath(context)}/campaigns/${cleanId(campaignId)}`;
}

const near = (left: unknown, right: unknown, tolerance = 0.01) =>
  typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) <= tolerance;

// ---------------------------------------------------------------------------

export const updateCampaignStatus: OperationDescriptor = {
  name: 'update_campaign_status',
  title: 'Change campaign status',
  description: 'Pause or enable a campaign. Pausing stops all delivery immediately; enabling resumes it.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      status: { type: 'string', enum: ['PAUSED', 'ENABLED'] },
      reason: reasonProperty,
    },
    required: ['campaignId', 'status'],
    additionalProperties: false,
  },
  actionType: (args) => (args.status === 'PAUSED' ? 'PAUSE_CAMPAIGN' : 'ENABLE_CAMPAIGN'),
  destructive: (args) => args.status === 'PAUSED',
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:status`,
  async prepare(args, context) {
    const state = await loadCampaignForWrite(args, context);
    if (state.status === args.status) {
      throw invalidArgument(`Campaign "${state.name}" is already ${humanize(args.status)}. No change is needed.`);
    }
    const warnings: string[] = [];
    if (args.status === 'ENABLED' && state.endDate && state.endDate < new Date().toISOString().slice(0, 10)) {
      warnings.push(`The campaign end date (${state.endDate}) has passed, so it will not serve until the end date is changed.`);
    }
    return {
      args: { campaignId: state.campaignId, status: args.status, ...(args.reason ? { reason: args.reason } : {}) },
      summary: `${args.status === 'PAUSED' ? 'Pause' : 'Enable'} campaign "${state.name}".`,
      changes: [`Status: ${humanize(state.status)} → ${humanize(args.status)}`],
      before: { campaignId: state.campaignId, name: state.name, status: state.status },
      target: campaignTarget(state),
      warnings,
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['status'],
  plan: (args, context) => [
    {
      kind: 'service',
      service: 'campaigns',
      operations: [{ updateMask: 'status', update: { resourceName: campaignResource(context, args.campaignId), status: args.status } }],
    },
  ],
  verify: (args, after) => (after.status === args.status ? [] : [`status is ${String(after.status)}`]),
};

// ---------------------------------------------------------------------------

export const updateCampaignBudget: OperationDescriptor = {
  name: 'update_campaign_budget',
  title: 'Change daily budget',
  description:
    'Set the average daily budget of a campaign, in the account currency. If the budget is shared with other campaigns the change affects all of them (reported as a warning).',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      dailyBudget: { type: 'number', description: 'New average daily budget in the account currency.', minimum: 0.01 },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['campaignId', 'dailyBudget'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_BUDGET',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:budget`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const state = await loadCampaignForWrite(args, context);
    if (!state.budget) throw unsupported(`Campaign "${state.name}" has no campaign budget that can be edited.`);
    const next = round(Number(args.dailyBudget)) as number;
    if (near(state.budget.dailyAmount, next)) {
      throw invalidArgument(`The daily budget of "${state.name}" is already ${formatMoney(next, context.currency)}.`);
    }
    const warnings: string[] = [];
    if (state.budget.shared) {
      warnings.push(
        `This budget is shared by ${state.budget.campaignsUsingBudget ?? 'several'} campaigns; all of them will use the new amount.`
      );
    }
    const current = state.budget.dailyAmount;
    if (current && (next > current * 2 || next < current * 0.5)) {
      warnings.push('This is a change of more than 50%; automated bidding may need time to re-stabilise.');
    }
    return {
      args: { campaignId: state.campaignId, dailyBudget: next, ...(args.reason ? { reason: args.reason } : {}) },
      summary: `Change the daily budget of "${state.name}" to ${formatMoney(next, context.currency)}.`,
      changes: [`Daily budget: ${formatMoney(current, context.currency)} → ${formatMoney(next, context.currency)}`],
      before: {
        campaignId: state.campaignId,
        name: state.name,
        dailyBudget: current,
        budgetResourceName: state.budget.resourceName,
      },
      target: campaignTarget(state),
      warnings,
    };
  },
  async readState(args, context) {
    const state = await readCampaignState(context, cleanId(args.campaignId), { fresh: true });
    return state
      ? { name: state.name, status: state.status, dailyBudget: state.budget?.dailyAmount, budgetResourceName: state.budget?.resourceName }
      : { exists: false };
  },
  driftKeys: ['dailyBudget', 'budgetResourceName'],
  plan(args, _context, state) {
    const resourceName = String(state.budgetResourceName || '');
    if (!resourceName) throw unsupported('The campaign budget could not be resolved from the live account.');
    return [
      {
        kind: 'service',
        service: 'campaignBudgets',
        operations: [{ updateMask: 'amountMicros', update: { resourceName, amountMicros: toMicros(Number(args.dailyBudget)) } }],
      },
    ];
  },
  verify: (args, after) => (near(after.dailyBudget, Number(args.dailyBudget)) ? [] : [`daily budget is ${String(after.dailyBudget)}`]),
};

// ---------------------------------------------------------------------------

export const updateCampaignName: OperationDescriptor = {
  name: 'update_campaign_name',
  title: 'Rename campaign',
  description: 'Rename a campaign. Names must be unique within the account.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      newName: { type: 'string', maxLength: 255 },
      reason: reasonProperty,
    },
    required: ['campaignId', 'newName'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:name`,
  async prepare(args, context) {
    const state = await loadCampaignForWrite(args, context);
    const newName = String(args.newName).trim();
    if (state.name === newName) throw invalidArgument(`The campaign is already named "${newName}".`);
    try {
      const clash = await resolveCampaign(context, { campaignName: newName }, { fresh: true });
      if (clash.name.toLowerCase() === newName.toLowerCase() && clash.id !== state.campaignId) {
        throw invalidArgument(`Another campaign (${clash.id}) is already named "${clash.name}". Choose a different name.`);
      }
    } catch (error) {
      if ((error as { payload?: { code?: string } }).payload?.code === 'invalid_argument') throw error;
    }
    return {
      args: { campaignId: state.campaignId, newName, ...(args.reason ? { reason: args.reason } : {}) },
      summary: `Rename "${state.name}" to "${newName}".`,
      changes: [`Name: ${state.name} → ${newName}`],
      before: { campaignId: state.campaignId, name: state.name },
      target: campaignTarget(state),
      warnings: [],
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['name'],
  plan: (args, context) => [
    {
      kind: 'service',
      service: 'campaigns',
      operations: [{ updateMask: 'name', update: { resourceName: campaignResource(context, args.campaignId), name: args.newName } }],
    },
  ],
  verify: (args, after) => (after.name === args.newName ? [] : [`name is ${String(after.name)}`]),
};

// ---------------------------------------------------------------------------

export const updateCampaignDates: OperationDescriptor = {
  name: 'update_campaign_dates',
  title: 'Change campaign schedule',
  description:
    'Set the start date and/or end date of a campaign (YYYY-MM-DD, account time zone), or remove the end date so it runs indefinitely. A start date cannot be changed after the campaign has started.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      startDate: { type: 'string', description: 'YYYY-MM-DD' },
      endDate: { type: 'string', description: 'YYYY-MM-DD' },
      removeEndDate: { type: 'boolean', description: 'True to run indefinitely.' },
      reason: reasonProperty,
    },
    required: ['campaignId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:dates`,
  async prepare(args, context) {
    const state = await loadCampaignForWrite(args, context);
    if (args.startDate !== undefined && !isIsoDate(args.startDate)) throw invalidArgument('startDate must be YYYY-MM-DD.');
    if (args.endDate !== undefined && !isIsoDate(args.endDate)) throw invalidArgument('endDate must be YYYY-MM-DD.');
    if (args.endDate && args.removeEndDate) throw invalidArgument('Provide endDate or removeEndDate, not both.');
    if (!args.startDate && !args.endDate && !args.removeEndDate) {
      throw invalidArgument('Provide a startDate, an endDate, or removeEndDate.');
    }
    const start = (args.startDate as string | undefined) || state.startDate;
    if (args.endDate && start && String(args.endDate) < start) throw invalidArgument('The end date is before the start date.');
    const changes: string[] = [];
    if (args.startDate) changes.push(`Start date: ${state.startDate || 'not set'} → ${String(args.startDate)}`);
    if (args.endDate) changes.push(`End date: ${state.endDate || 'none'} → ${String(args.endDate)}`);
    if (args.removeEndDate) changes.push(`End date: ${state.endDate || 'none'} → none (runs indefinitely)`);
    return {
      args: {
        campaignId: state.campaignId,
        ...(args.startDate ? { startDate: args.startDate } : {}),
        ...(args.endDate ? { endDate: args.endDate } : {}),
        ...(args.removeEndDate ? { removeEndDate: true } : {}),
        ...(args.reason ? { reason: args.reason } : {}),
      },
      summary: `Update the schedule of "${state.name}".`,
      changes,
      before: { campaignId: state.campaignId, name: state.name, startDate: state.startDate, endDate: state.endDate },
      target: campaignTarget(state),
      warnings: [],
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['startDate', 'endDate'],
  plan(args, context) {
    const update: Record<string, unknown> = { resourceName: campaignResource(context, args.campaignId) };
    const masks: string[] = [];
    if (args.startDate) {
      update.startDateTime = `${String(args.startDate)} 00:00:00`;
      masks.push('startDateTime');
    }
    if (args.endDate) {
      update.endDateTime = `${String(args.endDate)} 23:59:59`;
      masks.push('endDateTime');
    }
    if (args.removeEndDate) masks.push('endDateTime');
    return [{ kind: 'service', service: 'campaigns', operations: [{ updateMask: masks.join(','), update }] }];
  },
  verify(args, after) {
    const issues: string[] = [];
    if (args.startDate && after.startDate !== args.startDate) issues.push(`start date is ${String(after.startDate)}`);
    if (args.endDate && after.endDate !== args.endDate) issues.push(`end date is ${String(after.endDate)}`);
    if (args.removeEndDate && after.endDate && !String(after.endDate).startsWith('2037')) issues.push(`end date is ${String(after.endDate)}`);
    return issues;
  },
};

// ---------------------------------------------------------------------------

const NETWORK_FIELDS = [
  { arg: 'googleSearch', api: 'targetGoogleSearch', state: 'googleSearch', label: 'Google Search' },
  { arg: 'searchPartners', api: 'targetSearchNetwork', state: 'searchPartners', label: 'Search partners' },
  { arg: 'displayNetwork', api: 'targetContentNetwork', state: 'display', label: 'Display Network expansion' },
] as const;

export const updateCampaignNetworks: OperationDescriptor = {
  name: 'update_campaign_networks',
  title: 'Change networks',
  description: 'Turn Search partners or Display Network expansion on or off for a Search campaign.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      googleSearch: { type: 'boolean' },
      searchPartners: { type: 'boolean' },
      displayNetwork: { type: 'boolean' },
      reason: reasonProperty,
    },
    required: ['campaignId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:networks`,
  async prepare(args, context) {
    const state = await loadCampaignForWrite(args, context);
    if (state.channel !== 'SEARCH') {
      throw unsupported(`Network settings can only be edited on Search campaigns; "${state.name}" is ${humanize(state.channel)}.`);
    }
    const changes: string[] = [];
    const normalized: Record<string, unknown> = { campaignId: state.campaignId };
    for (const field of NETWORK_FIELDS) {
      if (typeof args[field.arg] !== 'boolean') continue;
      const current = state.network?.[field.state];
      if (current === args[field.arg]) continue;
      normalized[field.arg] = args[field.arg];
      changes.push(`${field.label}: ${current ? 'on' : 'off'} → ${args[field.arg] ? 'on' : 'off'}`);
    }
    if (!changes.length) throw invalidArgument('The requested network settings are already in place.');
    if (args.reason) normalized.reason = args.reason;
    return {
      args: normalized,
      summary: `Update network settings of "${state.name}".`,
      changes,
      before: { campaignId: state.campaignId, name: state.name, network: state.network },
      target: campaignTarget(state),
      warnings: [],
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['network'],
  plan(args, context) {
    const networkSettings: Record<string, unknown> = {};
    const masks: string[] = [];
    for (const field of NETWORK_FIELDS) {
      if (typeof args[field.arg] !== 'boolean') continue;
      networkSettings[field.api] = args[field.arg];
      masks.push(`networkSettings.${field.api}`);
    }
    return [
      {
        kind: 'service',
        service: 'campaigns',
        operations: [{ updateMask: masks.join(','), update: { resourceName: campaignResource(context, args.campaignId), networkSettings } }],
      },
    ];
  },
  verify(args, after) {
    const network = (after.network || {}) as Record<string, unknown>;
    return NETWORK_FIELDS.filter((field) => typeof args[field.arg] === 'boolean' && network[field.state] !== args[field.arg]).map(
      (field) => `${field.label} is ${network[field.state] ? 'on' : 'off'}`
    );
  },
};

// ---------------------------------------------------------------------------

export const updateCampaignTracking: OperationDescriptor = {
  name: 'update_campaign_tracking',
  title: 'Change tracking',
  description: 'Set or clear the campaign tracking template and/or final URL suffix.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      trackingUrlTemplate: { type: 'string', description: 'Tracking template (must contain {lpurl}), or "" to clear.' },
      finalUrlSuffix: { type: 'string', description: 'Query parameters appended to final URLs, or "" to clear.' },
      reason: reasonProperty,
    },
    required: ['campaignId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:tracking`,
  async prepare(args, context) {
    const state = await loadCampaignForWrite(args, context);
    if (args.trackingUrlTemplate === undefined && args.finalUrlSuffix === undefined) {
      throw invalidArgument('Provide a tracking template or a final URL suffix.');
    }
    if (typeof args.trackingUrlTemplate === 'string' && args.trackingUrlTemplate && !args.trackingUrlTemplate.includes('{lpurl')) {
      throw invalidArgument('A tracking template must include {lpurl} (or {lpurl+2}/{escapedlpurl}).');
    }
    const changes: string[] = [];
    if (args.trackingUrlTemplate !== undefined) {
      changes.push(`Tracking template: ${state.trackingUrlTemplate || 'none'} → ${args.trackingUrlTemplate || 'none'}`);
    }
    if (args.finalUrlSuffix !== undefined) {
      changes.push(`Final URL suffix: ${state.finalUrlSuffix || 'none'} → ${args.finalUrlSuffix || 'none'}`);
    }
    return {
      args: { ...args, campaignId: state.campaignId },
      summary: `Update tracking for "${state.name}".`,
      changes,
      before: {
        campaignId: state.campaignId,
        name: state.name,
        trackingUrlTemplate: state.trackingUrlTemplate,
        finalUrlSuffix: state.finalUrlSuffix,
      },
      target: campaignTarget(state),
      warnings: [],
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['trackingUrlTemplate', 'finalUrlSuffix'],
  plan(args, context) {
    const update: Record<string, unknown> = { resourceName: campaignResource(context, args.campaignId) };
    const masks: string[] = [];
    if (args.trackingUrlTemplate !== undefined) {
      if (args.trackingUrlTemplate) update.trackingUrlTemplate = args.trackingUrlTemplate;
      masks.push('trackingUrlTemplate');
    }
    if (args.finalUrlSuffix !== undefined) {
      if (args.finalUrlSuffix) update.finalUrlSuffix = args.finalUrlSuffix;
      masks.push('finalUrlSuffix');
    }
    return [{ kind: 'service', service: 'campaigns', operations: [{ updateMask: masks.join(','), update }] }];
  },
  verify(args, after) {
    const issues: string[] = [];
    if (args.trackingUrlTemplate !== undefined && (after.trackingUrlTemplate || '') !== args.trackingUrlTemplate) {
      issues.push('tracking template differs');
    }
    if (args.finalUrlSuffix !== undefined && (after.finalUrlSuffix || '') !== args.finalUrlSuffix) issues.push('final URL suffix differs');
    return issues;
  },
};

// ---------------------------------------------------------------------------

export const BIDDING_STRATEGIES = [
  'MANUAL_CPC',
  'MAXIMIZE_CLICKS',
  'MAXIMIZE_CONVERSIONS',
  'MAXIMIZE_CONVERSION_VALUE',
  'TARGET_CPA',
  'TARGET_ROAS',
] as const;

/** Campaign fields and update mask for a standard bidding strategy. */
export function biddingFields(args: Record<string, unknown>): { fields: Record<string, unknown>; masks: string[] } {
  const strategy = String(args.biddingStrategy || args.strategy);
  const targetCpa = typeof args.targetCpa === 'number' ? toMicros(args.targetCpa) : undefined;
  const targetRoas = typeof args.targetRoas === 'number' ? args.targetRoas : undefined;
  const ceiling = typeof args.maxCpcLimit === 'number' ? toMicros(args.maxCpcLimit) : undefined;
  switch (strategy) {
    case 'MANUAL_CPC':
      return { fields: { manualCpc: {} }, masks: ['manualCpc'] };
    case 'MAXIMIZE_CLICKS':
      return ceiling
        ? { fields: { targetSpend: { cpcBidCeilingMicros: ceiling } }, masks: ['targetSpend.cpcBidCeilingMicros'] }
        : { fields: { targetSpend: {} }, masks: ['targetSpend'] };
    case 'MAXIMIZE_CONVERSIONS':
    case 'TARGET_CPA':
      return targetCpa
        ? { fields: { maximizeConversions: { targetCpaMicros: targetCpa } }, masks: ['maximizeConversions.targetCpaMicros'] }
        : { fields: { maximizeConversions: {} }, masks: ['maximizeConversions'] };
    case 'MAXIMIZE_CONVERSION_VALUE':
    case 'TARGET_ROAS':
      return targetRoas
        ? { fields: { maximizeConversionValue: { targetRoas } }, masks: ['maximizeConversionValue.targetRoas'] }
        : { fields: { maximizeConversionValue: {} }, masks: ['maximizeConversionValue'] };
    default:
      throw invalidArgument(`Unsupported bidding strategy "${strategy}".`);
  }
}

/** Validate the combination of strategy and targets; returns the normalised strategy. */
export function checkBiddingArgs(args: Record<string, unknown>): string {
  const strategy = String(args.biddingStrategy || args.strategy);
  if (strategy === 'TARGET_CPA' && typeof args.targetCpa !== 'number') {
    throw invalidArgument('Target CPA bidding needs targetCpa (in the account currency).');
  }
  if (strategy === 'TARGET_ROAS' && typeof args.targetRoas !== 'number') {
    throw invalidArgument('Target ROAS bidding needs targetRoas as a ratio, for example 4 for 400%.');
  }
  if (typeof args.targetCpa === 'number' && !['TARGET_CPA', 'MAXIMIZE_CONVERSIONS'].includes(strategy)) {
    throw invalidArgument('targetCpa only applies to Maximize conversions / Target CPA bidding.');
  }
  if (typeof args.targetRoas === 'number' && !['TARGET_ROAS', 'MAXIMIZE_CONVERSION_VALUE'].includes(strategy)) {
    throw invalidArgument('targetRoas only applies to Maximize conversion value / Target ROAS bidding.');
  }
  if (typeof args.maxCpcLimit === 'number' && strategy !== 'MAXIMIZE_CLICKS') {
    throw invalidArgument(
      'A campaign-level max CPC limit exists only with Maximize clicks. With Manual CPC, max CPC is set per ad group or keyword (update_ad_group / update_keyword). Smart bidding strategies (conversions/value) do not accept a CPC cap.'
    );
  }
  return strategy;
}

function describeBidding(state: { biddingStrategyType?: unknown; targetCpa?: unknown; targetRoas?: unknown; maxCpcCeiling?: unknown }, currency: string) {
  const type = String(state.biddingStrategyType || 'unknown');
  const parts = [humanize(type === 'TARGET_SPEND' ? 'MAXIMIZE_CLICKS' : type)];
  if (typeof state.targetCpa === 'number') parts.push(`target CPA ${formatMoney(state.targetCpa, currency)}`);
  if (typeof state.targetRoas === 'number') parts.push(`target ROAS ${state.targetRoas}x`);
  if (typeof state.maxCpcCeiling === 'number') parts.push(`max CPC ${formatMoney(state.maxCpcCeiling, currency)}`);
  return parts.join(', ');
}

export const updateCampaignBidding: OperationDescriptor = {
  name: 'update_campaign_bidding',
  title: 'Change bidding strategy',
  description:
    'Change a Search/Display campaign to a standard bidding strategy: MANUAL_CPC, MAXIMIZE_CLICKS (optional maxCpcLimit), MAXIMIZE_CONVERSIONS (optional targetCpa), MAXIMIZE_CONVERSION_VALUE (optional targetRoas), TARGET_CPA (needs targetCpa) or TARGET_ROAS (needs targetRoas). For App campaigns only the target CPA / target ROAS value can be changed.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      strategy: { type: 'string', enum: [...BIDDING_STRATEGIES] },
      targetCpa: { type: 'number', minimum: 0.01, description: 'Account currency.' },
      targetRoas: { type: 'number', minimum: 0.01, description: 'Ratio, e.g. 3.5 = 350%.' },
      maxCpcLimit: { type: 'number', minimum: 0.01, description: 'Max CPC bid limit for MAXIMIZE_CLICKS, account currency.' },
      currency: currencyProperty,
      reason: reasonProperty,
    },
    required: ['campaignId', 'strategy'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:bidding`,
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const state = await loadCampaignForWrite(args, context);
    const strategy = checkBiddingArgs(args);
    const warnings: string[] = [];

    if (state.channel === 'MULTI_CHANNEL') {
      const goal = String(state.app?.biddingGoal || '');
      const roasGoal = goal.includes('RETURN_ON_ADVERTISING_SPEND');
      const cpaGoal = goal.includes('TARGET_INSTALL_COST') || goal.includes('TARGET_CONVERSION_COST');
      if (!((strategy === 'TARGET_CPA' && cpaGoal) || (strategy === 'TARGET_ROAS' && roasGoal))) {
        throw unsupported(
          `App campaign "${state.name}" bids toward its app goal (${humanize(goal)}). Its bidding strategy cannot be switched; only the ${roasGoal ? 'target ROAS' : cpaGoal ? 'target cost per action/install' : 'target'} value can be changed.`,
          cpaGoal ? 'Change the target cost per install/action with strategy TARGET_CPA.' : roasGoal ? 'Change the target ROAS with strategy TARGET_ROAS.' : undefined
        );
      }
    } else if (!['SEARCH', 'DISPLAY'].includes(state.channel)) {
      warnings.push(`Not every strategy is available for ${humanize(state.channel)} campaigns; Google Ads validates this before the proposal is shown.`);
    }
    if (state.portfolioBiddingStrategy) {
      warnings.push('The campaign currently uses a portfolio strategy; this replaces it with a standard strategy for this campaign only.');
    }
    if (String(state.biddingStrategyType) !== strategy) {
      warnings.push('Changing the bidding strategy starts a new learning period; performance can fluctuate for 1–2 weeks.');
    }
    if (strategy === 'MANUAL_CPC') {
      warnings.push('With Manual CPC, ad group and keyword max CPC bids control spend; check that ad groups have sensible default bids.');
    }

    const normalized: Record<string, unknown> = { campaignId: state.campaignId, strategy };
    for (const key of ['targetCpa', 'targetRoas', 'maxCpcLimit', 'reason']) if (args[key] !== undefined) normalized[key] = args[key];
    const afterDescription = describeBidding(
      {
        biddingStrategyType: strategy,
        targetCpa: normalized.targetCpa,
        targetRoas: normalized.targetRoas,
        maxCpcCeiling: normalized.maxCpcLimit,
      },
      context.currency
    );
    return {
      args: normalized,
      summary: `Switch "${state.name}" to ${afterDescription}.`,
      changes: [`Bidding: ${describeBidding(state, context.currency)} → ${afterDescription}`],
      before: {
        campaignId: state.campaignId,
        name: state.name,
        channel: state.channel,
        biddingStrategyType: state.biddingStrategyType,
        targetCpa: state.targetCpa,
        targetRoas: state.targetRoas,
        maxCpcCeiling: state.maxCpcCeiling,
      },
      target: campaignTarget(state),
      warnings,
    };
  },
  readState: (args, context) => campaignStateRecord(args, context),
  driftKeys: ['biddingStrategyType', 'targetCpa', 'targetRoas', 'maxCpcCeiling'],
  plan(args, context, state) {
    const resourceName = campaignResource(context, args.campaignId);
    if (state.channel === 'MULTI_CHANNEL') {
      if (args.strategy === 'TARGET_CPA') {
        return [
          {
            kind: 'service',
            service: 'campaigns',
            operations: [{ updateMask: 'targetCpa.targetCpaMicros', update: { resourceName, targetCpa: { targetCpaMicros: toMicros(Number(args.targetCpa)) } } }],
          },
        ];
      }
      return [
        {
          kind: 'service',
          service: 'campaigns',
          operations: [{ updateMask: 'targetRoas.targetRoas', update: { resourceName, targetRoas: { targetRoas: Number(args.targetRoas) } } }],
        },
      ];
    }
    const { fields, masks } = biddingFields(args);
    return [{ kind: 'service', service: 'campaigns', operations: [{ updateMask: masks.join(','), update: { resourceName, ...fields } }] }];
  },
  verify(args, after) {
    const issues: string[] = [];
    const observed = String(after.biddingStrategyType || '');
    const strategy = String(args.strategy);
    const accepted: Record<string, string[]> = {
      MANUAL_CPC: ['MANUAL_CPC'],
      MAXIMIZE_CLICKS: ['TARGET_SPEND'],
      MAXIMIZE_CONVERSIONS: ['MAXIMIZE_CONVERSIONS'],
      TARGET_CPA: ['MAXIMIZE_CONVERSIONS', 'TARGET_CPA'],
      MAXIMIZE_CONVERSION_VALUE: ['MAXIMIZE_CONVERSION_VALUE'],
      TARGET_ROAS: ['MAXIMIZE_CONVERSION_VALUE', 'TARGET_ROAS'],
    };
    if (after.channel !== 'MULTI_CHANNEL' && !(accepted[strategy] || []).includes(observed)) issues.push(`bidding strategy is ${observed}`);
    if (typeof args.targetCpa === 'number' && !near(after.targetCpa, args.targetCpa)) issues.push(`target CPA is ${String(after.targetCpa)}`);
    if (typeof args.targetRoas === 'number' && !near(after.targetRoas, args.targetRoas)) issues.push(`target ROAS is ${String(after.targetRoas)}`);
    if (typeof args.maxCpcLimit === 'number' && !near(after.maxCpcCeiling, args.maxCpcLimit)) issues.push(`max CPC limit is ${String(after.maxCpcCeiling)}`);
    return issues;
  },
};

export const CAMPAIGN_OPERATIONS: OperationDescriptor[] = [
  updateCampaignStatus,
  updateCampaignBudget,
  updateCampaignName,
  updateCampaignDates,
  updateCampaignNetworks,
  updateCampaignTracking,
  updateCampaignBidding,
];
