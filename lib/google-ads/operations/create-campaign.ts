import { invalidArgument, unsupported } from '@/lib/mcp/errors';
import { cleanId, isIsoDate, round, runGaql, toMicros, type GoogleAdsContext } from '../gaql';
import { resolveLocationInputs, type GeoTarget } from '../geo';
import {
  listConversionActions,
  readCampaignLocations,
  readCampaignState,
  resolveCampaign,
  type CampaignLocationsState,
} from '../reporting';
import { BIDDING_STRATEGIES, biddingFields, checkBiddingArgs } from './campaign-ops';
import {
  assertAccountCurrency,
  currencyProperty,
  customerPath,
  formatMoney,
  humanize,
  keywordItemSchema,
  reasonProperty,
  resultResourceNames,
  validateKeywordList,
  type OperationDescriptor,
} from './types';

const APP_GOALS = [
  'OPTIMIZE_INSTALLS_TARGET_INSTALL_COST',
  'OPTIMIZE_INSTALLS_WITHOUT_TARGET_INSTALL_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_INSTALL_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_CONVERSION_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_WITHOUT_TARGET_CPA',
] as const;

const GOALS_NEEDING_TARGET = new Set<string>([
  'OPTIMIZE_INSTALLS_TARGET_INSTALL_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_INSTALL_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_CONVERSION_COST',
]);

const GOALS_NEEDING_ACTIONS = new Set<string>([
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_INSTALL_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_TARGET_CONVERSION_COST',
  'OPTIMIZE_IN_APP_CONVERSIONS_WITHOUT_TARGET_CPA',
]);

const ACCEPTED_BIDDING: Record<string, string[]> = {
  MANUAL_CPC: ['MANUAL_CPC'],
  MAXIMIZE_CLICKS: ['TARGET_SPEND'],
  MAXIMIZE_CONVERSIONS: ['MAXIMIZE_CONVERSIONS'],
  TARGET_CPA: ['MAXIMIZE_CONVERSIONS', 'TARGET_CPA'],
  MAXIMIZE_CONVERSION_VALUE: ['MAXIMIZE_CONVERSION_VALUE'],
  TARGET_ROAS: ['MAXIMIZE_CONVERSION_VALUE', 'TARGET_ROAS'],
};

function validateAd(ad: Record<string, unknown>) {
  const finalUrl = String(ad.finalUrl || '');
  if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(finalUrl)) throw invalidArgument('responsiveSearchAd.finalUrl must be a full http(s) URL.');
  const headlines = [...new Set(((ad.headlines || []) as string[]).map((text) => text.trim()).filter(Boolean))];
  const descriptions = [...new Set(((ad.descriptions || []) as string[]).map((text) => text.trim()).filter(Boolean))];
  if (headlines.length < 3 || headlines.length > 15) throw invalidArgument('A responsive search ad needs 3–15 unique headlines.');
  if (descriptions.length < 2 || descriptions.length > 4) throw invalidArgument('A responsive search ad needs 2–4 unique descriptions.');
  const longHeadline = headlines.find((text) => text.length > 30);
  if (longHeadline) throw invalidArgument(`Headline "${longHeadline}" is ${longHeadline.length} characters; the limit is 30.`);
  const longDescription = descriptions.find((text) => text.length > 90);
  if (longDescription) throw invalidArgument(`A description is ${longDescription.length} characters; the limit is 90.`);
  for (const path of ['path1', 'path2']) {
    if (typeof ad[path] === 'string' && (ad[path] as string).length > 15) throw invalidArgument(`${path} must be at most 15 characters.`);
  }
  return {
    finalUrl,
    headlines,
    descriptions,
    ...(typeof ad.path1 === 'string' && ad.path1 ? { path1: ad.path1 } : {}),
    ...(typeof ad.path2 === 'string' && ad.path2 ? { path2: ad.path2 } : {}),
  };
}

export const createCampaign: OperationDescriptor = {
  name: 'create_campaign',
  title: 'Create campaign',
  description:
    'Create a new Search or App campaign with its own daily budget in one atomic request, including optional targeted/excluded locations and location options. Search campaigns can include a first ad group (default max CPC + keywords) and a responsive search ad so they are ready to serve. App campaigns need appId/appStore and an app bidding goal; they can be limited to specific conversion actions (selective optimization). Campaigns are created PAUSED unless status ENABLED is requested.',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 255 },
      campaignType: { type: 'string', enum: ['SEARCH', 'APP'] },
      dailyBudget: { type: 'number', minimum: 0.01, description: 'Average daily budget in the account currency.' },
      currency: currencyProperty,
      status: { type: 'string', enum: ['PAUSED', 'ENABLED'], description: 'Defaults to PAUSED.' },
      startDate: { type: 'string', description: 'YYYY-MM-DD, optional.' },
      endDate: { type: 'string', description: 'YYYY-MM-DD, optional.' },
      targetLocations: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description:
          'Optional locations to target (country, state/region, city names or numeric geo target IDs). Omit to target all countries and territories.',
      },
      excludedLocations: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { type: 'string', maxLength: 200 },
        description: 'Optional locations to exclude (country, state/region, city names or numeric geo target IDs).',
      },
      positiveGeoTargetType: {
        type: 'string',
        enum: ['PRESENCE_OR_INTEREST', 'PRESENCE', 'SEARCH_INTEREST'],
        description:
          'Optional positive location option: PRESENCE_OR_INTEREST (default), PRESENCE (people in or regularly in targeted locations), or SEARCH_INTEREST (Search only).',
      },
      negativeGeoTargetType: {
        type: 'string',
        enum: ['PRESENCE_OR_INTEREST', 'PRESENCE'],
        description: 'Optional exclusion location option: PRESENCE_OR_INTEREST (default) or PRESENCE.',
      },
      biddingStrategy: { type: 'string', enum: [...BIDDING_STRATEGIES], description: 'Search only. Defaults to MAXIMIZE_CLICKS.' },
      targetCpa: { type: 'number', minimum: 0.01, description: 'Search: target CPA. App: target cost per install or per in-app action.' },
      targetRoas: { type: 'number', minimum: 0.01 },
      maxCpcLimit: {
        type: 'number',
        minimum: 0.01,
        description: 'Search only. With MAXIMIZE_CLICKS it is the campaign max CPC limit; with MANUAL_CPC it becomes the ad group default bid.',
      },
      searchPartners: { type: 'boolean', description: 'Search only, default true.' },
      displayExpansion: { type: 'boolean', description: 'Search only, default false.' },
      containsEuPoliticalAdvertising: { type: 'boolean', description: 'Default false; must be true if the ads are EU political advertising.' },
      adGroup: {
        type: 'object',
        description: 'Search only: first ad group.',
        properties: {
          name: { type: 'string', maxLength: 255 },
          defaultMaxCpc: { type: 'number', minimum: 0.01 },
          keywords: { type: 'array', maxItems: 100, items: keywordItemSchema },
        },
        required: ['name'],
        additionalProperties: false,
      },
      responsiveSearchAd: {
        type: 'object',
        description: 'Search only, requires adGroup.',
        properties: {
          finalUrl: { type: 'string' },
          headlines: { type: 'array', minItems: 3, maxItems: 15, items: { type: 'string', maxLength: 30 } },
          descriptions: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', maxLength: 90 } },
          path1: { type: 'string', maxLength: 15 },
          path2: { type: 'string', maxLength: 15 },
        },
        required: ['finalUrl', 'headlines', 'descriptions'],
        additionalProperties: false,
      },
      appId: { type: 'string', description: 'Android package name (e.g. com.example.app) or numeric Apple App Store ID.' },
      appStore: { type: 'string', enum: ['GOOGLE_APP_STORE', 'APPLE_APP_STORE'] },
      appBiddingGoal: {
        type: 'string',
        enum: [...APP_GOALS],
        description: 'App only. Install goals optimise for installs/downloads; in-app goals need conversionActionIds.',
      },
      conversionActionIds: {
        type: 'array',
        maxItems: 20,
        items: { type: 'string' },
        description: 'App only: conversion actions to optimise toward (selective optimization).',
      },
      reason: reasonProperty,
    },
    required: ['name', 'campaignType', 'dailyBudget'],
    additionalProperties: false,
  },
  actionType: () => 'CREATE_CAMPAIGN',
  internalArgs: ['budgetName', 'resolvedTargetLocations', 'resolvedExcludedLocations'],
  destructive: () => false,
  targetKey: () => 'new_campaign',
  async prepare(args, context) {
    assertAccountCurrency(args, context);
    const name = String(args.name).trim();
    const type = String(args.campaignType);
    const status = String(args.status || 'PAUSED');
    const budget = round(Number(args.dailyBudget)) as number;
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const existing = await resolveCampaign(context, { campaignName: name }, { fresh: true });
      if (existing.name.toLowerCase() === name.toLowerCase()) {
        throw invalidArgument(`A campaign named "${existing.name}" already exists (ID ${existing.id}). Campaign names must be unique.`);
      }
    } catch (error) {
      if ((error as { payload?: { code?: string } }).payload?.code === 'invalid_argument') throw error;
    }

    for (const key of ['startDate', 'endDate']) {
      if (args[key] !== undefined && !isIsoDate(args[key])) throw invalidArgument(`${key} must be YYYY-MM-DD.`);
    }
    if (args.startDate && args.endDate && String(args.endDate) < String(args.startDate)) throw invalidArgument('endDate is before startDate.');

    const normalized: Record<string, unknown> = {
      name,
      campaignType: type,
      dailyBudget: budget,
      status,
      budgetName: `${name.slice(0, 80)} budget ${new Date().toISOString().slice(0, 19)}`,
      containsEuPoliticalAdvertising: args.containsEuPoliticalAdvertising === true,
    };
    for (const key of ['startDate', 'endDate', 'reason']) if (args[key] !== undefined) normalized[key] = args[key];

    changes.push(`Name: ${name}`, `Type: ${type === 'APP' ? 'App campaign' : 'Search campaign'}`);
    changes.push(`Daily budget: ${formatMoney(budget, context.currency)}`, `Status after creation: ${humanize(status)}`);
    if (args.startDate || args.endDate) changes.push(`Schedule: ${String(args.startDate || 'today')} → ${String(args.endDate || 'no end date')}`);

    if (type === 'APP') {
      for (const key of ['biddingStrategy', 'adGroup', 'responsiveSearchAd', 'searchPartners', 'displayExpansion', 'targetRoas']) {
        if (args[key] !== undefined) throw invalidArgument(`${key} does not apply to App campaigns.`);
      }
      if (args.maxCpcLimit !== undefined) {
        throw unsupported(
          'App campaigns do not bid per click, so a max CPC cannot be set.',
          'Use a target cost per install (appBiddingGoal OPTIMIZE_INSTALLS_TARGET_INSTALL_COST with targetCpa) to control acquisition cost.'
        );
      }
      const appId = typeof args.appId === 'string' ? args.appId.trim() : '';
      if (!appId) throw invalidArgument('appId is required for an App campaign (Android package name or Apple App Store ID).');
      const appStore = String(args.appStore || (/^\d+$/.test(appId) ? 'APPLE_APP_STORE' : 'GOOGLE_APP_STORE'));
      if (appStore === 'APPLE_APP_STORE' && !/^\d+$/.test(appId)) throw invalidArgument('Apple App Store IDs are numeric.');
      if (appStore === 'GOOGLE_APP_STORE' && !/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(appId)) {
        throw invalidArgument('Google Play app IDs look like com.company.app.');
      }
      const goal = String(args.appBiddingGoal || (typeof args.targetCpa === 'number' ? 'OPTIMIZE_INSTALLS_TARGET_INSTALL_COST' : 'OPTIMIZE_INSTALLS_WITHOUT_TARGET_INSTALL_COST'));
      if (GOALS_NEEDING_TARGET.has(goal) && typeof args.targetCpa !== 'number') {
        throw invalidArgument(`The app goal ${humanize(goal)} needs targetCpa (target cost per ${goal.includes('INSTALL_COST') ? 'install' : 'action'}).`);
      }
      if (!GOALS_NEEDING_TARGET.has(goal) && typeof args.targetCpa === 'number') {
        throw invalidArgument(`The app goal ${humanize(goal)} does not use a target CPA; choose a goal with a target or drop targetCpa.`);
      }
      const actionIds = [...new Set(((args.conversionActionIds || []) as string[]).map(cleanId).filter(Boolean))];
      if (GOALS_NEEDING_ACTIONS.has(goal) && !actionIds.length) {
        throw invalidArgument('In-app action goals need conversionActionIds for the in-app actions to optimise toward.');
      }
      if (actionIds.length) {
        const actions = await listConversionActions(context, { fresh: true });
        const known = new Map(actions.map((action) => [action.id, action]));
        const missing = actionIds.filter((id) => !known.has(id));
        if (missing.length) throw invalidArgument(`Conversion action(s) ${missing.join(', ')} do not exist in this account.`);
        changes.push(`Optimise only for: ${actionIds.map((id) => known.get(id)!.name).join(', ')}`);
        normalized.conversionActionIds = actionIds;
      }
      Object.assign(normalized, { appId, appStore, appBiddingGoal: goal });
      if (typeof args.targetCpa === 'number') normalized.targetCpa = round(args.targetCpa);
      changes.push(`App: ${appId} (${humanize(appStore)})`, `Bidding goal: ${humanize(goal)}`);
      if (typeof args.targetCpa === 'number') changes.push(`Target cost: ${formatMoney(args.targetCpa, context.currency)}`);
      warnings.push('The App campaign is created without ad assets; add text, images or videos in Google Ads before enabling it.');
    } else {
      if (args.appId || args.appStore || args.appBiddingGoal || args.conversionActionIds) {
        throw invalidArgument('App settings do not apply to a Search campaign.');
      }
      const biddingArgs: Record<string, unknown> = { biddingStrategy: args.biddingStrategy || 'MAXIMIZE_CLICKS' };
      for (const key of ['targetCpa', 'targetRoas', 'maxCpcLimit']) if (args[key] !== undefined) biddingArgs[key] = args[key];

      let adGroup = args.adGroup as Record<string, unknown> | undefined;
      if (biddingArgs.biddingStrategy === 'MANUAL_CPC' && typeof args.maxCpcLimit === 'number') {
        if (!adGroup) {
          throw invalidArgument(
            'With Manual CPC the max CPC is a bid on each ad group, so include adGroup (name and optionally keywords), or use MAXIMIZE_CLICKS with maxCpcLimit for a campaign-level cap.'
          );
        }
        adGroup = { ...adGroup, defaultMaxCpc: adGroup.defaultMaxCpc ?? args.maxCpcLimit };
        delete biddingArgs.maxCpcLimit;
        changes.push(`Max CPC ${formatMoney(Number(args.maxCpcLimit), context.currency)} applied as the ad group default bid (Manual CPC).`);
      }
      const strategy = checkBiddingArgs(biddingArgs);
      Object.assign(normalized, biddingArgs);
      changes.push(
        `Bidding: ${humanize(strategy)}${typeof biddingArgs.targetCpa === 'number' ? `, target CPA ${formatMoney(biddingArgs.targetCpa as number, context.currency)}` : ''}${typeof biddingArgs.targetRoas === 'number' ? `, target ROAS ${String(biddingArgs.targetRoas)}x` : ''}${typeof biddingArgs.maxCpcLimit === 'number' ? `, max CPC ${formatMoney(biddingArgs.maxCpcLimit as number, context.currency)}` : ''}`
      );
      if (['MAXIMIZE_CONVERSIONS', 'TARGET_CPA', 'MAXIMIZE_CONVERSION_VALUE', 'TARGET_ROAS'].includes(strategy)) {
        warnings.push('Conversion-based bidding needs working conversion tracking in this account.');
      }
      normalized.searchPartners = args.searchPartners !== false;
      normalized.displayExpansion = args.displayExpansion === true;
      changes.push(`Networks: Google Search${normalized.searchPartners ? ' + Search partners' : ''}${normalized.displayExpansion ? ' + Display expansion' : ''}`);

      if (adGroup) {
        const keywords = Array.isArray(adGroup.keywords) && adGroup.keywords.length
          ? validateKeywordList(adGroup.keywords as Array<{ text: string; matchType: string }>)
          : [];
        normalized.adGroup = {
          name: String(adGroup.name).trim(),
          ...(typeof adGroup.defaultMaxCpc === 'number' ? { defaultMaxCpc: round(adGroup.defaultMaxCpc as number) } : {}),
          ...(keywords.length ? { keywords } : {}),
        };
        changes.push(
          `Ad group: ${String(adGroup.name)}${typeof adGroup.defaultMaxCpc === 'number' ? ` (default max CPC ${formatMoney(adGroup.defaultMaxCpc as number, context.currency)})` : ''}`
        );
        if (keywords.length) changes.push(`Keywords: ${keywords.map((keyword) => `${keyword.text} [${humanize(keyword.matchType)}]`).join(', ')}`);
        else warnings.push('The ad group has no keywords yet.');
      } else {
        warnings.push('No ad group is included, so the campaign cannot serve until ad groups, keywords and ads are added.');
      }

      if (args.responsiveSearchAd) {
        if (!adGroup) throw invalidArgument('A responsive search ad needs an adGroup in the same request.');
        const ad = validateAd(args.responsiveSearchAd as Record<string, unknown>);
        normalized.responsiveSearchAd = ad;
        changes.push(`Responsive search ad → ${ad.finalUrl} (${ad.headlines.length} headlines, ${ad.descriptions.length} descriptions)`);
      } else if (adGroup) {
        warnings.push('No ad is included; the ad group needs a responsive search ad before it can serve.');
      }
    }

    if (type === 'APP' && args.positiveGeoTargetType === 'SEARCH_INTEREST') {
      throw invalidArgument('SEARCH_INTEREST positive location targeting is only available for Search campaigns.');
    }

    const rawTargets = Array.isArray(args.targetLocations) ? (args.targetLocations as string[]) : [];
    const rawExcludes = Array.isArray(args.excludedLocations) ? (args.excludedLocations as string[]) : [];
    const [resolvedTargets, resolvedExcludes]: [GeoTarget[], GeoTarget[]] = await Promise.all([
      rawTargets.length ? resolveLocationInputs(context, rawTargets, 'target location') : Promise.resolve([]),
      rawExcludes.length ? resolveLocationInputs(context, rawExcludes, 'excluded location') : Promise.resolve([]),
    ]);

    if (resolvedTargets.length && resolvedExcludes.length) {
      const targetResources = new Set(resolvedTargets.map((item) => item.resourceName));
      const clash = resolvedExcludes.find((item) => targetResources.has(item.resourceName));
      if (clash) {
        throw invalidArgument(`Location "${clash.canonicalName || clash.name}" cannot be both targeted and excluded.`);
      }
    }

    if (resolvedTargets.length) {
      normalized.targetLocations = resolvedTargets.map((item) => item.canonicalName || item.name);
      normalized.resolvedTargetLocations = resolvedTargets.map((item) => ({
        id: item.id,
        geoTargetConstant: item.resourceName,
        canonicalName: item.canonicalName || item.name,
      }));
      changes.push(`Target locations: ${resolvedTargets.map((item) => `${item.canonicalName || item.name} (${item.id})`).join(', ')}`);
    } else {
      changes.push('Target locations: All countries and territories');
    }

    if (resolvedExcludes.length) {
      normalized.excludedLocations = resolvedExcludes.map((item) => item.canonicalName || item.name);
      normalized.resolvedExcludedLocations = resolvedExcludes.map((item) => ({
        id: item.id,
        geoTargetConstant: item.resourceName,
        canonicalName: item.canonicalName || item.name,
      }));
      changes.push(`Excluded locations: ${resolvedExcludes.map((item) => `${item.canonicalName || item.name} (${item.id})`).join(', ')}`);
    }

    if (args.positiveGeoTargetType) {
      normalized.positiveGeoTargetType = args.positiveGeoTargetType;
      changes.push(`Positive location option: ${humanize(args.positiveGeoTargetType)}`);
    }
    if (args.negativeGeoTargetType) {
      normalized.negativeGeoTargetType = args.negativeGeoTargetType;
      changes.push(`Exclusion location option: ${humanize(args.negativeGeoTargetType)}`);
    }

    if (!normalized.containsEuPoliticalAdvertising) changes.push('Declared as not containing EU political advertising.');
    if (status === 'ENABLED') warnings.push('The campaign will be eligible to spend as soon as it is created.');

    return {
      args: normalized,
      summary: `Create ${type === 'APP' ? 'App' : 'Search'} campaign "${name}" with a ${formatMoney(budget, context.currency)} daily budget (${humanize(status)}).`,
      changes,
      before: { exists: false, name },
      target: { kind: 'new_campaign', campaignName: name, label: name },
      warnings,
    };
  },
  async readState(args, context, realIds) {
    if (realIds?.campaignId) {
      const state = await readCampaignState(context, realIds.campaignId, { fresh: true });
      if (!state) return { exists: false };
      let adGroups: Array<{ id: string; name: string }> = [];
      let locations: CampaignLocationsState | undefined;
      const needsLocations =
        Array.isArray(args.resolvedTargetLocations) ||
        Array.isArray(args.resolvedExcludedLocations);
      const [groupRows, locationState] = await Promise.all([
        args.adGroup
          ? runGaql(
              context,
              `SELECT ad_group.id, ad_group.name FROM ad_group WHERE campaign.id = ${state.campaignId} AND ad_group.status != 'REMOVED'`,
              { cacheTtlMs: 0 }
            )
          : Promise.resolve([]),
        needsLocations ? readCampaignLocations(context, state.campaignId, { fresh: true }) : Promise.resolve(undefined),
      ]);
      if (args.adGroup) {
        adGroups = groupRows.map((row) => ({ id: cleanId(row.adGroup?.id), name: String(row.adGroup?.name || '') }));
      }
      locations = locationState;
      return { exists: true, ...state, adGroups, ...(locations ? { locations } : {}) } as unknown as Record<string, unknown>;
    }
    try {
      const existing = await resolveCampaign(context, { campaignName: String(args.name) }, { fresh: true });
      return { exists: existing.name.toLowerCase() === String(args.name).toLowerCase() };
    } catch {
      return { exists: false };
    }
  },
  driftKeys: ['exists'],
  plan(args, context) {
    const customer = customerPath(context);
    const budget = `${customer}/campaignBudgets/-1`;
    const campaign = `${customer}/campaigns/-2`;
    const adGroup = `${customer}/adGroups/-3`;
    const isApp = args.campaignType === 'APP';

    const campaignCreate: Record<string, unknown> = {
      resourceName: campaign,
      name: args.name,
      status: args.status,
      campaignBudget: budget,
      advertisingChannelType: isApp ? 'MULTI_CHANNEL' : 'SEARCH',
      containsEuPoliticalAdvertising: args.containsEuPoliticalAdvertising
        ? 'CONTAINS_EU_POLITICAL_ADVERTISING'
        : 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
      ...(args.startDate ? { startDateTime: `${String(args.startDate)} 00:00:00` } : {}),
      ...(args.endDate ? { endDateTime: `${String(args.endDate)} 23:59:59` } : {}),
      ...(args.positiveGeoTargetType || args.negativeGeoTargetType
        ? {
            geoTargetTypeSetting: {
              ...(args.positiveGeoTargetType ? { positiveGeoTargetType: args.positiveGeoTargetType } : {}),
              ...(args.negativeGeoTargetType ? { negativeGeoTargetType: args.negativeGeoTargetType } : {}),
            },
          }
        : {}),
    };

    if (isApp) {
      const goal = String(args.appBiddingGoal);
      campaignCreate.advertisingChannelSubType = 'APP_CAMPAIGN';
      campaignCreate.appCampaignSetting = { appId: args.appId, appStore: args.appStore, biddingStrategyGoalType: goal };
      if (GOALS_NEEDING_TARGET.has(goal)) campaignCreate.targetCpa = { targetCpaMicros: toMicros(Number(args.targetCpa)) };
      else campaignCreate.maximizeConversions = {};
      if (Array.isArray(args.conversionActionIds) && args.conversionActionIds.length) {
        campaignCreate.selectiveOptimization = {
          conversionActions: (args.conversionActionIds as string[]).map((id) => `${customer}/conversionActions/${cleanId(id)}`),
        };
      }
    } else {
      Object.assign(campaignCreate, biddingFields(args).fields);
      campaignCreate.networkSettings = {
        targetGoogleSearch: true,
        targetSearchNetwork: args.searchPartners !== false,
        targetContentNetwork: args.displayExpansion === true,
        targetPartnerSearchNetwork: false,
      };
    }

    const operations: Array<Record<string, unknown>> = [
      {
        campaignBudgetOperation: {
          create: {
            resourceName: budget,
            name: args.budgetName,
            amountMicros: toMicros(Number(args.dailyBudget)),
            deliveryMethod: 'STANDARD',
            explicitlyShared: false,
          },
        },
      },
      { campaignOperation: { create: campaignCreate } },
    ];

    const group = args.adGroup as { name: string; defaultMaxCpc?: number; keywords?: Array<{ text: string; matchType: string }> } | undefined;
    if (!isApp && group) {
      operations.push({
        adGroupOperation: {
          create: {
            resourceName: adGroup,
            campaign,
            name: group.name,
            status: 'ENABLED',
            type: 'SEARCH_STANDARD',
            ...(typeof group.defaultMaxCpc === 'number' ? { cpcBidMicros: toMicros(group.defaultMaxCpc) } : {}),
          },
        },
      });
      for (const keyword of group.keywords || []) {
        operations.push({
          adGroupCriterionOperation: { create: { adGroup, status: 'ENABLED', keyword: { text: keyword.text, matchType: keyword.matchType } } },
        });
      }
      const ad = args.responsiveSearchAd as { finalUrl: string; headlines: string[]; descriptions: string[]; path1?: string; path2?: string } | undefined;
      if (ad) {
        operations.push({
          adGroupAdOperation: {
            create: {
              adGroup,
              status: 'ENABLED',
              ad: {
                finalUrls: [ad.finalUrl],
                responsiveSearchAd: {
                  headlines: ad.headlines.map((text) => ({ text })),
                  descriptions: ad.descriptions.map((text) => ({ text })),
                  ...(ad.path1 ? { path1: ad.path1 } : {}),
                  ...(ad.path2 ? { path2: ad.path2 } : {}),
                },
              },
            },
          },
        });
      }
    }

    const resolvedTargets = (args.resolvedTargetLocations || []) as Array<{ geoTargetConstant: string }>;
    const resolvedExcludes = (args.resolvedExcludedLocations || []) as Array<{ geoTargetConstant: string }>;
    for (const loc of resolvedTargets) {
      operations.push({
        campaignCriterionOperation: {
          create: {
            campaign,
            negative: false,
            location: { geoTargetConstant: loc.geoTargetConstant },
          },
        },
      });
    }
    for (const loc of resolvedExcludes) {
      operations.push({
        campaignCriterionOperation: {
          create: {
            campaign,
            negative: true,
            location: { geoTargetConstant: loc.geoTargetConstant },
          },
        },
      });
    }

    return [{ kind: 'combined', operations }];
  },
  realIds(_args, results) {
    const names = resultResourceNames(results[0]);
    const ids: Record<string, string> = {};
    const campaign = names.find((name) => name.includes('/campaigns/'));
    const adGroup = names.find((name) => name.includes('/adGroups/'));
    const budget = names.find((name) => name.includes('/campaignBudgets/'));
    if (campaign) ids.campaignId = cleanId(campaign.split('/').pop());
    if (adGroup) ids.adGroupId = cleanId(adGroup.split('/').pop());
    if (budget) ids.budgetId = cleanId(budget.split('/').pop());
    return ids;
  },
  verify(args, after) {
    if (!after.exists) return ['campaign not found after creation'];
    const issues: string[] = [];
    if (after.name !== args.name) issues.push(`name is ${String(after.name)}`);
    if (after.status !== args.status) issues.push(`status is ${String(after.status)}`);
    const budget = (after.budget || {}) as { dailyAmount?: number };
    if (typeof budget.dailyAmount !== 'number' || Math.abs(budget.dailyAmount - Number(args.dailyBudget)) > 0.01) {
      issues.push(`daily budget is ${String(budget.dailyAmount)}`);
    }
    if (args.campaignType === 'APP') {
      const app = (after.app || {}) as { appId?: string };
      if (app.appId !== args.appId) issues.push('app ID differs');
    } else {
      const strategy = String(args.biddingStrategy || 'MAXIMIZE_CLICKS');
      if (!(ACCEPTED_BIDDING[strategy] || []).includes(String(after.biddingStrategyType))) {
        issues.push(`bidding strategy is ${String(after.biddingStrategyType)}`);
      }
      const group = args.adGroup as { name?: string } | undefined;
      if (group?.name && !((after.adGroups || []) as Array<{ name: string }>).some((item) => item.name === group.name)) {
        issues.push('ad group missing');
      }
    }
    const locations = (after.locations || { targeted: [], excluded: [] }) as CampaignLocationsState;
    const expectedTargets = (args.resolvedTargetLocations || []) as Array<{ geoTargetConstant: string; canonicalName: string }>;
    const expectedExcludes = (args.resolvedExcludedLocations || []) as Array<{ geoTargetConstant: string; canonicalName: string }>;
    const observedTargets = new Set(locations.targeted.map((item) => item.geoTargetConstant));
    const observedExcludes = new Set(locations.excluded.map((item) => item.geoTargetConstant));
    for (const loc of expectedTargets) {
      if (!observedTargets.has(loc.geoTargetConstant)) issues.push(`target location missing: ${loc.canonicalName}`);
    }
    for (const loc of expectedExcludes) {
      if (!observedExcludes.has(loc.geoTargetConstant)) issues.push(`excluded location missing: ${loc.canonicalName}`);
    }
    const geoSetting = (after.geoTargetTypeSetting || {}) as { positiveGeoTargetType?: string; negativeGeoTargetType?: string };
    if (args.positiveGeoTargetType && geoSetting.positiveGeoTargetType !== args.positiveGeoTargetType) {
      issues.push(`positiveGeoTargetType is ${String(geoSetting.positiveGeoTargetType)}`);
    }
    if (args.negativeGeoTargetType && geoSetting.negativeGeoTargetType !== args.negativeGeoTargetType) {
      issues.push(`negativeGeoTargetType is ${String(geoSetting.negativeGeoTargetType)}`);
    }
    return issues;
  },
};
