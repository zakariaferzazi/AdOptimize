import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds } from './helpers/fake-google-ads';
import { invalidateGaqlCache, newRequestStats, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import {
  applyPlan,
  getOperation,
  listOperations,
  normalizeArgs,
  preflightPlan,
  validateOperationArgs,
} from '@/lib/google-ads/catalog';

let fake: FakeGoogleAds;
let context: GoogleAdsContext;

beforeEach(() => {
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
  context = { customerId: '1234567890', accessToken: 'token', currency: 'USD', accountName: 'Acme', stats: newRequestStats() };
});

afterEach(() => vi.unstubAllGlobals());

/** Run an operation the way the proposal engine and executor do. */
async function run(name: string, rawArgs: Record<string, unknown>) {
  const operation = getOperation(name)!;
  const args = normalizeArgs(operation.schema, rawArgs);
  const validation = validateOperationArgs(operation, args);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  const prepared = await operation.prepare(args, context);
  const preflight = await preflightPlan(operation.plan(prepared.args, context, prepared.before), context);
  expect(preflight).toBeUndefined();
  expect(validateOperationArgs(operation, prepared.args, { allowInternal: true }).valid).toBe(true);

  const live = await operation.readState(prepared.args, context);
  const applied = await applyPlan(operation.plan(prepared.args, context, live), context);
  if (!applied.ok) throw new Error(applied.failure.error);
  const realIds = operation.realIds?.(prepared.args, applied.results, context) || {};
  const after = await operation.readState(prepared.args, context, realIds);
  return { prepared, mismatches: operation.verify(prepared.args, after, realIds), realIds, after };
}

const lastMutate = () => fake.mutates().slice(-1)[0];

describe('operation catalog', () => {
  it('exposes only validated business operations, never a generic mutate', () => {
    const names = listOperations().map((operation) => operation.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'update_campaign_status',
        'update_campaign_budget',
        'update_campaign_bidding',
        'update_campaign_locations',
        'create_campaign',
        'set_campaign_conversion_actions',
        'update_campaign_conversion_goals',
        'use_account_conversion_goals',
        'update_ad_group',
        'update_keyword',
        'add_keywords',
        'add_negative_keywords',
        'create_ad_group',
      ])
    );
    expect(names.some((name) => /mutate|raw|gaql/i.test(name))).toBe(false);
    for (const operation of listOperations()) expect(operation.schema.additionalProperties).toBe(false);
  });

  it('normalises lenient model input before strict validation', () => {
    const operation = getOperation('update_campaign_budget')!;
    const args = normalizeArgs(operation.schema, { campaignId: 111, dailyBudget: '60', reason: null });
    expect(args).toEqual({ campaignId: '111', dailyBudget: 60 });
    expect(validateOperationArgs(operation, { campaignId: '1', dailyBudget: 5, hack: true }).errors.join(' ')).toMatch(/not a supported parameter/);
  });
});

describe('campaign operations', () => {
  it('pauses a campaign, flags it destructive and verifies the read-back', async () => {
    const { prepared, mismatches } = await run('update_campaign_status', { campaignId: '111', status: 'PAUSED' });
    expect(getOperation('update_campaign_status')!.destructive(prepared.args)).toBe(true);
    expect(prepared.changes).toEqual(['Status: enabled → paused']);
    expect(mismatches).toEqual([]);
    expect(fake.account.campaigns[0].status).toBe('PAUSED');
  });

  it('refuses a no-op change instead of proposing it', async () => {
    await expect(run('update_campaign_status', { campaignId: '333', status: 'PAUSED' })).rejects.toMatchObject({
      payload: { code: 'invalid_argument' },
    });
  });

  it('changes a budget and warns when it is shared', async () => {
    fake.account.campaigns[1].sharedBudget = true;
    const { prepared, mismatches } = await run('update_campaign_budget', { campaignId: '222', dailyBudget: 120 });
    expect(prepared.warnings.join(' ')).toMatch(/shared by 3 campaigns/);
    expect(mismatches).toEqual([]);
    expect(lastMutate().body.operations[0]).toMatchObject({ updateMask: 'amountMicros', update: { amountMicros: '120000000' } });
  });

  it('rejects money stated in a different currency than the account', async () => {
    await expect(run('update_campaign_budget', { campaignId: '111', dailyBudget: 40, currency: 'GBP' })).rejects.toMatchObject({
      payload: { code: 'invalid_argument', message: expect.stringMatching(/billed in USD/) },
    });
  });

  it('uses v26 start_date_time / end_date_time fields for schedules', async () => {
    const { mismatches } = await run('update_campaign_dates', { campaignId: '111', endDate: '2027-01-31' });
    expect(mismatches).toEqual([]);
    expect(lastMutate().body.operations[0]).toMatchObject({ updateMask: 'endDateTime', update: { endDateTime: '2027-01-31 23:59:59' } });
  });

  it('maps Maximize clicks with a CPC limit to target_spend', async () => {
    const { prepared, mismatches } = await run('update_campaign_bidding', { campaignId: '111', strategy: 'MAXIMIZE_CLICKS', maxCpcLimit: 0.5 });
    expect(mismatches).toEqual([]);
    expect(prepared.warnings.join(' ')).toMatch(/learning period/);
    expect(lastMutate().body.operations[0]).toMatchObject({
      updateMask: 'targetSpend.cpcBidCeilingMicros',
      update: { targetSpend: { cpcBidCeilingMicros: '500000' } },
    });
  });

  it('expresses Target CPA as Maximize conversions with a target', async () => {
    const { mismatches } = await run('update_campaign_bidding', { campaignId: '111', strategy: 'TARGET_CPA', targetCpa: 25 });
    expect(mismatches).toEqual([]);
    expect(lastMutate().body.operations[0].update.maximizeConversions).toEqual({ targetCpaMicros: '25000000' });
  });

  it('explains that smart bidding has no CPC cap', async () => {
    await expect(run('update_campaign_bidding', { campaignId: '111', strategy: 'MAXIMIZE_CONVERSIONS', maxCpcLimit: 1 })).rejects.toMatchObject({
      payload: { code: 'invalid_argument', message: expect.stringMatching(/Manual CPC.*ad group/) },
    });
  });

  it('only lets App campaigns change their target, not their strategy', async () => {
    await expect(run('update_campaign_bidding', { campaignId: '444', strategy: 'MANUAL_CPC' })).rejects.toMatchObject({ payload: { code: 'unsupported' } });
    const { mismatches } = await run('update_campaign_bidding', { campaignId: '444', strategy: 'TARGET_CPA', targetCpa: 4 });
    expect(mismatches).toEqual([]);
    expect(lastMutate().body.operations[0].updateMask).toBe('targetCpa.targetCpaMicros');
  });

  it('turns off Search partners on a Search campaign only', async () => {
    const { mismatches } = await run('update_campaign_networks', { campaignId: '111', searchPartners: false });
    expect(mismatches).toEqual([]);
    await expect(run('update_campaign_networks', { campaignId: '444', searchPartners: false })).rejects.toMatchObject({ payload: { code: 'unsupported' } });
  });
});

describe('campaign creation', () => {
  it('creates a complete Search campaign atomically with ad group, keywords and ad', async () => {
    const { prepared, mismatches, realIds } = await run('create_campaign', {
      name: 'Winter Boots',
      campaignType: 'SEARCH',
      dailyBudget: 25,
      biddingStrategy: 'MANUAL_CPC',
      maxCpcLimit: 0.8,
      adGroup: { name: 'Winter boots', keywords: [{ text: 'winter boots', matchType: 'PHRASE' }, { text: '[insulated boots]', matchType: 'EXACT' }] },
      responsiveSearchAd: {
        finalUrl: 'https://acme.example/winter',
        headlines: ['Winter Boots Sale', 'Warm & Waterproof', 'Free Returns'],
        descriptions: ['Shop insulated boots built for snow.', 'Fast shipping on all orders.'],
      },
    });
    expect(mismatches).toEqual([]);
    expect(realIds.campaignId).toBeDefined();
    expect(prepared.args.status).toBe('PAUSED');
    expect(prepared.changes.join('\n')).toMatch(/default bid/);
    const operations = lastMutate().body.mutateOperations;
    expect(operations.map((operation: object) => Object.keys(operation)[0])).toEqual([
      'campaignBudgetOperation',
      'campaignOperation',
      'adGroupOperation',
      'adGroupCriterionOperation',
      'adGroupCriterionOperation',
      'adGroupAdOperation',
    ]);
    expect(operations[0].campaignBudgetOperation.create.explicitlyShared).toBe(false);
    expect(operations[1].campaignOperation.create.containsEuPoliticalAdvertising).toBe('DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING');
    expect(operations[2].adGroupOperation.create.cpcBidMicros).toBe('800000');
    expect(operations[4].adGroupCriterionOperation.create.keyword.text).toBe('insulated boots');
  });

  it('creates an App install campaign with a valid v26 bidding goal and selective optimization', async () => {
    const { mismatches } = await run('create_campaign', {
      name: 'Trail App - Installs UK',
      campaignType: 'APP',
      dailyBudget: 40,
      appId: 'com.acme.trail',
      targetCpa: 2.5,
      conversionActionIds: ['63'],
    });
    expect(mismatches).toEqual([]);
    const campaign = lastMutate().body.mutateOperations[1].campaignOperation.create;
    expect(campaign).toMatchObject({
      advertisingChannelType: 'MULTI_CHANNEL',
      advertisingChannelSubType: 'APP_CAMPAIGN',
      appCampaignSetting: { appId: 'com.acme.trail', appStore: 'GOOGLE_APP_STORE', biddingStrategyGoalType: 'OPTIMIZE_INSTALLS_TARGET_INSTALL_COST' },
      targetCpa: { targetCpaMicros: '2500000' },
      selectiveOptimization: { conversionActions: ['customers/1234567890/conversionActions/63'] },
    });
  });

  it('explains that App campaigns cannot take a max CPC and offers the alternative', async () => {
    await expect(run('create_campaign', { name: 'X', campaignType: 'APP', dailyBudget: 5, appId: 'com.acme.trail', maxCpcLimit: 0.3 })).rejects.toMatchObject({
      payload: { code: 'unsupported', next_step: expect.stringMatching(/target cost per install/) },
    });
  });

  it('rejects duplicate campaign names before proposing', async () => {
    await expect(run('create_campaign', { name: 'Brand - Search', campaignType: 'SEARCH', dailyBudget: 5 })).rejects.toMatchObject({
      payload: { code: 'invalid_argument', message: expect.stringMatching(/already exists/) },
    });
  });

  it('creates a Search campaign with targeted and excluded locations and geo target type', async () => {
    const { prepared, mismatches, realIds, after } = await run('create_campaign', {
      name: 'UK & Europe Boots',
      campaignType: 'SEARCH',
      dailyBudget: 35,
      targetLocations: ['United Kingdom', 'France', 'Paris, France'],
      excludedLocations: ['Germany'],
      positiveGeoTargetType: 'PRESENCE',
      negativeGeoTargetType: 'PRESENCE',
    });
    expect(mismatches).toEqual([]);
    expect(realIds.campaignId).toBeDefined();
    expect(prepared.changes.join('\n')).toMatch(/United Kingdom \(2826\)/);
    expect(prepared.changes.join('\n')).toMatch(/Excluded locations: Germany \(2276\)/);
    const locations = after.locations as any;
    expect(locations.targeted.map((l: any) => l.geoTargetConstant).sort()).toEqual([
      'geoTargetConstants/1006094',
      'geoTargetConstants/2250',
      'geoTargetConstants/2826',
    ]);
    expect(locations.excluded.map((l: any) => l.geoTargetConstant)).toEqual(['geoTargetConstants/2276']);
    expect((after.geoTargetTypeSetting as any)?.positiveGeoTargetType).toBe('PRESENCE');
  });

  it('rejects overlapping targeted and excluded locations on creation', async () => {
    await expect(
      run('create_campaign', {
        name: 'Conflict Campaign',
        campaignType: 'SEARCH',
        dailyBudget: 20,
        targetLocations: ['United States'],
        excludedLocations: ['2840'],
      })
    ).rejects.toMatchObject({ payload: { code: 'invalid_argument', message: expect.stringMatching(/both targeted and excluded/) } });
  });

  it('surfaces ambiguity when a location name has multiple matches', async () => {
    await expect(
      run('create_campaign', {
        name: 'Ambiguous City Campaign',
        campaignType: 'SEARCH',
        dailyBudget: 20,
        targetLocations: ['London'],
      })
    ).rejects.toMatchObject({
      payload: {
        code: 'ambiguous',
        candidates: expect.arrayContaining([
          expect.objectContaining({ id: '1006886' }),
          expect.objectContaining({ id: '1002376' }),
        ]),
      },
    });
  });

  it('surfaces Google Ads validation failures before a proposal exists', async () => {
    fake.failNext((request) => request.kind === 'mutate' && Boolean(request.validateOnly), 'TOO_LONG', 'stringLengthError', 'Too long.', 'mutate_operations.campaign_operation.create.name');
    const operation = getOperation('create_campaign')!;
    const prepared = await operation.prepare({ name: 'Fine name', campaignType: 'SEARCH', dailyBudget: 5 }, context);
    const rejected = await preflightPlan(operation.plan(prepared.args, context, prepared.before), context);
    expect(rejected?.failure.googleAdsError).toMatchObject({ code: 'TOO_LONG', fieldPath: expect.stringContaining('name') });
    expect(fake.mutates()).toHaveLength(0);
  });
});

describe('conversion goal operations', () => {
  it('optimises an App campaign for downloads only via selective optimization', async () => {
    const { prepared, mismatches } = await run('set_campaign_conversion_actions', { campaignId: '444', conversionActionIds: ['63'] });
    expect(prepared.args.mode).toBe('APP_SELECTIVE_OPTIMIZATION');
    expect(prepared.summary).toMatch(/Android installs/);
    expect(mismatches).toEqual([]);
    expect(fake.account.campaigns[3].selective).toEqual(['customers/1234567890/conversionActions/63']);
  });

  it('optimises a Search campaign for one action with a custom goal and excludes category goals', async () => {
    const { prepared, mismatches, realIds } = await run('set_campaign_conversion_actions', { campaignId: '222', conversionActionIds: ['61'] });
    expect(prepared.args.mode).toBe('CUSTOM_GOAL');
    expect(prepared.changes.join(' ')).toMatch(/excluded from bidding/);
    expect(mismatches).toEqual([]);
    expect(realIds.customConversionGoalId).toBeDefined();
    expect(fake.account.goalConfigs['222']).toMatchObject({ level: 'CAMPAIGN' });
    expect(fake.account.campaignGoals.filter((goal) => goal.campaignId === '222').every((goal) => !goal.biddable)).toBe(true);
    expect(fake.mutates().map((request) => request.service)).toEqual(['customConversionGoals', 'googleAds']);
  });

  it('reuses an existing custom goal with the same actions', async () => {
    fake.account.customGoals.push({ id: '77', name: 'Purchases only', actions: ['customers/1234567890/conversionActions/61'], status: 'ENABLED' });
    const { prepared, mismatches } = await run('set_campaign_conversion_actions', { campaignId: '222', conversionActionIds: ['61'] });
    expect(prepared.args.reuseCustomGoal).toContain('/customConversionGoals/77');
    expect(mismatches).toEqual([]);
    expect(fake.mutates().map((request) => request.service)).toEqual(['googleAds']);
  });

  it('toggles specific goal categories and lists the real ones when asked for a missing one', async () => {
    const { mismatches } = await run('update_campaign_conversion_goals', {
      campaignId: '111',
      goals: [{ category: 'SIGNUP', origin: 'WEBSITE', biddable: false }],
    });
    expect(mismatches).toEqual([]);
    await expect(
      run('update_campaign_conversion_goals', { campaignId: '111', goals: [{ category: 'DOWNLOAD', origin: 'APP', biddable: true }] })
    ).rejects.toMatchObject({ payload: { code: 'not_found', candidates: expect.any(Array) } });
  });

  it('reverts a campaign to account goals', async () => {
    fake.account.goalConfigs['111'] = { level: 'CAMPAIGN' };
    const { mismatches } = await run('use_account_conversion_goals', { campaignId: '111' });
    expect(mismatches).toEqual([]);
  });
});

describe('ad group and keyword operations', () => {
  it('sets a Manual CPC ad group bid', async () => {
    const { prepared, mismatches } = await run('update_ad_group', { adGroupId: '5001', defaultMaxCpc: 1.5 });
    expect(prepared.warnings).toEqual([]);
    expect(mismatches).toEqual([]);
  });

  it('warns that ad group bids are ignored under smart bidding', async () => {
    const { prepared } = await run('update_ad_group', { adGroupId: '5002', defaultMaxCpc: 1.5 });
    expect(prepared.warnings.join(' ')).toMatch(/ignored/);
  });

  it('pauses a keyword and sets keyword bids', async () => {
    const paused = await run('update_keyword', { adGroupId: '5002', criterionId: '7002', status: 'PAUSED' });
    expect(paused.mismatches).toEqual([]);
    const bid = await run('update_keyword', { adGroupId: '5002', criterionId: '7003', maxCpc: 0.9 });
    expect(bid.mismatches).toEqual([]);
  });

  it('adds negative keywords and skips ones that already exist', async () => {
    const { prepared, mismatches } = await run('add_negative_keywords', {
      campaignId: '222',
      keywords: [
        { text: 'repair', matchType: 'PHRASE' },
        { text: 'free', matchType: 'BROAD' },
      ],
    });
    expect(prepared.args.keywords).toEqual([{ text: 'repair', matchType: 'PHRASE' }]);
    expect(prepared.warnings.join(' ')).toMatch(/already existed/);
    expect(mismatches).toEqual([]);
  });

  it('refuses negatives on App campaigns', async () => {
    await expect(run('add_negative_keywords', { campaignId: '444', keywords: [{ text: 'x', matchType: 'BROAD' }] })).rejects.toMatchObject({
      payload: { code: 'unsupported' },
    });
  });

  it('adds keywords and creates ad groups', async () => {
    const added = await run('add_keywords', { adGroupId: '5002', keywords: [{ text: 'trail boots', matchType: 'EXACT' }] });
    expect(added.mismatches).toEqual([]);
    const created = await run('create_ad_group', { campaignId: '222', name: 'Trail', defaultMaxCpc: 1, keywords: [{ text: 'trail shoes', matchType: 'PHRASE' }] });
    expect(created.mismatches).toEqual([]);
    expect(created.realIds.adGroupId).toBeDefined();
  });
});

describe('location targeting operations', () => {
  it('adds, excludes, removes, and replaces locations on an existing campaign', async () => {
    // Campaign 111 initially targets United States (2840) and Canada (2124).
    const added = await run('update_campaign_locations', {
      campaignId: '111',
      addLocations: ['United Kingdom', 'United States'],
      excludeLocations: ['Alaska'],
      positiveGeoTargetType: 'PRESENCE',
    });
    expect(added.mismatches).toEqual([]);
    expect(added.prepared.warnings.join(' ')).toMatch(/Already targeted.*United States/);
    expect(added.after.targetedGeoConstants).toEqual([
      'geoTargetConstants/2124',
      'geoTargetConstants/2826',
      'geoTargetConstants/2840',
    ]);
    expect(added.after.excludedGeoConstants).toEqual(['geoTargetConstants/21132']);
    expect(added.after.positiveGeoTargetType).toBe('PRESENCE');

    // Now replace targeted locations with just France & Germany, and remove Alaska exclusion.
    const replaced = await run('update_campaign_locations', {
      campaignId: '111',
      setLocations: ['France', 'Germany'],
      removeLocations: ['Alaska'],
    });
    expect(replaced.mismatches).toEqual([]);
    expect(replaced.after.targetedGeoConstants).toEqual([
      'geoTargetConstants/2250',
      'geoTargetConstants/2276',
    ]);
    expect(replaced.after.excludedGeoConstants).toEqual([]);
  });

  it('rejects invalid combinations and no-op location edits', async () => {
    await expect(
      run('update_campaign_locations', {
        campaignId: '222',
        setLocations: ['United States'],
      })
    ).rejects.toMatchObject({ payload: { code: 'invalid_argument', message: expect.stringMatching(/already has/) } });

    await expect(
      run('update_campaign_locations', {
        campaignId: '444',
        positiveGeoTargetType: 'SEARCH_INTEREST',
      })
    ).rejects.toMatchObject({ payload: { code: 'unsupported' } });

    await expect(
      run('update_campaign_locations', {
        campaignId: '222',
        excludeLocations: ['United States'],
      })
    ).rejects.toMatchObject({ payload: { code: 'invalid_argument', message: expect.stringMatching(/Remove it from targeted locations/) } });
  });
});
