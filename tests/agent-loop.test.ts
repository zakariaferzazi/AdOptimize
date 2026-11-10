import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));
const adsMock = vi.hoisted(() => ({ query: vi.fn(), settings: vi.fn(), goals: vi.fn() }));

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
  };
});

import { runAgent, type AgentMessage } from '@/lib/ai/agent';
import { TOOL_LOOP_LIMIT } from '@/lib/ai/prompts';
import { CONTEXT_FULL_MESSAGE } from '@/lib/ai/context-budget';
import type { McpServerContext } from '@/lib/mcp/google-ads-server';
import type { Campaign } from '@/types/adoptimize';

function campaign(id: string, name: string, overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: `camp-live-${id}`,
    accountId: '1234567890',
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

const CAMPAIGNS = [
  campaign('111', 'Search - High Intent'),
  campaign('222', 'Display - Retargeting', { status: 'PAUSED', roas: 0.8, conversions: 0 }),
];

function context(overrides: Partial<McpServerContext> = {}): McpServerContext {
  return {
    customerId: '1234567890',
    accessToken: 'token',
    currency: 'USD',
    accountName: 'Test Account',
    snapshot: {
      campaigns: CAMPAIGNS,
      keywords: [],
      searchTerms: [],
      fetchedAt: new Date().toISOString(),
    },
    ...overrides,
  };
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
  vi.clearAllMocks();
  openRouterMock.send.mockReset();
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
      resourceName: 'customers/1234567890/campaigns/111',
      name: 'Search - High Intent',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      budgetResourceName: 'customers/1234567890/campaignBudgets/999',
      budgetDaily: 50,
    },
  });
  adsMock.goals.mockResolvedValue({ success: true, goals: [] });
});

describe('agent loop', () => {
  it('answers a plain question without calling a tool', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('Your CPA is 20.00.'));

    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'What is my CPA?' }],
      mcpContext: context(),
    });

    expect(result.reply).toBe('Your CPA is 20.00.');
    expect(result.toolCalls).toHaveLength(0);
    expect(result.steps).toBe(1);
  });

  it('executes a tool call and feeds the result back to the model', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(toolCallReply('get_campaigns', {}))
      .mockResolvedValueOnce(textReply('You have 2 campaigns.'));

    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'List my campaigns' }],
      mcpContext: context(),
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('get_campaigns');
    expect(result.toolCalls[0].isError).toBe(false);
    expect(result.reply).toBe('You have 2 campaigns.');
    expect(result.steps).toBe(2);

    // The second model call must include the tool result as a real tool message.
    const secondCall = openRouterMock.send.mock.calls[1][0];
    const toolMessage = secondCall.messages.find((message: AgentMessage) => message.role === 'tool');
    expect(toolMessage).toBeDefined();
    expect(toolMessage.tool_call_id).toBe('call-1');
    expect(JSON.parse(toolMessage.content).data).toHaveLength(2);
  });

  it('preserves the full chronological history in the model request', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('Yes.'));

    const history: AgentMessage[] = [
      { role: 'user', content: 'How did my campaigns perform?' },
      { role: 'assistant', content: 'The account was stable.' },
      { role: 'user', content: 'Can you explain that?' },
      { role: 'assistant', content: 'The strongest campaign drove most conversions.' },
      { role: 'user', content: 'What about yesterday?' },
    ];

    await runAgent({ model: 'deepseek', history, mcpContext: context() });

    const request = openRouterMock.send.mock.calls[0][0];
    const contents = request.messages.map((message: AgentMessage) => message.content);
    expect(contents).toContain('How did my campaigns perform?');
    expect(contents).toContain('The account was stable.');
    expect(contents).toContain('Can you explain that?');
    expect(contents).toContain('The strongest campaign drove most conversions.');
    expect(contents).toContain('What about yesterday?');
  });

  it('stops before calling the model when the context budget is exhausted', async () => {
    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'x'.repeat(200000) }],
      mcpContext: context(),
    });

    expect(result.contextFull).toBe(true);
    expect(result.reply).toBe(CONTEXT_FULL_MESSAGE);
    expect(openRouterMock.send).not.toHaveBeenCalled();
  });

  it('never truncates history to make it fit', async () => {
    const history: AgentMessage[] = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${index} ${'y'.repeat(200)}`,
    }));

    openRouterMock.send.mockResolvedValueOnce(textReply('ok'));
    await runAgent({ model: 'chatgpt', history, mcpContext: context() });

    const request = openRouterMock.send.mock.calls[0][0];
    const userMessages = request.messages.filter((message: AgentMessage) => message.role === 'user');
    expect(userMessages).toHaveLength(20);
  });

  it('caps the tool loop and asks for a summary instead of looping forever', async () => {
    openRouterMock.send.mockResolvedValue(toolCallReply('get_campaigns', {}));

    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'Keep looking' }],
      mcpContext: context(),
    });

    expect(result.toolCalls.length).toBe(TOOL_LOOP_LIMIT);
    expect(openRouterMock.send).toHaveBeenCalledTimes(TOOL_LOOP_LIMIT + 1);
  });

  it('passes tool errors back to the model as structured data', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('get_campaign_performance', { campaignId: '999' })
      )
      .mockResolvedValueOnce(textReply('That campaign does not exist.'));

    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'Analyse campaign 999' }],
      mcpContext: context(),
    });

    expect(result.toolCalls[0].isError).toBe(true);
    expect((result.toolCalls[0].result as { code: string }).code).toBe('not_found');
    expect(result.reply).toBe('That campaign does not exist.');
  });

  it('prepares a proposal for a write request without executing it', async () => {
    const prepareProposal = vi.fn().mockResolvedValue({ proposalId: 'proposal-1', revision: 1 });

    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('update_campaign_status', { campaignId: '111', status: 'PAUSED' })
      )
      .mockResolvedValueOnce(textReply('I prepared a pause. Approve it to apply.'));

    const result = await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'Pause the high intent campaign' }],
      mcpContext: context(),
      mcpHooks: { prepareProposal },
    });

    expect(prepareProposal).toHaveBeenCalledTimes(1);
    expect((result.toolCalls[0].result as { code: string }).code).toBe('proposal_required');
    expect(result.reply).toContain('Approve');
  });

  it('resolves a follow-up reference using the campaign index', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('get_campaign_performance', { campaignId: '222' })
      )
      .mockResolvedValueOnce(textReply('Display - Retargeting has 0.8x ROAS.'));

    const result = await runAgent({
      model: 'deepseek',
      history: [
        { role: 'user', content: 'Which campaign is worst?' },
        { role: 'assistant', content: 'Display - Retargeting is the weakest.' },
        { role: 'user', content: 'Show me its details' },
      ],
      mcpContext: context(),
    });

    expect(result.toolCalls[0].arguments.campaignId).toBe('222');
    expect(result.reply).toContain('Display - Retargeting');
  });

  it('includes the campaign index in the system prompt', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('ok'));
    await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'hi' }],
      mcpContext: context(),
    });

    const system = openRouterMock.send.mock.calls[0][0].messages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('111');
    expect(system.content).toContain('Search - High Intent');
    expect(system.content).toContain('222');
  });

  it('tells the model that chat confirmation is not approval', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('ok'));
    await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'hi' }],
      mcpContext: context(),
    });

    const system = openRouterMock.send.mock.calls[0][0].messages[0];
    expect(system.content).toContain('not approval');
  });

  it('sends the MCP tool definitions to the model', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('ok'));
    await runAgent({
      model: 'deepseek',
      history: [{ role: 'user', content: 'hi' }],
      mcpContext: context(),
    });

    const tools = openRouterMock.send.mock.calls[0][0].tools;
    const names = tools.map((tool: { function: { name: string } }) => tool.function.name);
    expect(names).toContain('get_campaigns');
    expect(names).toContain('update_campaign_status');
    expect(names).toContain('create_campaign');
  });
});
