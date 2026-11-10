import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));
const adsMock = vi.hoisted(() => ({ query: vi.fn(), settings: vi.fn(), goals: vi.fn() }));
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
  return {
    ...actual,
    requireIdentity: identityMock.verify,
  };
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
import { POST as approvePost } from '@/app/api/ai/chat/approve/route';
import { POST as executePost } from '@/app/api/ai/chat/execute/route';
import { GET as conversationsGet } from '@/app/api/ai/conversations/route';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
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

const CAMPAIGNS = [campaign('111', 'Search - High Intent')];

function chatRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  }) as never;
}

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
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
  identityMock.verify.mockResolvedValue({ uid: 'user-1', emailVerified: true, expiresAt: 0 });
  bindingMock.account.mockResolvedValue({
    userId: 'user-1',
    customerId: CUSTOMER,
    accountName: 'Test Account',
    currency: 'USD',
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
      name: 'Search - High Intent',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      budgetResourceName: `customers/${CUSTOMER}/campaignBudgets/999`,
      budgetDaily: 50,
    },
  });
  adsMock.goals.mockResolvedValue({ success: true, goals: [] });
  mutateMock.resources.mockResolvedValue({ success: true, results: [] });
  mutateMock.combined.mockResolvedValue({ success: true, responses: [] });
});

describe('end-to-end: read question', () => {
  it('answers a question, persists the conversation and returns no proposal', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(toolCallReply('get_campaigns', {}))
      .mockResolvedValueOnce(textReply('You have one campaign: Search - High Intent.'));

    const response = await chatPost(chatRequest({ message: 'What campaigns do I have?' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reply).toContain('Search - High Intent');
    expect(body.actionProposal).toBeUndefined();
    expect(body.toolCalls).toHaveLength(1);
    expect(body.conversationId).toBeTruthy();

    // The conversation is server-authoritative.
    const stored = await memoryStore.messages.list(body.conversationId, 'user-1');
    expect(stored.map((message) => message.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    expect(stored[0].content).toBe('What campaigns do I have?');
  });

  it('rejects an unauthenticated request', async () => {
    const { UnauthorizedError } = await import('@/lib/ai/identity');
    identityMock.verify.mockRejectedValueOnce(new UnauthorizedError('Sign in again to continue.'));
    const response = await chatPost(chatRequest({ message: 'hi' }));
    expect(response.status).toBe(401);
  });

  it('refuses to run without a connected Google Ads account', async () => {
    bindingMock.account.mockResolvedValueOnce(undefined);
    const response = await chatPost(chatRequest({ message: 'hi' }));
    expect(response.status).toBe(409);
  });
});

describe('end-to-end: proposal and execution', () => {
  it('prepares a proposal, then approves and executes it exactly once', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('update_campaign_budget', { campaignId: '111', newDailyBudget: 75 })
      )
      .mockResolvedValueOnce(textReply('I prepared a budget change. Approve it to apply.'));

    const chatResponse = await chatPost(
      chatRequest({ message: 'Raise the high intent campaign budget to 75' })
    );
    const chatBody = await chatResponse.json();

    expect(chatBody.actionProposal).toBeDefined();
    expect(chatBody.actionProposal.status).toBe('PENDING_APPROVAL');
    expect(chatBody.actionProposal.revision).toBe(1);

    const proposal = chatBody.actionProposal;

    // Nothing was mutated while preparing the proposal.
    expect(mutateMock.resources).not.toHaveBeenCalled();

    const approveResponse = await approvePost(
      jsonRequest('http://localhost/api/ai/chat/approve', {
        proposal_id: proposal.proposalId,
        revision: proposal.revision,
        payload_hash: proposal.payloadHash,
      })
    );
    expect(approveResponse.status).toBe(200);

    adsMock.settings
      .mockResolvedValueOnce({
        success: true,
        settings: {
          campaignId: '111',
          resourceName: `customers/${CUSTOMER}/campaigns/111`,
          name: 'Search - High Intent',
          status: 'ENABLED',
          budgetResourceName: `customers/${CUSTOMER}/campaignBudgets/999`,
          budgetDaily: 50,
        },
      })
      .mockResolvedValue({
        success: true,
        settings: {
          campaignId: '111',
          resourceName: `customers/${CUSTOMER}/campaigns/111`,
          name: 'Search - High Intent',
          status: 'ENABLED',
          budgetResourceName: `customers/${CUSTOMER}/campaignBudgets/999`,
          budgetDaily: 75,
        },
      });

    const executeResponse = await executePost(
      jsonRequest('http://localhost/api/ai/chat/execute', {
        proposal_id: proposal.proposalId,
        revision: proposal.revision,
        payload_hash: proposal.payloadHash,
      })
    );
    const executeBody = await executeResponse.json();

    expect(executeResponse.status).toBe(200);
    expect(executeBody.success).toBe(true);
    expect(executeBody.status).toBe('succeeded');

    // validateOnly then the real mutate.
    expect(mutateMock.resources).toHaveBeenCalledTimes(2);
    expect(mutateMock.resources.mock.calls[0][3]).toEqual({ validateOnly: true });

    // A second execution returns the stored outcome without mutating again.
    const secondResponse = await executePost(
      jsonRequest('http://localhost/api/ai/chat/execute', {
        proposal_id: proposal.proposalId,
        revision: proposal.revision,
        payload_hash: proposal.payloadHash,
      })
    );
    expect(secondResponse.status).toBe(200);
    expect(mutateMock.resources).toHaveBeenCalledTimes(2);
  });

  it('refuses to execute a proposal that was never approved', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('update_campaign_status', { campaignId: '111', status: 'PAUSED' })
      )
      .mockResolvedValueOnce(textReply('Prepared.'));

    const chatBody = await (
      await chatPost(chatRequest({ message: 'Pause the high intent campaign' }))
    ).json();

    const executeResponse = await executePost(
      jsonRequest('http://localhost/api/ai/chat/execute', {
        proposal_id: chatBody.actionProposal.proposalId,
        revision: chatBody.actionProposal.revision,
        payload_hash: chatBody.actionProposal.payloadHash,
      })
    );

    expect(executeResponse.status).toBe(409);
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('refuses to approve a stale revision', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('update_campaign_status', { campaignId: '111', status: 'PAUSED' })
      )
      .mockResolvedValueOnce(textReply('Prepared.'));

    const chatBody = await (
      await chatPost(chatRequest({ message: 'Pause it' }))
    ).json();

    const approveResponse = await approvePost(
      jsonRequest('http://localhost/api/ai/chat/approve', {
        proposal_id: chatBody.actionProposal.proposalId,
        revision: 99,
        payload_hash: chatBody.actionProposal.payloadHash,
      })
    );

    expect(approveResponse.status).toBe(409);
  });

  it('refuses to execute a proposal bound to another account', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(
        toolCallReply('update_campaign_status', { campaignId: '111', status: 'PAUSED' })
      )
      .mockResolvedValueOnce(textReply('Prepared.'));

    const chatBody = await (
      await chatPost(chatRequest({ message: 'Pause it' }))
    ).json();

    await approvePost(
      jsonRequest('http://localhost/api/ai/chat/approve', {
        proposal_id: chatBody.actionProposal.proposalId,
        revision: chatBody.actionProposal.revision,
        payload_hash: chatBody.actionProposal.payloadHash,
      })
    );

    bindingMock.account.mockResolvedValueOnce({
      userId: 'user-1',
      customerId: '9999999999',
      accountName: 'Other Account',
      currency: 'USD',
      isConnected: true,
    });

    const executeResponse = await executePost(
      jsonRequest('http://localhost/api/ai/chat/execute', {
        proposal_id: chatBody.actionProposal.proposalId,
        revision: chatBody.actionProposal.revision,
        payload_hash: chatBody.actionProposal.payloadHash,
      })
    );

    expect(executeResponse.status).toBe(403);
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });
});

describe('end-to-end: conversation continuity', () => {
  it('sends the full stored history on the next turn', async () => {
    openRouterMock.send
      .mockResolvedValueOnce(textReply('Your CPA is 20.'))
      .mockResolvedValueOnce(textReply('It is 20 because spend is 100 over 5 conversions.'));

    const first = await (
      await chatPost(chatRequest({ message: 'What is my CPA?' }))
    ).json();

    await chatPost(
      chatRequest({ message: 'Why?', conversationId: first.conversationId })
    );

    const secondRequest = openRouterMock.send.mock.calls[1][0];
    const contents = secondRequest.messages.map((message: { content?: string }) => message.content);
    expect(contents).toContain('What is my CPA?');
    expect(contents).toContain('Your CPA is 20.');
    expect(contents).toContain('Why?');
  });

  it('lists conversations for the authenticated user', async () => {
    openRouterMock.send.mockResolvedValueOnce(textReply('Hello.'));
    await chatPost(chatRequest({ message: 'Hi there' }));

    const response = await conversationsGet(
      new Request('http://localhost/api/ai/conversations', {
        headers: { Authorization: 'Bearer test-token' },
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conversations).toHaveLength(1);
    expect(body.conversations[0].title).toContain('Hi there');
  });
});
