import type { MutateOperation, MutateService } from './mutate';

/**
 * Declarative Google Ads operation catalog.
 *
 * Every write the AI agent can propose is described here once. The MCP tool
 * list, the parameter validator, the proposal engine and the read-back verifier
 * all read from this single source, so a new edit is a data entry rather than a
 * new code path.
 */

export type OperationRisk = 'read' | 'write';

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  minimum?: number;
  maximum?: number;
}

export interface OperationSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: false;
}

export interface CampaignSnapshot {
  campaignId: string;
  name: string;
  status: string;
  budgetDaily?: number;
  biddingStrategyType?: string;
  targetCpaMicros?: number;
  targetRoas?: number;
  startDate?: string;
  endDate?: string;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  targetGoogleSearch?: boolean;
  targetSearchNetwork?: boolean;
  targetContentNetwork?: boolean;
  targetPartnerSearchNetwork?: boolean;
  budgetResourceName?: string;
  resourceName?: string;
}

export interface OperationContext {
  customerId: string;
  campaign?: CampaignSnapshot;
  /** Present for creation operations, which have no existing campaign. */
  accountCurrency?: string;
}

export interface BuiltMutateGroup {
  service: MutateService;
  operations: MutateOperation[];
}

export interface BuiltCombinedMutate {
  /** Combined `googleAds:mutate` operations, used for atomic multi-resource creates. */
  combined: Array<Record<string, unknown>>;
}

export interface OperationDescriptor {
  name: string;
  description: string;
  risk: OperationRisk;
  schema: OperationSchema;
  /** True when the operation creates a new resource instead of editing one. */
  createsResource?: boolean;
  /** Human-readable summary shown on the approval card. */
  summarize(args: Record<string, unknown>, context: OperationContext): string;
  /** Fields captured before the change, used for drift detection. */
  beforeSnapshot(args: Record<string, unknown>, context: OperationContext): Record<string, unknown>;
  /** Mutate operations sent to Google Ads. */
  buildOperations(args: Record<string, unknown>, context: OperationContext): BuiltMutateGroup[];
  /** Combined mutate for atomic multi-resource creates. */
  buildCombined?(args: Record<string, unknown>, context: OperationContext): BuiltCombinedMutate;
  /** True when a fresh read-back proves the requested change took effect. */
  verify(args: Record<string, unknown>, after: CampaignSnapshot): boolean;
  /** Fields that must match between the proposal snapshot and the live account. */
  driftFields: Array<keyof CampaignSnapshot>;
}

function campaignResource(customerId: string, campaignId: string): string {
  return `customers/${customerId.replace(/\D/g, '')}/campaigns/${String(campaignId).replace(/\D/g, '')}`;
}

function budgetResource(customerId: string, budgetId: string): string {
  return `customers/${customerId.replace(/\D/g, '')}/campaignBudgets/${String(budgetId).replace(/\D/g, '')}`;
}

function budgetIdFromResource(resourceName?: string): string | undefined {
  if (!resourceName) return undefined;
  const match = /campaignBudgets\/(\d+)/.exec(resourceName);
  return match?.[1];
}

function requireCampaign(context: OperationContext): CampaignSnapshot {
  if (!context.campaign) {
    throw new Error('The target campaign could not be resolved from the live account.');
  }
  return context.campaign;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`"${key}" is required.`);
  }
  return value.trim();
}

function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = Number(args[key]);
  if (!Number.isFinite(value)) throw new Error(`"${key}" must be a number.`);
  return value;
}

const campaignIdProperty: JsonSchemaProperty = {
  type: 'string',
  description: 'Canonical Google Ads campaign ID from the account index.',
};

export const OPERATION_CATALOG: OperationDescriptor[] = [
  {
    name: 'update_campaign_status',
    description:
      'Pause or enable a Google Ads campaign. Pausing stops all delivery immediately; enabling resumes auctions.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        status: { type: 'string', enum: ['PAUSED', 'ENABLED'], description: 'Target campaign status.' },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId', 'status'],
      additionalProperties: false,
    },
    summarize(args) {
      const status = String(args.status);
      return status === 'PAUSED'
        ? 'Pause the campaign and stop all ad delivery.'
        : 'Enable the campaign and resume ad delivery.';
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return { campaignId: campaign.campaignId, status: campaign.status };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const status = requireString(args, 'status');
      if (status !== 'PAUSED' && status !== 'ENABLED') {
        throw new Error('Status must be PAUSED or ENABLED.');
      }
      return [
        {
          service: 'campaigns',
          operations: [
            {
              updateMask: 'status',
              update: { resourceName: campaignResource(context.customerId, campaign.campaignId), status },
            },
          ],
        },
      ];
    },
    verify(args, after) {
      return after.status === String(args.status);
    },
    driftFields: ['campaignId', 'status'],
  },
  {
    name: 'update_campaign_budget',
    description: 'Change the daily budget of a Google Ads campaign.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        newDailyBudget: { type: 'number', description: 'New daily budget in account currency.', minimum: 0.01 },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId', 'newDailyBudget'],
      additionalProperties: false,
    },
    summarize(args) {
      return `Change the daily budget to ${requireNumber(args, 'newDailyBudget').toFixed(2)}.`;
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return { campaignId: campaign.campaignId, budgetDaily: campaign.budgetDaily };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const newDailyBudget = requireNumber(args, 'newDailyBudget');
      if (newDailyBudget <= 0) throw new Error('Daily budget must be greater than zero.');
      const budgetId = budgetIdFromResource(campaign.budgetResourceName);
      if (!budgetId) {
        throw new Error('The campaign budget resource could not be resolved from the live account.');
      }
      return [
        {
          service: 'campaignBudgets',
          operations: [
            {
              updateMask: 'amountMicros',
              update: {
                resourceName: budgetResource(context.customerId, budgetId),
                amountMicros: String(Math.round(newDailyBudget * 1_000_000)),
              },
            },
          ],
        },
      ];
    },
    verify(args, after) {
      const expected = requireNumber(args, 'newDailyBudget');
      return typeof after.budgetDaily === 'number' && Math.abs(after.budgetDaily - expected) <= 0.01;
    },
    driftFields: ['campaignId', 'budgetDaily'],
  },
  {
    name: 'update_campaign_name',
    description: 'Rename a Google Ads campaign.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        newName: { type: 'string', description: 'New campaign name.' },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId', 'newName'],
      additionalProperties: false,
    },
    summarize(args) {
      return `Rename the campaign to "${requireString(args, 'newName')}".`;
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return { campaignId: campaign.campaignId, name: campaign.name };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const newName = requireString(args, 'newName');
      return [
        {
          service: 'campaigns',
          operations: [
            {
              updateMask: 'name',
              update: { resourceName: campaignResource(context.customerId, campaign.campaignId), name: newName },
            },
          ],
        },
      ];
    },
    verify(args, after) {
      return after.name === String(args.newName);
    },
    driftFields: ['campaignId', 'name'],
  },
  {
    name: 'update_campaign_dates',
    description: 'Set or clear the start and end date of a Google Ads campaign.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        startDate: { type: 'string', description: 'Start date as YYYY-MM-DD.' },
        endDate: { type: 'string', description: 'End date as YYYY-MM-DD, or empty to run indefinitely.' },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId'],
      additionalProperties: false,
    },
    summarize(args) {
      const parts: string[] = [];
      if (args.startDate) parts.push(`start ${String(args.startDate)}`);
      if (args.endDate) parts.push(`end ${String(args.endDate)}`);
      return parts.length ? `Set campaign schedule: ${parts.join(', ')}.` : 'Clear the campaign schedule.';
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return { campaignId: campaign.campaignId, startDate: campaign.startDate, endDate: campaign.endDate };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const update: Record<string, unknown> = {
        resourceName: campaignResource(context.customerId, campaign.campaignId),
      };
      const masks: string[] = [];
      if (typeof args.startDate === 'string') {
        update.startDate = args.startDate;
        masks.push('startDate');
      }
      if (typeof args.endDate === 'string') {
        update.endDate = args.endDate;
        masks.push('endDate');
      }
      if (!masks.length) throw new Error('Provide a start date, an end date, or both.');
      return [{ service: 'campaigns', operations: [{ updateMask: masks.join(','), update }] }];
    },
    verify(args, after) {
      if (typeof args.startDate === 'string' && after.startDate !== args.startDate) return false;
      if (typeof args.endDate === 'string' && after.endDate !== args.endDate) return false;
      return true;
    },
    driftFields: ['campaignId', 'startDate', 'endDate'],
  },
  {
    name: 'update_campaign_network_settings',
    description:
      'Change where a Search campaign serves: Google Search, search partners, and Display expansion.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        targetGoogleSearch: { type: 'boolean', description: 'Serve on Google Search.' },
        targetSearchNetwork: { type: 'boolean', description: 'Serve on search partner sites.' },
        targetContentNetwork: { type: 'boolean', description: 'Serve on the Display Network.' },
        targetPartnerSearchNetwork: { type: 'boolean', description: 'Serve on partner search sites.' },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId'],
      additionalProperties: false,
    },
    summarize() {
      return 'Update the campaign network settings.';
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return {
        campaignId: campaign.campaignId,
        targetGoogleSearch: campaign.targetGoogleSearch,
        targetSearchNetwork: campaign.targetSearchNetwork,
        targetContentNetwork: campaign.targetContentNetwork,
        targetPartnerSearchNetwork: campaign.targetPartnerSearchNetwork,
      };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const network: Record<string, unknown> = {};
      const masks: string[] = [];
      for (const key of [
        'targetGoogleSearch',
        'targetSearchNetwork',
        'targetContentNetwork',
        'targetPartnerSearchNetwork',
      ]) {
        if (typeof args[key] === 'boolean') {
          network[key] = args[key];
          masks.push(`networkSettings.${key}`);
        }
      }
      if (!masks.length) throw new Error('Provide at least one network setting to change.');
      return [
        {
          service: 'campaigns',
          operations: [
            {
              updateMask: masks.join(','),
              update: {
                resourceName: campaignResource(context.customerId, campaign.campaignId),
                networkSettings: network,
              },
            },
          ],
        },
      ];
    },
    verify(args, after) {
      for (const key of [
        'targetGoogleSearch',
        'targetSearchNetwork',
        'targetContentNetwork',
        'targetPartnerSearchNetwork',
      ] as const) {
        if (typeof args[key] === 'boolean' && after[key] !== args[key]) return false;
      }
      return true;
    },
    driftFields: ['campaignId'],
  },
  {
    name: 'update_campaign_tracking',
    description: 'Set the tracking template or final URL suffix for a campaign.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        trackingUrlTemplate: { type: 'string', description: 'Tracking template URL.' },
        finalUrlSuffix: { type: 'string', description: 'Final URL suffix parameters.' },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId'],
      additionalProperties: false,
    },
    summarize() {
      return 'Update the campaign tracking template or final URL suffix.';
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return {
        campaignId: campaign.campaignId,
        trackingUrlTemplate: campaign.trackingUrlTemplate,
        finalUrlSuffix: campaign.finalUrlSuffix,
      };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const update: Record<string, unknown> = {
        resourceName: campaignResource(context.customerId, campaign.campaignId),
      };
      const masks: string[] = [];
      if (typeof args.trackingUrlTemplate === 'string') {
        update.trackingUrlTemplate = args.trackingUrlTemplate;
        masks.push('trackingUrlTemplate');
      }
      if (typeof args.finalUrlSuffix === 'string') {
        update.finalUrlSuffix = args.finalUrlSuffix;
        masks.push('finalUrlSuffix');
      }
      if (!masks.length) throw new Error('Provide a tracking template or a final URL suffix.');
      return [{ service: 'campaigns', operations: [{ updateMask: masks.join(','), update }] }];
    },
    verify(args, after) {
      if (
        typeof args.trackingUrlTemplate === 'string' &&
        after.trackingUrlTemplate !== args.trackingUrlTemplate
      ) {
        return false;
      }
      if (typeof args.finalUrlSuffix === 'string' && after.finalUrlSuffix !== args.finalUrlSuffix) {
        return false;
      }
      return true;
    },
    driftFields: ['campaignId'],
  },
  {
    name: 'update_campaign_bidding_strategy',
    description:
      'Change the bidding strategy of a campaign, including target CPA or target ROAS. Changing the strategy resets the learning period.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        strategy: {
          type: 'string',
          enum: [
            'MANUAL_CPC',
            'MAXIMIZE_CLICKS',
            'MAXIMIZE_CONVERSIONS',
            'MAXIMIZE_CONVERSION_VALUE',
            'TARGET_CPA',
            'TARGET_ROAS',
          ],
          description: 'Bidding strategy to apply.',
        },
        targetCpa: { type: 'number', description: 'Target CPA in account currency (TARGET_CPA only).', minimum: 0.01 },
        targetRoas: { type: 'number', description: 'Target ROAS as a ratio, e.g. 3.5 (TARGET_ROAS only).', minimum: 0.01 },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId', 'strategy'],
      additionalProperties: false,
    },
    summarize(args) {
      const strategy = String(args.strategy);
      if (strategy === 'TARGET_CPA' && args.targetCpa !== undefined) {
        return `Switch to Target CPA bidding at ${Number(args.targetCpa).toFixed(2)}.`;
      }
      if (strategy === 'TARGET_ROAS' && args.targetRoas !== undefined) {
        return `Switch to Target ROAS bidding at ${Number(args.targetRoas).toFixed(2)}x.`;
      }
      return `Switch to ${strategy.replace(/_/g, ' ').toLowerCase()} bidding.`;
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return {
        campaignId: campaign.campaignId,
        biddingStrategyType: campaign.biddingStrategyType,
        targetCpaMicros: campaign.targetCpaMicros,
        targetRoas: campaign.targetRoas,
      };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const strategy = requireString(args, 'strategy');
      const update: Record<string, unknown> = {
        resourceName: campaignResource(context.customerId, campaign.campaignId),
      };
      const masks: string[] = [];

      switch (strategy) {
        case 'MANUAL_CPC':
          update.manualCpc = {};
          masks.push('manualCpc');
          break;
        case 'MAXIMIZE_CLICKS':
          update.maximizeClicks = {};
          masks.push('maximizeClicks');
          break;
        case 'MAXIMIZE_CONVERSIONS':
          update.maximizeConversions = {};
          masks.push('maximizeConversions');
          break;
        case 'MAXIMIZE_CONVERSION_VALUE':
          update.maximizeConversionValue = {};
          masks.push('maximizeConversionValue');
          break;
        case 'TARGET_CPA': {
          const targetCpa = requireNumber(args, 'targetCpa');
          if (targetCpa <= 0) throw new Error('Target CPA must be greater than zero.');
          update.targetCpa = { targetCpaMicros: String(Math.round(targetCpa * 1_000_000)) };
          masks.push('targetCpa.targetCpaMicros');
          break;
        }
        case 'TARGET_ROAS': {
          const targetRoas = requireNumber(args, 'targetRoas');
          if (targetRoas <= 0) throw new Error('Target ROAS must be greater than zero.');
          update.targetRoas = { targetRoas };
          masks.push('targetRoas.targetRoas');
          break;
        }
        default:
          throw new Error(`Unsupported bidding strategy "${strategy}".`);
      }

      return [{ service: 'campaigns', operations: [{ updateMask: masks.join(','), update }] }];
    },
    verify(args, after) {
      const strategy = String(args.strategy);
      const observed = String(after.biddingStrategyType || '').toUpperCase();
      if (strategy === 'TARGET_CPA') {
        const expected = requireNumber(args, 'targetCpa') * 1_000_000;
        return (
          observed.includes('TARGET_CPA') &&
          typeof after.targetCpaMicros === 'number' &&
          Math.abs(after.targetCpaMicros - expected) <= 1
        );
      }
      if (strategy === 'TARGET_ROAS') {
        const expected = requireNumber(args, 'targetRoas');
        return (
          observed.includes('TARGET_ROAS') &&
          typeof after.targetRoas === 'number' &&
          Math.abs(after.targetRoas - expected) <= 0.01
        );
      }
      return observed.includes(strategy);
    },
    driftFields: ['campaignId', 'biddingStrategyType'],
  },
  {
    name: 'create_campaign',
    description:
      'Create a new paused Google Ads campaign with its own daily budget. Supports Search campaigns and app-install campaigns (MULTI_CHANNEL with APP_CAMPAIGN sub-type).',
    risk: 'write',
    createsResource: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name.' },
        budgetDaily: { type: 'number', description: 'Daily budget in account currency.', minimum: 0.01 },
        channelType: {
          type: 'string',
          enum: ['SEARCH', 'MULTI_CHANNEL'],
          description:
            'SEARCH for a standard search campaign, MULTI_CHANNEL for an app-install campaign.',
        },
        appId: {
          type: 'string',
          description: 'App package ID (Android) or numeric App Store ID (iOS). Required for app campaigns.',
        },
        appStore: {
          type: 'string',
          enum: ['GOOGLE_APP_STORE', 'APPLE_APP_STORE'],
          description: 'Store hosting the promoted app.',
        },
        maxCpc: {
          type: 'number',
          description:
            'Maximum cost per click the user asked for. Recorded for transparency; a campaign-level CPC cap is not supported by this integration.',
          minimum: 0,
        },
        reason: { type: 'string', description: 'Business reason for creating the campaign.' },
      },
      required: ['name', 'budgetDaily', 'channelType'],
      additionalProperties: false,
    },
    summarize(args) {
      const channel = String(args.channelType);
      const budget = requireNumber(args, 'budgetDaily').toFixed(2);
      const base =
        channel === 'MULTI_CHANNEL'
          ? `Create a paused app-install campaign "${requireString(args, 'name')}" with a ${budget} daily budget.`
          : `Create a paused search campaign "${requireString(args, 'name')}" with a ${budget} daily budget.`;
      return args.maxCpc !== undefined
        ? `${base} The requested ${Number(args.maxCpc).toFixed(2)} CPC cap is not applied because a campaign-level CPC cap is not supported.`
        : base;
    },
    beforeSnapshot(args) {
      return { exists: false, name: String(args.name) };
    },
    buildOperations() {
      // Creation is atomic across two services, so it uses the combined mutate.
      return [];
    },
    buildCombined(args, context) {
      const name = requireString(args, 'name');
      const budgetDaily = requireNumber(args, 'budgetDaily');
      const channelType = requireString(args, 'channelType');
      if (budgetDaily <= 0) throw new Error('Daily budget must be greater than zero.');
      if (channelType !== 'SEARCH' && channelType !== 'MULTI_CHANNEL') {
        throw new Error('Only SEARCH and MULTI_CHANNEL campaigns can be created.');
      }

      const cleanCid = context.customerId.replace(/\D/g, '');
      const isApp = channelType === 'MULTI_CHANNEL';
      const appId = typeof args.appId === 'string' ? args.appId.trim() : '';
      const appStore = typeof args.appStore === 'string' ? args.appStore : 'GOOGLE_APP_STORE';

      if (isApp && !appId) {
        throw new Error('An app ID is required to create an app-install campaign.');
      }

      const budgetResource = `customers/${cleanCid}/campaignBudgets/-1`;
      const campaignResource = `customers/${cleanCid}/campaigns/-2`;

      const campaign: Record<string, unknown> = {
        resourceName: campaignResource,
        name,
        status: 'PAUSED',
        advertisingChannelType: channelType,
        campaignBudget: budgetResource,
        containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
      };

      if (isApp) {
        campaign.advertisingChannelSubType = 'APP_CAMPAIGN';
        campaign.appCampaignSetting = {
          appId,
          appStore,
          biddingStrategyGoalType: 'OPTIMIZE_FOR_INSTALLS',
        };
        campaign.maximizeConversions = {};
      } else {
        campaign.manualCpc = {};
        campaign.networkSettings = {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: false,
          targetPartnerSearchNetwork: false,
        };
      }

      return {
        combined: [
          {
            campaignBudgetOperation: {
              create: {
                resourceName: budgetResource,
                name: `Budget: ${name.slice(0, 50)} (${Date.now()})`,
                amountMicros: String(Math.round(budgetDaily * 1_000_000)),
                deliveryMethod: 'STANDARD',
              },
            },
          },
          { campaignOperation: { create: campaign } },
        ],
      };
    },
    verify(args, after) {
      return (
        after.name === String(args.name) &&
        after.status === 'PAUSED' &&
        typeof after.budgetDaily === 'number' &&
        Math.abs(after.budgetDaily - requireNumber(args, 'budgetDaily')) <= 0.01
      );
    },
    driftFields: [],
  },
  {
    name: 'update_campaign_conversion_goals',
    description:
      'Opt a campaign in or out of a conversion goal category. Use this to change which conversions the campaign bids for.',
    risk: 'write',
    schema: {
      type: 'object',
      properties: {
        campaignId: campaignIdProperty,
        category: {
          type: 'string',
          enum: [
            'DEFAULT',
            'PAGE_VIEW',
            'PURCHASE',
            'SIGNUP',
            'LEAD',
            'DOWNLOAD',
            'ADD_TO_CART',
            'BEGIN_CHECKOUT',
            'SUBSCRIBE_PAID',
            'PHONE_CALL_LEAD',
            'IMPORTED_LEAD',
            'SUBMIT_LEAD_FORM',
            'BOOK_APPOINTMENT',
            'REQUEST_QUOTE',
            'GET_DIRECTIONS',
            'OUTBOUND_CLICK',
            'CONTACT',
            'ENGAGEMENT',
            'STORE_SALE',
            'STORE_VISIT',
          ],
          description: 'Conversion goal category to change.',
        },
        biddable: {
          type: 'boolean',
          description: 'True to include this goal in bidding, false to exclude it.',
        },
        origin: {
          type: 'string',
          enum: ['WEBSITE', 'APP', 'CALL_FROM_ADS', 'STORE', 'YOUTUBE_HOSTED', 'GOOGLE_HOSTED', 'UNSPECIFIED'],
          description:
            'Origin of the conversion goal, as returned by get_campaign_conversion_goals. Required to address the exact goal.',
        },
        reason: { type: 'string', description: 'Business reason for the change.' },
      },
      required: ['campaignId', 'category', 'biddable', 'origin'],
      additionalProperties: false,
    },
    summarize(args) {
      return `${args.biddable ? 'Include' : 'Exclude'} the ${String(args.category)
        .replace(/_/g, ' ')
        .toLowerCase()} conversion goal in campaign bidding.`;
    },
    beforeSnapshot(_args, context) {
      const campaign = requireCampaign(context);
      return { campaignId: campaign.campaignId };
    },
    buildOperations(args, context) {
      const campaign = requireCampaign(context);
      const category = requireString(args, 'category');
      if (typeof args.biddable !== 'boolean') throw new Error('"biddable" must be true or false.');
      const cleanCid = context.customerId.replace(/\D/g, '');

      // Campaign conversion goals live in their own service. The resource name
      // is `customers/{cid}/campaignConversionGoals/{campaignId}~{category}~{origin}`.
      // The origin must match the existing goal, so it is supplied by the caller
      // after reading the current goals; UNKNOWN is rejected by the API.
      const origin = requireString(args, 'origin');

      return [
        {
          service: 'campaignConversionGoals',
          operations: [
            {
              updateMask: 'biddable',
              update: {
                resourceName: `customers/${cleanCid}/campaignConversionGoals/${campaign.campaignId}~${category}~${origin}`,
                biddable: args.biddable,
              },
            },
          ],
        },
      ];
    },
    verify() {
      // Conversion goal state is verified by the dedicated read in the executor.
      return true;
    },
    driftFields: ['campaignId'],
  },
];

export function getOperation(name: string): OperationDescriptor | undefined {
  return OPERATION_CATALOG.find((operation) => operation.name === name);
}

export function listOperations(): OperationDescriptor[] {
  return OPERATION_CATALOG;
}

/**
 * Validate arguments against the operation schema. Used by the MCP server, the
 * proposal engine and the execution engine so all three agree.
 */
export function validateOperationArgs(
  operation: OperationDescriptor,
  args: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { properties, required = [], additionalProperties } = operation.schema;

  for (const key of required) {
    if (args[key] === undefined || args[key] === null || args[key] === '') {
      errors.push(`"${key}" is required.`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue;
    const definition = properties[key];
    if (!definition) {
      if (additionalProperties === false) errors.push(`"${key}" is not a supported parameter.`);
      continue;
    }
    if (definition.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`"${key}" must be a number.`);
      } else {
        if (definition.minimum !== undefined && value < definition.minimum) {
          errors.push(`"${key}" must be at least ${definition.minimum}.`);
        }
        if (definition.maximum !== undefined && value > definition.maximum) {
          errors.push(`"${key}" must be at most ${definition.maximum}.`);
        }
      }
    } else if (definition.type === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`"${key}" must be true or false.`);
    } else if (definition.type === 'string') {
      if (typeof value !== 'string') errors.push(`"${key}" must be a string.`);
      else if (definition.enum && !definition.enum.includes(value)) {
        errors.push(`"${key}" must be one of: ${definition.enum.join(', ')}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
