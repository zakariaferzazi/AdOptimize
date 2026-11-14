import { invalidArgument, notFound, unsupported } from '@/lib/mcp/errors';
import { cleanId, isIsoDate, round, toMicros, type GoogleAdsContext } from '../gaql';
import { normalizeGeoName, parseGeoTargetId, resolveLocationInputs, type GeoTarget } from '../geo';
import {
  readCampaignLocations,
  readCampaignState,
  resolveCampaign,
  type CampaignLocationCriterion,
  type CampaignState,
} from '../reporting';
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

// ---------------------------------------------------------------------------

function formatLocationLabel(loc: { canonicalName?: string; name?: string; id: string }): string {
  return `${loc.canonicalName || loc.name || loc.id} (${loc.id})`;
}

export const updateCampaignLocations: OperationDescriptor = {
  name: 'update_campaign_locations',
  title: 'Change location targeting',
  description:
    'Set, add, or remove targeted and excluded locations on an existing campaign, or change its positive/negative geo target options (e.g. PRESENCE vs PRESENCE_OR_INTEREST). Supports country, state/region, city names, or numeric geo target IDs.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      setLocations: {
        type: 'array',
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description:
          'Replace ALL current targeted locations with this exact list (names or numeric geo target IDs). Pass [] only to remove all specific targets and target all countries/territories. Do not combine with addLocations.',
      },
      addLocations: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description: 'Add targeted locations while keeping existing targeted locations.',
      },
      excludeLocations: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description: 'Add excluded (negative) locations while keeping existing exclusions.',
      },
      removeLocations: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description: 'Remove existing targeted or excluded locations (by name, geo target ID, or criterion ID).',
      },
      positiveGeoTargetType: {
        type: 'string',
        enum: ['PRESENCE_OR_INTEREST', 'PRESENCE', 'SEARCH_INTEREST'],
        description:
          'Target option for included locations: PRESENCE_OR_INTEREST (in, regularly in, or interested in), PRESENCE (people in or regularly in), or SEARCH_INTEREST (Search only).',
      },
      negativeGeoTargetType: {
        type: 'string',
        enum: ['PRESENCE_OR_INTEREST', 'PRESENCE'],
        description: 'Exclusion option: PRESENCE_OR_INTEREST or PRESENCE.',
      },
      reason: reasonProperty,
    },
    required: ['campaignId'],
    additionalProperties: false,
  },
  internalArgs: ['resolvedCreates', 'resolvedRemovals', 'expectedTargetedGeoConstants', 'expectedExcludedGeoConstants'],
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:locations`,
  async prepare(args, context) {
    const hasLocationAction =
      args.setLocations !== undefined ||
      args.addLocations !== undefined ||
      args.excludeLocations !== undefined ||
      args.removeLocations !== undefined ||
      args.positiveGeoTargetType !== undefined ||
      args.negativeGeoTargetType !== undefined;
    if (!hasLocationAction) {
      throw invalidArgument(
        'Provide setLocations, addLocations, excludeLocations, removeLocations, positiveGeoTargetType, or negativeGeoTargetType.'
      );
    }
    if (args.setLocations !== undefined && args.addLocations !== undefined) {
      throw invalidArgument('Use setLocations to replace targeted locations or addLocations to add to them, not both.');
    }

    const state = await loadCampaignForWrite(args, context);
    if (args.positiveGeoTargetType === 'SEARCH_INTEREST' && state.channel !== 'SEARCH') {
      throw unsupported(`SEARCH_INTEREST location targeting is only supported for Search campaigns; "${state.name}" is ${humanize(state.channel)}.`);
    }

    const current = await readCampaignLocations(context, state.campaignId, { fresh: true });
    const allExisting: CampaignLocationCriterion[] = [...current.targeted, ...current.excluded];

    const setRaw = Array.isArray(args.setLocations) ? (args.setLocations as string[]) : undefined;
    const addRaw = Array.isArray(args.addLocations) ? (args.addLocations as string[]) : [];
    const excludeRaw = Array.isArray(args.excludeLocations) ? (args.excludeLocations as string[]) : [];
    const removeRaw = Array.isArray(args.removeLocations) ? (args.removeLocations as string[]) : [];

    const [setResolved, addResolved, excludeResolved]: [GeoTarget[] | undefined, GeoTarget[], GeoTarget[]] = await Promise.all([
      setRaw !== undefined ? (setRaw.length ? resolveLocationInputs(context, setRaw, 'target location') : Promise.resolve([])) : Promise.resolve(undefined),
      addRaw.length ? resolveLocationInputs(context, addRaw, 'target location') : Promise.resolve([]),
      excludeRaw.length ? resolveLocationInputs(context, excludeRaw, 'excluded location') : Promise.resolve([]),
    ]);

    const removalsMap = new Map<string, CampaignLocationCriterion>();
    const missingRemovals: string[] = [];

    for (const raw of removeRaw) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const numericId = cleanId(trimmed);
      const geoId = parseGeoTargetId(trimmed);
      const norm = normalizeGeoName(trimmed);
      const directMatches = allExisting.filter(
        (item) =>
          (numericId && item.criterionId === numericId) ||
          (geoId && item.id === geoId) ||
          item.geoTargetConstant.toLowerCase() === trimmed.toLowerCase() ||
          (item.canonicalName && normalizeGeoName(item.canonicalName) === norm) ||
          (item.name && normalizeGeoName(item.name) === norm)
      );
      if (directMatches.length > 0) {
        for (const matched of directMatches) removalsMap.set(matched.resourceName, matched);
        continue;
      }
      const [resolved] = await resolveLocationInputs(context, [trimmed], 'location to remove');
      const byGeo = allExisting.filter((item) => item.geoTargetConstant === resolved.resourceName);
      if (byGeo.length > 0) {
        for (const matched of byGeo) removalsMap.set(matched.resourceName, matched);
      } else {
        missingRemovals.push(resolved.canonicalName || resolved.name || trimmed);
      }
    }

    if (setResolved !== undefined) {
      const keepSet = new Set(setResolved.map((item) => item.resourceName));
      for (const existing of current.targeted) {
        if (!keepSet.has(existing.geoTargetConstant)) {
          removalsMap.set(existing.resourceName, existing);
        }
      }
    }

    const remainingTargeted = current.targeted.filter((item) => !removalsMap.has(item.resourceName));
    const remainingExcluded = current.excluded.filter((item) => !removalsMap.has(item.resourceName));
    const remainingTargetSet = new Set(remainingTargeted.map((item) => item.geoTargetConstant));
    const remainingExcludeSet = new Set(remainingExcluded.map((item) => item.geoTargetConstant));

    const desiredTargets = setResolved !== undefined ? setResolved : addResolved;
    if (desiredTargets.length && excludeResolved.length) {
      const desiredSet = new Set(desiredTargets.map((item) => item.resourceName));
      const clash = excludeResolved.find((item) => desiredSet.has(item.resourceName));
      if (clash) {
        throw invalidArgument(`Location "${clash.canonicalName || clash.name}" cannot be both targeted and excluded.`);
      }
    }

    const warnings: string[] = [];
    if (missingRemovals.length) {
      warnings.push(`Not currently on this campaign (skipped removal): ${missingRemovals.join(', ')}.`);
    }

    const resolvedCreates: Array<{ geoTargetConstant: string; negative: boolean; id: string; label: string }> = [];
    const skippedTargets: string[] = [];
    const skippedExcludes: string[] = [];

    for (const loc of desiredTargets) {
      if (remainingExcludeSet.has(loc.resourceName)) {
        throw invalidArgument(
          `Location "${loc.canonicalName || loc.name}" is currently excluded on "${state.name}". Include it in removeLocations if you want to remove the exclusion and target it.`
        );
      }
      if (remainingTargetSet.has(loc.resourceName)) {
        if (addRaw.length) skippedTargets.push(loc.canonicalName || loc.name);
        continue;
      }
      resolvedCreates.push({
        geoTargetConstant: loc.resourceName,
        negative: false,
        id: loc.id,
        label: loc.canonicalName || loc.name,
      });
    }

    const resultingTargetSet = new Set([
      ...remainingTargeted.map((item) => item.geoTargetConstant),
      ...resolvedCreates.filter((item) => !item.negative).map((item) => item.geoTargetConstant),
    ]);

    for (const loc of excludeResolved) {
      if (resultingTargetSet.has(loc.resourceName)) {
        throw invalidArgument(
          `Location "${loc.canonicalName || loc.name}" is targeted on "${state.name}". Remove it from targeted locations before excluding it.`
        );
      }
      if (remainingExcludeSet.has(loc.resourceName)) {
        skippedExcludes.push(loc.canonicalName || loc.name);
        continue;
      }
      resolvedCreates.push({
        geoTargetConstant: loc.resourceName,
        negative: true,
        id: loc.id,
        label: loc.canonicalName || loc.name,
      });
    }

    if (skippedTargets.length) warnings.push(`Already targeted (kept as is): ${skippedTargets.join(', ')}.`);
    if (skippedExcludes.length) warnings.push(`Already excluded (kept as is): ${skippedExcludes.join(', ')}.`);

    const positiveSetting =
      typeof args.positiveGeoTargetType === 'string' &&
      args.positiveGeoTargetType !== state.geoTargetTypeSetting?.positiveGeoTargetType
        ? args.positiveGeoTargetType
        : undefined;
    const negativeSetting =
      typeof args.negativeGeoTargetType === 'string' &&
      args.negativeGeoTargetType !== state.geoTargetTypeSetting?.negativeGeoTargetType
        ? args.negativeGeoTargetType
        : undefined;

    const resolvedRemovals = [...removalsMap.values()].map((item) => ({
      resourceName: item.resourceName,
      geoTargetConstant: item.geoTargetConstant,
      negative: item.negative,
      id: item.id,
      label: item.canonicalName || item.name || item.id,
    }));

    if (!resolvedCreates.length && !resolvedRemovals.length && !positiveSetting && !negativeSetting) {
      if (missingRemovals.length) {
        throw invalidArgument(`None of those locations (${missingRemovals.join(', ')}) are currently configured on "${state.name}".`);
      }
      throw invalidArgument(`Campaign "${state.name}" already has the requested location targeting.`);
    }

    const expectedTargetedGeoConstants = [
      ...new Set([
        ...remainingTargeted.map((item) => item.geoTargetConstant),
        ...resolvedCreates.filter((item) => !item.negative).map((item) => item.geoTargetConstant),
      ]),
    ].sort();
    const expectedExcludedGeoConstants = [
      ...new Set([
        ...remainingExcluded.map((item) => item.geoTargetConstant),
        ...resolvedCreates.filter((item) => item.negative).map((item) => item.geoTargetConstant),
      ]),
    ].sort();

    if (expectedTargetedGeoConstants.length === 0 && resolvedRemovals.some((item) => !item.negative)) {
      warnings.push('No specific targeted locations will remain, so Google Ads will target all countries and territories by default.');
    }

    const changes: string[] = [];
    for (const item of resolvedCreates.filter((entry) => !entry.negative)) {
      changes.push(`+ Target: ${item.label} (${item.id})`);
    }
    for (const item of resolvedRemovals.filter((entry) => !entry.negative)) {
      changes.push(`− Remove target: ${item.label} (${item.id})`);
    }
    for (const item of resolvedCreates.filter((entry) => entry.negative)) {
      changes.push(`+ Exclude: ${item.label} (${item.id})`);
    }
    for (const item of resolvedRemovals.filter((entry) => entry.negative)) {
      changes.push(`− Remove exclusion: ${item.label} (${item.id})`);
    }
    if (positiveSetting) {
      changes.push(
        `Positive location option: ${state.geoTargetTypeSetting?.positiveGeoTargetType ? humanize(state.geoTargetTypeSetting.positiveGeoTargetType) : 'default'} → ${humanize(positiveSetting)}`
      );
    }
    if (negativeSetting) {
      changes.push(
        `Exclusion location option: ${state.geoTargetTypeSetting?.negativeGeoTargetType ? humanize(state.geoTargetTypeSetting.negativeGeoTargetType) : 'default'} → ${humanize(negativeSetting)}`
      );
    }

    const normalized: Record<string, unknown> = {
      campaignId: state.campaignId,
      resolvedCreates: resolvedCreates.map(({ geoTargetConstant, negative }) => ({ geoTargetConstant, negative })),
      resolvedRemovals: resolvedRemovals.map(({ resourceName }) => resourceName),
      expectedTargetedGeoConstants,
      expectedExcludedGeoConstants,
      ...(setResolved !== undefined ? { setLocations: setResolved.map((item) => formatLocationLabel(item)) } : {}),
      ...(addResolved.length ? { addLocations: addResolved.map((item) => formatLocationLabel(item)) } : {}),
      ...(excludeResolved.length ? { excludeLocations: excludeResolved.map((item) => formatLocationLabel(item)) } : {}),
      ...(removeRaw.length ? { removeLocations: removeRaw } : {}),
      ...(positiveSetting ? { positiveGeoTargetType: positiveSetting } : {}),
      ...(negativeSetting ? { negativeGeoTargetType: negativeSetting } : {}),
      ...(args.reason ? { reason: args.reason } : {}),
    };

    return {
      args: normalized,
      summary: `Update location targeting for "${state.name}".`,
      changes,
      before: {
        campaignId: state.campaignId,
        name: state.name,
        targetedGeoConstants: current.targeted.map((item) => item.geoTargetConstant).sort(),
        excludedGeoConstants: current.excluded.map((item) => item.geoTargetConstant).sort(),
        positiveGeoTargetType: state.geoTargetTypeSetting?.positiveGeoTargetType,
        negativeGeoTargetType: state.geoTargetTypeSetting?.negativeGeoTargetType,
      },
      target: campaignTarget(state),
      warnings,
    };
  },
  async readState(args, context) {
    const id = cleanId(args.campaignId);
    const [state, current] = await Promise.all([
      readCampaignState(context, id, { fresh: true }),
      readCampaignLocations(context, id, { fresh: true }),
    ]);
    if (!state || state.status === 'REMOVED') return { exists: false };
    return {
      exists: true,
      name: state.name,
      targetedGeoConstants: current.targeted.map((item) => item.geoTargetConstant).sort(),
      excludedGeoConstants: current.excluded.map((item) => item.geoTargetConstant).sort(),
      positiveGeoTargetType: state.geoTargetTypeSetting?.positiveGeoTargetType,
      negativeGeoTargetType: state.geoTargetTypeSetting?.negativeGeoTargetType,
    };
  },
  driftKeys: ['targetedGeoConstants', 'excludedGeoConstants', 'positiveGeoTargetType', 'negativeGeoTargetType'],
  plan(args, context) {
    const campaign = campaignResource(context, args.campaignId);
    const removals = (args.resolvedRemovals || []) as string[];
    const creates = (args.resolvedCreates || []) as Array<{ geoTargetConstant: string; negative: boolean }>;

    const steps = [];
    const criteriaOps = [
      ...removals.map((resourceName) => ({ remove: resourceName })),
      ...creates.map((item) => ({
        create: {
          campaign,
          negative: item.negative,
          location: { geoTargetConstant: item.geoTargetConstant },
        },
      })),
    ];

    if (criteriaOps.length) {
      steps.push({
        kind: 'service' as const,
        service: 'campaignCriteria' as const,
        operations: criteriaOps,
      });
    }

    if (args.positiveGeoTargetType || args.negativeGeoTargetType) {
      const geoTargetTypeSetting: Record<string, unknown> = {};
      const masks: string[] = [];
      if (args.positiveGeoTargetType) {
        geoTargetTypeSetting.positiveGeoTargetType = args.positiveGeoTargetType;
        masks.push('geoTargetTypeSetting.positiveGeoTargetType');
      }
      if (args.negativeGeoTargetType) {
        geoTargetTypeSetting.negativeGeoTargetType = args.negativeGeoTargetType;
        masks.push('geoTargetTypeSetting.negativeGeoTargetType');
      }
      steps.push({
        kind: 'service' as const,
        service: 'campaigns' as const,
        operations: [{ updateMask: masks.join(','), update: { resourceName: campaign, geoTargetTypeSetting } }],
      });
    }

    return steps;
  },
  verify(args, after) {
    const issues: string[] = [];
    const observedTargeted = (after.targetedGeoConstants || []) as string[];
    const observedExcluded = (after.excludedGeoConstants || []) as string[];
    const expectedTargeted = (args.expectedTargetedGeoConstants || []) as string[];
    const expectedExcluded = (args.expectedExcludedGeoConstants || []) as string[];

    if (JSON.stringify([...observedTargeted].sort()) !== JSON.stringify([...expectedTargeted].sort())) {
      issues.push('targeted locations differ from proposal');
    }
    if (JSON.stringify([...observedExcluded].sort()) !== JSON.stringify([...expectedExcluded].sort())) {
      issues.push('excluded locations differ from proposal');
    }
    if (args.positiveGeoTargetType && after.positiveGeoTargetType !== args.positiveGeoTargetType) {
      issues.push(`positiveGeoTargetType is ${String(after.positiveGeoTargetType)}`);
    }
    if (args.negativeGeoTargetType && after.negativeGeoTargetType !== args.negativeGeoTargetType) {
      issues.push(`negativeGeoTargetType is ${String(after.negativeGeoTargetType)}`);
    }
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
  updateCampaignLocations,
];
