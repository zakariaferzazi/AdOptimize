import { invalidArgument, notFound, unsupported } from '@/lib/mcp/errors';
import { cleanId, type GoogleAdsContext } from '../gaql';
import {
  listConversionActions,
  listCustomConversionGoals,
  readCampaignGoals,
  readCampaignState,
  type ConversionActionInfo,
} from '../reporting';
import { loadCampaignForWrite } from './campaign-ops';
import {
  campaignIdProperty,
  customerPath,
  humanize,
  reasonProperty,
  resultResourceNames,
  type MutationStep,
  type OperationDescriptor,
  type PlannedStep,
} from './types';

const GOAL_CATEGORIES = [
  'DEFAULT', 'PAGE_VIEW', 'PURCHASE', 'SIGNUP', 'LEAD', 'DOWNLOAD', 'ADD_TO_CART', 'BEGIN_CHECKOUT',
  'SUBSCRIBE_PAID', 'PHONE_CALL_LEAD', 'IMPORTED_LEAD', 'SUBMIT_LEAD_FORM', 'BOOK_APPOINTMENT',
  'REQUEST_QUOTE', 'GET_DIRECTIONS', 'OUTBOUND_CLICK', 'CONTACT', 'ENGAGEMENT', 'STORE_VISIT',
  'STORE_SALE', 'QUALIFIED_LEAD', 'CONVERTED_LEAD',
];

const GOAL_ORIGINS = ['WEBSITE', 'APP', 'CALL_FROM_ADS', 'STORE', 'YOUTUBE_HOSTED', 'GOOGLE_HOSTED'];

function goalKey(goal: { category: string; origin: string }): string {
  return `${goal.category}~${goal.origin}`;
}

function sorted(values: string[] | undefined): string[] {
  return [...(values || [])].sort();
}

async function conversionState(args: Record<string, unknown>, context: GoogleAdsContext) {
  const campaignId = cleanId(args.campaignId);
  const [campaign, goals] = await Promise.all([
    readCampaignState(context, campaignId, { fresh: true }),
    readCampaignGoals(context, campaignId, { fresh: true }),
  ]);
  if (!campaign) return { exists: false };
  return {
    campaignId,
    name: campaign.name,
    channel: campaign.channel,
    goalConfigLevel: goals.goalConfigLevel || 'CUSTOMER',
    customGoalResource: goals.customGoal?.resourceName || null,
    customGoalActions: sorted(goals.customGoal?.conversionActions),
    biddableGoals: goals.goals.filter((goal) => goal.biddable).map(goalKey).sort(),
    goals: goals.goals.map((goal) => ({ ...goal })).sort((a, b) => goalKey(a).localeCompare(goalKey(b))),
    selectiveActions: sorted(campaign.selectiveOptimizationActions),
  } as Record<string, unknown>;
}

function goalOperation(context: GoogleAdsContext, campaignId: string, goal: { category: string; origin: string }, biddable: boolean) {
  return {
    campaignConversionGoalOperation: {
      updateMask: 'biddable',
      update: {
        resourceName: `${customerPath(context)}/campaignConversionGoals/${campaignId}~${goal.category}~${goal.origin}`,
        biddable,
      },
    },
  };
}

// ---------------------------------------------------------------------------

export const updateCampaignConversionGoals: OperationDescriptor = {
  name: 'update_campaign_conversion_goals',
  title: 'Change campaign conversion goals',
  description:
    'Include or exclude campaign conversion goal categories (category + origin pairs, e.g. PURCHASE/WEBSITE) from a campaign\'s bidding. This works on whole categories; to bid on specific individual conversion actions use set_campaign_conversion_actions. Read get_conversion_setup first to see the campaign\'s exact goals.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      goals: {
        type: 'array',
        minItems: 1,
        maxItems: 30,
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: GOAL_CATEGORIES },
            origin: { type: 'string', enum: GOAL_ORIGINS },
            biddable: { type: 'boolean', description: 'true = bid toward this goal, false = exclude it.' },
          },
          required: ['category', 'origin', 'biddable'],
          additionalProperties: false,
        },
      },
      reason: reasonProperty,
    },
    required: ['campaignId', 'goals'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:conversion_goals`,
  async prepare(args, context) {
    const campaign = await loadCampaignForWrite(args, context);
    const current = await readCampaignGoals(context, campaign.campaignId, { fresh: true });
    const existing = new Map(current.goals.map((goal) => [goalKey(goal), goal]));
    const requested = args.goals as Array<{ category: string; origin: string; biddable: boolean }>;
    const missing = requested.filter((goal) => !existing.has(goalKey(goal)));
    if (missing.length) {
      throw notFound(
        `Goal ${missing.map((goal) => `${goal.category}/${goal.origin}`).join(', ')} on campaign "${campaign.name}"`,
        current.goals.map((goal) => ({ id: goalKey(goal), name: `${goal.category} / ${goal.origin}`, biddable: goal.biddable }))
      );
    }
    const changing = requested.filter((goal) => existing.get(goalKey(goal))?.biddable !== goal.biddable);
    if (!changing.length) throw invalidArgument('These conversion goals are already set that way on this campaign.');
    const remainingBiddable = current.goals.filter((goal) => {
      const change = changing.find((item) => goalKey(item) === goalKey(goal));
      return change ? change.biddable : goal.biddable;
    });
    const warnings: string[] = [];
    if (!remainingBiddable.length && !current.customGoal) {
      warnings.push('After this change the campaign would have no biddable conversion goals, so conversion-based bidding has nothing to optimise for.');
    }
    if ((current.goalConfigLevel || 'CUSTOMER') === 'CUSTOMER') {
      warnings.push('This switches the campaign from account-default goals to campaign-specific goals; later account goal changes will no longer apply to it.');
    }
    return {
      args: { campaignId: campaign.campaignId, goals: changing, ...(args.reason ? { reason: args.reason } : {}) },
      summary: `Update conversion goals used for bidding in "${campaign.name}".`,
      changes: changing.map(
        (goal) => `${humanize(goal.category)} (${humanize(goal.origin)}): ${goal.biddable ? 'excluded → included in bidding' : 'included → excluded from bidding'}`
      ),
      before: await conversionState(args, context),
      target: { kind: 'campaign', campaignId: campaign.campaignId, campaignName: campaign.name, label: campaign.name },
      warnings,
    };
  },
  readState: (args, context) => conversionState(args, context),
  driftKeys: ['goals'],
  plan: (args, context) => [
    {
      kind: 'combined',
      operations: (args.goals as Array<{ category: string; origin: string; biddable: boolean }>).map((goal) =>
        goalOperation(context, cleanId(args.campaignId), goal, goal.biddable)
      ),
    },
  ],
  verify(args, after) {
    const goals = (after.goals || []) as Array<{ category: string; origin: string; biddable: boolean }>;
    return (args.goals as Array<{ category: string; origin: string; biddable: boolean }>)
      .filter((goal) => goals.find((item) => goalKey(item) === goalKey(goal))?.biddable !== goal.biddable)
      .map((goal) => `${goal.category}/${goal.origin} is not ${goal.biddable ? 'biddable' : 'excluded'}`);
  },
};

// ---------------------------------------------------------------------------

function resolveActions(ids: string[], actions: ConversionActionInfo[]): ConversionActionInfo[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw notFound(
      `Conversion action ${missing.join(', ')}`,
      actions.slice(0, 15).map((action) => ({ id: action.id, name: action.name, category: action.category, origin: action.origin }))
    );
  }
  const resolved = ids.map((id) => byId.get(id)!);
  const disabled = resolved.filter((action) => action.status !== 'ENABLED');
  if (disabled.length) {
    throw invalidArgument(`Conversion action(s) ${disabled.map((action) => `"${action.name}" (${humanize(action.status)})`).join(', ')} are not enabled.`);
  }
  return resolved;
}

export const setCampaignConversionActions: OperationDescriptor = {
  name: 'set_campaign_conversion_actions',
  title: 'Optimise campaign for specific conversion actions',
  description:
    'Make one campaign bid only toward specific individual conversion actions (for example only an app install/download action). For non-App campaigns this applies a campaign-level custom conversion goal and excludes the category goals; for App campaigns it sets the app selective-optimization actions. Use get_conversion_setup to find conversion action IDs first.',
  schema: {
    type: 'object',
    properties: {
      campaignId: campaignIdProperty,
      conversionActionIds: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string' } },
      reason: reasonProperty,
    },
    required: ['campaignId', 'conversionActionIds'],
    additionalProperties: false,
  },
  internalArgs: ['mode', 'reuseCustomGoal', 'customGoalName'],
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:conversion_goals`,
  async prepare(args, context) {
    const campaign = await loadCampaignForWrite(args, context);
    const ids = [...new Set((args.conversionActionIds as string[]).map((id) => cleanId(id)).filter(Boolean))];
    if (!ids.length) throw invalidArgument('conversionActionIds must contain numeric conversion action IDs.');
    const actions = resolveActions(ids, await listConversionActions(context, { fresh: true }));
    const resources = sorted(actions.map((action) => action.resourceName));
    const before = await conversionState(args, context);
    const warnings = ['Changing what a campaign optimises for resets bidding learning; expect 1–2 weeks of fluctuation.'];
    const names = actions.map((action) => `"${action.name}" (${humanize(action.category)})`).join(', ');

    if (campaign.channel === 'MULTI_CHANNEL') {
      if (JSON.stringify(before.selectiveActions) === JSON.stringify(resources)) {
        throw invalidArgument('This App campaign already optimises for exactly these conversion actions.');
      }
      const nonApp = actions.filter((action) => action.origin && action.origin !== 'APP');
      if (nonApp.length) warnings.push(`Some selected actions are not app conversions (${nonApp.map((a) => a.name).join(', ')}); Google Ads may reject them.`);
      return {
        args: { campaignId: campaign.campaignId, conversionActionIds: ids, mode: 'APP_SELECTIVE_OPTIMIZATION', ...(args.reason ? { reason: args.reason } : {}) },
        summary: `Make App campaign "${campaign.name}" optimise only for ${names}.`,
        changes: [`App optimisation actions: ${(before.selectiveActions as string[]).length || 'default'} → ${names}`],
        before,
        target: { kind: 'campaign', campaignId: campaign.campaignId, campaignName: campaign.name, label: campaign.name },
        warnings,
      };
    }

    if (JSON.stringify(before.customGoalActions) === JSON.stringify(resources) && !(before.biddableGoals as string[]).length) {
      throw invalidArgument('This campaign already bids only toward exactly these conversion actions.');
    }
    const reusable = (await listCustomConversionGoals(context, { fresh: true })).find(
      (goal) => JSON.stringify(sorted(goal.conversionActions)) === JSON.stringify(resources)
    );
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const customGoalName = `${campaign.name}`.slice(0, 60) + ` - selected actions ${stamp}`;
    const biddable = before.biddableGoals as string[];
    return {
      args: {
        campaignId: campaign.campaignId,
        conversionActionIds: ids,
        mode: 'CUSTOM_GOAL',
        ...(reusable ? { reuseCustomGoal: reusable.resourceName } : { customGoalName }),
        ...(args.reason ? { reason: args.reason } : {}),
      },
      summary: `Make "${campaign.name}" bid only toward ${names}.`,
      changes: [
        `Campaign goal source: ${humanize(before.goalConfigLevel)} goals → campaign custom goal${reusable ? ` "${reusable.name}" (existing)` : ' (new)'} with ${names}`,
        ...(biddable.length ? [`Category goals excluded from bidding: ${biddable.map((key) => humanize(key.replace('~', ' / '))).join(', ')}`] : []),
      ],
      before,
      target: { kind: 'campaign', campaignId: campaign.campaignId, campaignName: campaign.name, label: campaign.name },
      warnings,
    };
  },
  readState: (args, context) => conversionState(args, context),
  driftKeys: ['goalConfigLevel', 'customGoalResource', 'customGoalActions', 'biddableGoals', 'selectiveActions'],
  plan(args, context, state) {
    const campaignId = cleanId(args.campaignId);
    const customer = customerPath(context);
    const actionResources = (args.conversionActionIds as string[]).map((id) => `${customer}/conversionActions/${cleanId(id)}`);

    if (args.mode === 'APP_SELECTIVE_OPTIMIZATION') {
      return [
        {
          kind: 'service',
          service: 'campaigns',
          operations: [
            {
              updateMask: 'selectiveOptimization.conversionActions',
              update: { resourceName: `${customer}/campaigns/${campaignId}`, selectiveOptimization: { conversionActions: actionResources } },
            },
          ],
        },
      ];
    }

    const biddable = ((state.goals || []) as Array<{ category: string; origin: string; biddable: boolean }>).filter((goal) => goal.biddable);
    const applyGoal = (goalResource: string): MutationStep => ({
      kind: 'combined',
      operations: [
        {
          conversionGoalCampaignConfigOperation: {
            updateMask: 'customConversionGoal',
            update: { resourceName: `${customer}/conversionGoalCampaignConfigs/${campaignId}`, customConversionGoal: goalResource },
          },
        },
        ...biddable.map((goal) => goalOperation(context, campaignId, goal, false)),
      ],
    });

    if (typeof args.reuseCustomGoal === 'string') return [applyGoal(args.reuseCustomGoal)];

    const steps: PlannedStep[] = [
      {
        kind: 'service',
        service: 'customConversionGoals',
        operations: [{ create: { name: String(args.customGoalName), conversionActions: actionResources, status: 'ENABLED' } }],
      },
      (prior) => {
        const created = resultResourceNames(prior[0])[0];
        return created ? applyGoal(created) : null;
      },
    ];
    return steps;
  },
  realIds(_args, results): Record<string, string> {
    const created = resultResourceNames(results[0]).find((name) => name.includes('/customConversionGoals/'));
    return created ? { customConversionGoalId: cleanId(created.split('/').pop()) } : {};
  },
  verify(args, after) {
    const issues: string[] = [];
    const expected = sorted((args.conversionActionIds as string[]).map((id) => cleanId(id)));
    const idsOf = (resources: unknown) => sorted(((resources || []) as string[]).map((resource) => cleanId(resource.split('/').pop())));
    if (args.mode === 'APP_SELECTIVE_OPTIMIZATION') {
      if (JSON.stringify(idsOf(after.selectiveActions)) !== JSON.stringify(expected)) issues.push('app optimisation actions differ');
      return issues;
    }
    if (after.goalConfigLevel !== 'CAMPAIGN') issues.push(`goal configuration level is ${String(after.goalConfigLevel)}`);
    if (JSON.stringify(idsOf(after.customGoalActions)) !== JSON.stringify(expected)) issues.push('custom goal actions differ');
    if (((after.biddableGoals || []) as string[]).length) issues.push(`category goals still biddable: ${(after.biddableGoals as string[]).join(', ')}`);
    return issues;
  },
};

// ---------------------------------------------------------------------------

export const useAccountConversionGoals: OperationDescriptor = {
  name: 'use_account_conversion_goals',
  title: 'Revert to account conversion goals',
  description:
    'Make a campaign follow the account-level (customer) conversion goals again, removing campaign-specific goal settings and custom goals from it.',
  schema: {
    type: 'object',
    properties: { campaignId: campaignIdProperty, reason: reasonProperty },
    required: ['campaignId'],
    additionalProperties: false,
  },
  actionType: () => 'UPDATE_SETTINGS',
  destructive: () => false,
  targetKey: (args) => `campaign:${cleanId(args.campaignId)}:conversion_goals`,
  async prepare(args, context) {
    const campaign = await loadCampaignForWrite(args, context);
    if (campaign.channel === 'MULTI_CHANNEL') {
      throw unsupported('App campaigns do not use account-level goal configuration; change their optimisation actions instead.');
    }
    const before = await conversionState(args, context);
    if (before.goalConfigLevel === 'CUSTOMER') throw invalidArgument(`"${campaign.name}" already uses the account conversion goals.`);
    return {
      args: { campaignId: campaign.campaignId, ...(args.reason ? { reason: args.reason } : {}) },
      summary: `Make "${campaign.name}" use the account-level conversion goals again.`,
      changes: ['Goal source: campaign-specific → account goals'],
      before,
      target: { kind: 'campaign', campaignId: campaign.campaignId, campaignName: campaign.name, label: campaign.name },
      warnings: ['Bidding will start optimising for the account goals; expect a learning period.'],
    };
  },
  readState: (args, context) => conversionState(args, context),
  driftKeys: ['goalConfigLevel', 'customGoalResource'],
  plan: (args, context) => [
    {
      kind: 'service',
      service: 'conversionGoalCampaignConfigs',
      operations: [
        {
          updateMask: 'goalConfigLevel',
          update: {
            resourceName: `${customerPath(context)}/conversionGoalCampaignConfigs/${cleanId(args.campaignId)}`,
            goalConfigLevel: 'CUSTOMER',
          },
        },
      ],
    },
  ],
  verify: (_args, after) => (after.goalConfigLevel === 'CUSTOMER' ? [] : [`goal configuration level is ${String(after.goalConfigLevel)}`]),
};

export const CONVERSION_OPERATIONS: OperationDescriptor[] = [
  updateCampaignConversionGoals,
  setCampaignConversionActions,
  useAccountConversionGoals,
];
