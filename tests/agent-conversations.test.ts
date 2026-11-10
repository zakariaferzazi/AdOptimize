import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));
const adsMock = vi.hoisted(() => ({
  query: vi.fn(),
  settings: vi.fn(),
  goals: vi.fn(),
  actions: vi.fn(),
}));
const mutateMock = vi.hoisted(() => ({ resources: vi.fn(), combined: vi.fn() }));
const identityMock = vi.hoisted(() => ({ verify: vi.fn() }));
const bindingMock = vi.hoisted(() => ({ account: vi.fn(), credentials: vi.fn() }));

vi.mock('@/lib/openrouter-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openrouter-service')>('@/lib/openrouter-service');
  return { ...actual, sendOpenRouterChat: openRouterMock.send };
});

vi.mock('@/lib/google-ads-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads-api')>('@/lib/google-ads-api');
  return {
    ...actual,
    queryLiveCampaigns: adsMock.query,
    fetchCampaignSettings: adsMock.settings,
    fetchCampaignConversionGoals: adsMock.goals,
    fetchConversionActions: adsMock.actions,
  };
});

vi.mock('@/lib/google-ads/mutate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads/mutate')>('@/lib/google-ads/mutate');
  return {
    ...actual,
    mutateGoogleAdsResources: mutateMock.resources,
    mutateGoogleAdsCombined: mutateMock.combined,
  };
});

vi.mock('@/lib/ai/identity', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/identity')>('@/lib/ai/identity');
  return { ...actual, requireIdentity: identityMock.verify };
});

vi.mock('@/lib/ai/account-binding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/account-binding')>('@/lib/ai/account-binding');
  return {
    ...actual,
    resolveAccountBinding: bindingMock.account,
    resolveGoogleAdsCredentials: bindingMock.credentials,
  };
});

import { POST as chatPost } from '@/app/api/ai/chat/route';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import { loadTaskState } from '@/lib/ai/conversations';
import type { Campaign } from '@/types/adoptimize';

const CUSTOMER = '1234567890';

function campaign(id: string, name: string, overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: `camp-live-${id}`,
    accountId: CUSTOMER,
    name,
    type: 'SEARCH',
    status: 'ENABLED',
    budgetDaily: 50,
    spend: 100,
    impressions: 1000,
    clicks: 50,
    ctr: 5,
    cpc: 2,
    conversions: 5,
    cpa: 20,
    conversionValue: 400,
    roas: 4,
    conversionRate: 10,
    healthStatus: 'HEALTHY',
    healthScore: 80,
    trendPoints: [],
    historicalPoints: [],
    keywordsCount: 0,
    activeAdsCount: 0,
    ...overrides,
  };
}

const CAMPAIGNS = [campaign('111', 'test app')];

function chatRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  }) as never;
}

function textReply(content: string) {
  return {
    reply: content,
    modelUsed: 'test',
    assistantMessage: { role: 'assistant' as const, content },
  };
}

function toolCallReply(name: string, args: Record<string, unknown>, id = 'call-1') {
  return {
    reply: '',
    modelUsed: 'test',
    toolCalls: [{ id, name, arguments: args }],
    assistantMessage: {
      role: 'assistant' as const,
      content: null,
      tool_calls: [
        { id, type: 'function' as const, function: { name, arguments: JSON.stringify(args) } },
      ],
    },
  };
}

/** Queue a sequence of model responses for one turn. */
function queueTurn(...responses: unknown[]) {
  for (const response of responses) openRouterMock.send.mockResolvedValueOnce(response);
}

async function send(message: string, conversationId?: string) {
  const response = await chatPost(chatRequest({ message, conversationId }));
  const body = await response.json();
  return { status: response.status, body };
}

/** The system prompt sent on the Nth model call of the whole test. */
function systemPromptAt(callIndex: number): string {
  return openRouterMock.send.mock.calls[callIndex][0].messages[0].content as string;
}

beforeEach(() => {
  resetMemoryStore();
  vi.clearAllMocks();
  identityMock.verify.mockResolvedValue({ uid: 'user-1', emailVerified: true, expiresAt: 0 });
  bindingMock.account.mockResolvedValue({
    userId: 'user-1',
    customerId: CUSTOMER,
    accountName: 'Test Account',
    currency: 'GBP',
    isConnected: true,
  });
  bindingMock.credentials.mockResolvedValue({
    accessToken: 'token',
    expiresAt: Date.now() + 3600_000,
  });
  adsMock.query.mockResolvedValue({
    success: true,
    campaigns: CAMPAIGNS,
    keywords: [],
    searchTerms: [],
    fetchedAt: new Date().toISOString(),
  });
  adsMock.settings.mockResolvedValue({
    success: true,
    settings: {
      campaignId: '111',
      resourceName: `customers/${CUSTOMER}/campaigns/111`,
      name: 'test app',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      budgetResourceName: `customers/${CUSTOMER}/campaignBudgets/999`,
      budgetDaily: 50,
    },
  });
  adsMock.goals.mockResolvedValue({
    success: true,
    goals: [
      { category: 'DOWNLOAD', origin: 'APP', biddable: true, resourceName: 'g1' },
      { category: 'PURCHASE', origin: 'APP', biddable: true, resourceName: 'g2' },
    ],
  });
  adsMock.actions.mockResolvedValue({
    success: true,
    actions: [
      {
        id: 'a1',
        name: 'App install',
        category: 'DOWNLOAD',
        type: 'MOBILE_APP_INSTALL',
        status: 'ENABLED',
        origin: 'APP',
        primaryForGoal: true,
      },
    ],
  });
  mutateMock.resources.mockResolvedValue({ success: true, results: [] });
  mutateMock.combined.mockResolvedValue({ success: true, responses: [] });
});

describe('Scenario A — campaign creation across four messages', () => {
  it('remembers name, budget, currency, paused status and the CPC constraint', async () => {
    // Turn 1: objective + CPC constraint, no name or budget yet.
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'create_campaign',
        objective: 'Build the approved Q3 search campaign, paused, CPC under 8',
        parameters: { channelType: 'SEARCH', status: 'PAUSED', maxCpc: 8 },
        missing: ['name', 'budgetDaily'],
        unsupported: ['A campaign-level max CPC cap is not supported by this integration'],
      }),
      textReply('What should the campaign be called, and what daily budget should it have?')
    );
    const turn1 = await send('Build the approved Q3 search campaign. Keep CPC under $8 and create it paused.');
    expect(turn1.status).toBe(200);

    const conversationId = turn1.body.conversationId as string;
    const afterTurn1 = await loadTaskState('user-1', conversationId);
    expect(afterTurn1?.kind).toBe('create_campaign');
    expect(afterTurn1?.parameters.channelType).toBe('SEARCH');
    expect(afterTurn1?.parameters.status).toBe('PAUSED');
    expect(afterTurn1?.parameters.maxCpc).toBe(8);
    expect(afterTurn1?.missing).toEqual(['name', 'budgetDaily']);

    // Turn 2: supplies name, budget and CPC. Must merge, not replace.
    queueTurn(
      toolCallReply('update_task_state', {
        parameters: { name: 'Q3 search campaign', budgetDaily: 5, maxCpc: 0.3 },
        missing: ['currency'],
      }),
      textReply('Got it — Q3 search campaign at 5 per day. Which currency should I use?')
    );
    const turn2 = await send('Q3 search campaign, 5$, max cpc 0.3$', conversationId);

    const afterTurn2 = await loadTaskState('user-1', conversationId);
    expect(afterTurn2?.parameters.name).toBe('Q3 search campaign');
    expect(afterTurn2?.parameters.budgetDaily).toBe(5);
    expect(afterTurn2?.parameters.maxCpc).toBe(0.3);
    // Values from turn 1 survived.
    expect(afterTurn2?.parameters.channelType).toBe('SEARCH');
    expect(afterTurn2?.parameters.status).toBe('PAUSED');
    expect(afterTurn2?.missing).toEqual(['currency']);

    // The model saw the accumulated task on turn 2 (turn 1 used calls 0 and 1).
    const turn2Prompt = systemPromptAt(2);
    expect(turn2Prompt).toContain('ACTIVE TASK');
    expect(turn2Prompt).toContain('Q3 search campaign');
    expect(turn2Prompt).toContain('SEARCH');

    // Turn 3: currency only.
    queueTurn(
      toolCallReply('update_task_state', { parameters: { currency: 'GBP' }, missing: [] }),
      textReply('Using GBP. Ready to create it paused at £5/day.')
    );
    await send('okay use GBP', conversationId);

    const afterTurn3 = await loadTaskState('user-1', conversationId);
    expect(afterTurn3?.parameters.currency).toBe('GBP');
    expect(afterTurn3?.parameters.name).toBe('Q3 search campaign');
    expect(afterTurn3?.parameters.budgetDaily).toBe(5);
    expect(afterTurn3?.missing).toEqual([]);

    // Turn 4: "create it" must continue the task, not start over.
    queueTurn(
      toolCallReply('create_campaign', {
        name: 'Q3 search campaign',
        budgetDaily: 5,
        channelType: 'SEARCH',
        maxCpc: 0.3,
        reason: 'Approved Q3 search campaign',
      }),
      textReply(
        'I prepared the paused Q3 search campaign at £5/day. The £0.30 CPC cap cannot be set at campaign level, so it is not applied. Approve the card to create it.'
      )
    );
    const turn4 = await send('create it', conversationId);

    expect(turn4.status).toBe(200);
    expect(turn4.body.actionProposal).toBeDefined();
    expect(turn4.body.actionProposal.status).toBe('PENDING_APPROVAL');

    // The proposal carries the accumulated values.
    const payload = turn4.body.actionProposal.payload as Record<string, unknown>;
    expect(payload.name).toBe('Q3 search campaign');
    expect(payload.budgetDaily).toBe(5);
    expect(payload.channelType).toBe('SEARCH');

    // The reply explains the unsupported CPC cap instead of silently dropping it.
    expect(turn4.body.reply.toLowerCase()).toContain('cpc');
    expect(turn4.body.reply.toLowerCase()).toMatch(/cannot|not applied|not supported/);

    // The model was told about the pending proposal for the next turn.
    const afterTurn4 = await loadTaskState('user-1', conversationId);
    expect(afterTurn4?.proposal?.proposalId).toBe(turn4.body.actionProposal.proposalId);
  });

  it('never asks what to create when the task already has a name', async () => {
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'create_campaign',
        objective: 'Create Q3 search campaign',
        parameters: { name: 'Q3 search campaign', budgetDaily: 5, channelType: 'SEARCH' },
        missing: [],
      }),
      textReply('Ready.')
    );
    const turn1 = await send('Q3 search campaign, 5$, search');
    const conversationId = turn1.body.conversationId as string;

    queueTurn(
      toolCallReply('create_campaign', {
        name: 'Q3 search campaign',
        budgetDaily: 5,
        channelType: 'SEARCH',
      }),
      textReply('Prepared. Approve to create it.')
    );
    await send('create it', conversationId);

    // The second turn's prompt must contain the name from the first turn.
    const turn2Prompt = systemPromptAt(2);
    expect(turn2Prompt).toContain('Q3 search campaign');
    expect(turn2Prompt).toContain('"budgetDaily": 5');
  });
});

describe('Scenario B — conversion goals', () => {
  it('remembers the campaign and investigates goals and actions', async () => {
    // Turn 1: names the campaign and the goal.
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'conversion_goals',
        objective: 'Set conversion goal to installs only',
        campaignId: '111',
        campaignName: 'test app',
        parameters: { goal: 'installs' },
        missing: [],
      }),
      toolCallReply('get_campaign_conversion_goals', { campaignId: '111' }, 'call-2'),
      textReply(
        'test app currently bids on DOWNLOAD and PURCHASE goals. Which should I keep?'
      )
    );
    const turn1 = await send('Change Conversion goal in that campaign to only install goal.');
    const conversationId = turn1.body.conversationId as string;

    const afterTurn1 = await loadTaskState('user-1', conversationId);
    expect(afterTurn1?.campaign?.campaignId).toBe('111');
    expect(afterTurn1?.campaign?.name).toBe('test app');
    expect(afterTurn1?.campaign?.customerId).toBe(CUSTOMER);

    // Turn 2: clarifies "installs means download". Must not re-ask the campaign.
    queueTurn(
      toolCallReply('update_task_state', {
        parameters: { goal: 'download' },
        decisions: ['Only installs means only the download goal'],
        missing: [],
      }),
      textReply('Understood — only the download goal.')
    );
    await send("I said only installs, that's mean only download.", conversationId);

    const afterTurn2 = await loadTaskState('user-1', conversationId);
    expect(afterTurn2?.parameters.goal).toBe('download');
    expect(afterTurn2?.campaign?.campaignId).toBe('111');
    expect(afterTurn2?.decisions).toContain('Only installs means only the download goal');

    // The prompt on turn 2 carried the campaign identity.
    const turn2Prompt = systemPromptAt(2);
    expect(turn2Prompt).toContain('test app');
    expect(turn2Prompt).toContain('111');

    // Turn 3: "test app" again — still the same campaign, no re-asking.
    queueTurn(
      toolCallReply('update_task_state', { campaignName: 'test app' }),
      textReply('Still working on test app.')
    );
    await send('test app', conversationId);

    const afterTurn3 = await loadTaskState('user-1', conversationId);
    expect(afterTurn3?.campaign?.campaignId).toBe('111');

    // Turn 4: user asserts campaign-level override is possible. The agent must
    // investigate both layers and then act on the supported one.
    queueTurn(
      toolCallReply('get_conversion_actions', {}, 'call-3'),
      toolCallReply(
        'update_campaign_conversion_goals',
        { campaignId: '111', category: 'DOWNLOAD', biddable: true, origin: 'APP' },
        'call-4'
      ),
      textReply(
        'You are right that campaign-level goals can be overridden. I prepared a change that keeps only the download goal biddable for test app. Approve it to apply.'
      )
    );
    const turn4 = await send(
      'I think you can override my account-level defaults and select specific conversion actions for that individual campaign.',
      conversationId
    );

    expect(turn4.status).toBe(200);
    expect(turn4.body.actionProposal).toBeDefined();

    const payload = turn4.body.actionProposal.payload as Record<string, unknown>;
    expect(payload.campaignId).toBe('111');
    expect(payload.category).toBe('DOWNLOAD');
    expect(payload.origin).toBe('APP');
    expect(payload.biddable).toBe(true);

    // The agent actually read the account conversion actions.
    const toolNames = (turn4.body.toolCalls || []).map((call: { name: string }) => call.name);
    expect(toolNames).toContain('get_conversion_actions');
  });

  it('uses the campaignConversionGoals service with a real origin', async () => {
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'conversion_goals',
        campaignId: '111',
        campaignName: 'test app',
      }),
      toolCallReply(
        'update_campaign_conversion_goals',
        { campaignId: '111', category: 'DOWNLOAD', biddable: true, origin: 'APP' },
        'call-2'
      ),
      textReply('Prepared.')
    );
    const result = await send('Only installs for test app');

    expect(result.body.actionProposal).toBeDefined();
    const payload = result.body.actionProposal.payload as Record<string, unknown>;
    expect(payload.origin).toBe('APP');
  });
});

describe('task state durability', () => {
  it('survives across turns and is injected into every request', async () => {
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'update_campaign',
        objective: 'Lower the budget on test app',
        campaignId: '111',
        campaignName: 'test app',
        parameters: { newDailyBudget: 25 },
        missing: [],
      }),
      textReply('Noted.')
    );
    const turn1 = await send('Lower test app budget to 25');
    const conversationId = turn1.body.conversationId as string;

    queueTurn(textReply('Still 25.'))
    await send('what did I ask for?', conversationId);

    const prompt = systemPromptAt(2);
    expect(prompt).toContain('Lower the budget on test app');
    expect(prompt).toContain('"newDailyBudget": 25');
    expect(prompt).toContain('test app');
  });

  it('does not leak task state between conversations', async () => {
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'create_campaign',
        objective: 'Create campaign A',
        parameters: { name: 'Campaign A' },
      }),
      textReply('ok')
    );
    const first = await send('Create campaign A');

    queueTurn(textReply('Hello.'))
    await send('Hi', 'a-different-conversation');

    const prompt = systemPromptAt(2);
    expect(prompt).not.toContain('Campaign A');
    expect(prompt).toContain('None yet');

    const firstTask = await loadTaskState('user-1', first.body.conversationId);
    expect(firstTask?.parameters.name).toBe('Campaign A');
  });
});

describe('tool failure recovery', () => {
  it('returns structured Google Ads error detail to the model', async () => {
    queueTurn(
      toolCallReply('update_task_state', {
        kind: 'conversion_goals',
        campaignId: '111',
        campaignName: 'test app',
      }),
      toolCallReply(
        'update_campaign_conversion_goals',
        { campaignId: '111', category: 'DOWNLOAD', biddable: true, origin: 'APP' },
        'call-2'
      ),
      textReply('That specific change was rejected; here is what is possible instead.')
    );

    // Make the settings read succeed but the proposal build fail validation.
    const result = await send('Only installs for test app');

    // The model received a tool result it could reason about.
    const toolMessages = openRouterMock.send.mock.calls
      .flatMap((call: any[]) => call[0].messages)
      .filter((message: { role: string }) => message.role === 'tool');
    expect(toolMessages.length).toBeGreaterThan(0);
    for (const message of toolMessages) {
      expect(() => JSON.parse(message.content)).not.toThrow();
    }
    expect(result.status).toBe(200);
  });

  it('never exposes a raw error string to the user', async () => {
    adsMock.goals.mockResolvedValue({
      success: false,
      statusCode: 400,
      error: 'INVALID_ARGUMENT: campaign_conversion_goal.category is not a valid enum value',
    });

    queueTurn(
      toolCallReply('update_task_state', { kind: 'conversion_goals', campaignId: '111' }),
      toolCallReply('get_campaign_conversion_goals', { campaignId: '111' }, 'call-2'),
      textReply('I could not read the conversion goals for that campaign right now.')
    );
    const result = await send('Show conversion goals for test app');

    expect(result.body.reply).not.toContain('INVALID_ARGUMENT');
    expect(result.body.reply).not.toContain('enum value');
  });
});
