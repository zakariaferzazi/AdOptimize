import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));
const adsMock = vi.hoisted(() => ({ query: vi.fn(), settings: vi.fn(), goals: vi.fn(), actions: vi.fn() }));
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
import type { Campaign } from '@/types/adoptimize';

const CUSTOMER = '1234567890';

/** Messages array as it was at the moment of each model call. */
const snapshots: Array<Array<{ role: string; content?: string | null; tool_call_id?: string }>> = [];
/** Queued model responses, consumed in order. */
const responseQueue: unknown[] = [];

function queue(...responses: unknown[]) {
  responseQueue.push(...responses);
}

function campaign(id: string, name: string): Campaign {
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
  };
}

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

beforeEach(() => {
  resetMemoryStore();
  vi.clearAllMocks();
  // clearAllMocks does not drain the mockResolvedValueOnce queue.
  openRouterMock.send.mockReset();
  // Snapshot the messages array at call time: the agent keeps pushing into the
  // same array it handed to the mock, so inspecting it later shows extra entries.
  openRouterMock.send.mockImplementation(async (options: { messages: unknown[] }) => {
    snapshots.push(JSON.parse(JSON.stringify(options.messages)));
    const next = responseQueue.shift();
    if (!next) throw new Error('No queued model response for this call.');
    return next;
  });
  snapshots.length = 0;
  responseQueue.length = 0;
  identityMock.verify.mockResolvedValue({ uid: 'user-1', emailVerified: true, expiresAt: 0 });
  bindingMock.account.mockResolvedValue({
    userId: 'user-1',
    customerId: CUSTOMER,
    accountName: 'Test Account',
    currency: 'GBP',
    isConnected: true,
  });
  bindingMock.credentials.mockResolvedValue({ accessToken: 'token', expiresAt: Date.now() + 3600_000 });
  adsMock.query.mockResolvedValue({
    success: true,
    campaigns: [campaign('111', 'test app')],
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
  adsMock.goals.mockResolvedValue({ success: true, goals: [] });
  adsMock.actions.mockResolvedValue({ success: true, actions: [] });
});

describe('model request payload inspection', () => {
  it('sends the full chronological transcript with tool results on later turns', async () => {
    // Turn 1: a tool call plus an answer.
    queue(
      toolCallReply('get_campaigns', {}),
      textReply('You have one campaign: test app.')
    );

    const first = await (
      await chatPost(chatRequest({ message: 'What campaigns do I have?' }))
    ).json();

    // Turn 2: a follow-up.
    queue(textReply('It is enabled.'));

    await chatPost(
      chatRequest({ message: 'Is it enabled?', conversationId: first.conversationId })
    );

    const turn2Messages = snapshots[2];
    const roles = turn2Messages.map((message) => message.role);

    // system, user, assistant(tool_calls), tool, assistant, user
    expect(roles.join(',')).toBe('system,user,assistant,tool,assistant,user');

    const contents = turn2Messages.map((message) => message.content);
    expect(contents).toContain('What campaigns do I have?');
    expect(contents).toContain('You have one campaign: test app.');
    expect(contents).toContain('Is it enabled?');

    // The tool result from turn 1 is still present and parseable.
    const toolMessage = turn2Messages.find((message) => message.role === 'tool');
    expect(toolMessage?.tool_call_id).toBe('call-1');
    expect(() => JSON.parse(toolMessage?.content || '')).not.toThrow();
  });

  it('includes the task tool in the tool definitions sent to the model', async () => {
    queue(textReply('ok'));
    await chatPost(chatRequest({ message: 'hi' }));

    const tools = openRouterMock.send.mock.calls[0][0].tools;
    const names = tools.map((tool: { function: { name: string } }) => tool.function.name);
    expect(names).toContain('update_task_state');
    expect(names).toContain('get_conversion_actions');
    expect(names).toContain('get_campaign_conversion_goals');
    expect(names).toContain('create_campaign');
  });

  it('injects the persisted task into the system prompt on the next turn', async () => {
    queue(
      toolCallReply('update_task_state', {
        kind: 'create_campaign',
        objective: 'Create the Q3 search campaign',
        parameters: { name: 'Q3 search campaign', budgetDaily: 5, currency: 'GBP' },
        missing: [],
      }),
      textReply('Ready to create it.')
    );

    const first = await (
      await chatPost(chatRequest({ message: 'Q3 search campaign, 5 GBP' }))
    ).json();

    queue(textReply('Creating it now.'));
    await chatPost(chatRequest({ message: 'create it', conversationId: first.conversationId }));

    const system = snapshots[2][0].content as string;
    expect(system).toContain('ACTIVE TASK');
    expect(system).toContain('Create the Q3 search campaign');
    expect(system).toContain('Q3 search campaign');
    expect(system).toContain('"budgetDaily": 5');
    expect(system).toContain('"currency": "GBP"');
    // The instruction that prevents re-asking.
    expect(system).toContain('never start over');
  });

  it('records the pending proposal in task state after it is prepared', async () => {
    queue(
      toolCallReply('update_task_state', {
        kind: 'update_campaign',
        campaignId: '111',
        campaignName: 'test app',
      }),
      toolCallReply(
        'update_campaign_budget',
        { campaignId: '111', newDailyBudget: 25 },
        'call-2'
      ),
      textReply('Prepared a budget change. Approve it to apply.')
    );

    const result = await (
      await chatPost(chatRequest({ message: 'Lower test app to 25' }))
    ).json();

    expect(result.actionProposal).toBeDefined();

    // The next turn's prompt knows about the pending proposal.
    queue(textReply('It is still pending.'));
    await chatPost(
      chatRequest({ message: 'what happened?', conversationId: result.conversationId })
    );

    const system = snapshots[3][0].content as string;
    expect(system).toContain('pending_proposal');
    expect(system).toContain(result.actionProposal.proposalId);
  });

  it('keeps the campaign identity in task state across turns', async () => {
    queue(
      toolCallReply('update_task_state', {
        kind: 'conversion_goals',
        campaignId: '111',
        campaignName: 'test app',
      }),
      textReply('Working on test app.')
    );

    const first = await (
      await chatPost(chatRequest({ message: 'Change goals for test app' }))
    ).json();

    queue(textReply('Still test app.'));
    await chatPost(chatRequest({ message: 'and now?', conversationId: first.conversationId }));

    const system = snapshots[2][0].content as string;
    expect(system).toContain('"campaignId": "111"');
    expect(system).toContain('"name": "test app"');
    expect(system).toContain(`"customerId": "${CUSTOMER}"`);
  });
});


