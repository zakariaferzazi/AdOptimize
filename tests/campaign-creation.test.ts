import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@/lib/openrouter-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openrouter-service')>('@/lib/openrouter-service');
  return { ...actual, sendOpenRouterChat: openRouterMock.send };
});

import { POST } from '@/app/api/ai/chat/route';
import {
  channelForObjective,
  detectObjective,
  extractCreationParams,
  isCreationRequest,
  looksLikeCreationContinuation,
  missingCreationFields,
} from '@/lib/campaign-creation';
import {
  clearPendingCampaignCreation,
  getConversationState,
  recordPendingCampaignCreation,
} from '@/lib/conversation-state';
import { executeGoogleAdsTool } from '@/lib/google-ads-tools';
import type { Campaign } from '@/types/adoptimize';

const APP_URL = 'https://play.google.com/store/apps/details?id=com.speaker.watereject';

const existingCampaign = (id: string, name: string): Campaign => ({
  id,
  accountId: '1234567890',
  name,
  type: 'SEARCH',
  status: 'PAUSED',
  budgetDaily: 10,
  spend: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  cpc: 0,
  conversions: 0,
  cpa: 0,
  conversionValue: 0,
  roas: 0,
  conversionRate: 0,
  healthStatus: 'WARNING',
  healthScore: 0,
  trendPoints: [],
  historicalPoints: [],
  keywordsCount: 0,
  activeAdsCount: 0,
});

const ACCOUNT_CAMPAIGNS = [
  existingCampaign('camp-1', 'LocalServicesCampaign'),
  existingCampaign('camp-2', 'WinningProd-Leads-Search'),
  existingCampaign('camp-3', 'TagEditor-Purchase-Performance Max'),
  existingCampaign('camp-4', 'RankMyApps-Signup-Search'),
  existingCampaign('camp-5', 'RankMyApps -Signup-Performance Max'),
];

function classification(overrides: Record<string, unknown> = {}) {
  return {
    reply: JSON.stringify({
      intent: 'propose_change',
      operation: 'create_campaign',
      target_ref: { kind: 'none', value: '' },
      params: {},
      missing_fields: [],
      confidence: 0.95,
      clarification_question: null,
      ...overrides,
    }),
    modelUsed: 'test',
  };
}

function chatRequest(message: string, conversationId: string, history: Array<{ role: string; content: string }> = []) {
  return new Request('http://localhost/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory: history,
      model: 'deepseek',
      context: {
        userId: 'user-1',
        conversationId,
        account: {
          clientCustomerId: '1234567890',
          accountName: 'Test Account',
          currency: 'USD',
          isConnected: true,
        },
        campaigns: ACCOUNT_CAMPAIGNS,
        keywords: [],
        searchTerms: [],
        auditLogs: [],
        anomalies: [],
        insights: [],
        recommendations: [],
        rules: [],
      },
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  openRouterMock.send.mockResolvedValue(classification());
});

describe('campaign creation parameter extraction', () => {
  it('extracts the app URL, objective, name, budget and currency from the reproduction turns', () => {
    const first = extractCreationParams(
      `Create me a campaign for my app ${APP_URL}, I want installs.`
    );
    expect(first.appUrl).toBe(APP_URL);
    expect(first.finalUrl).toBe(APP_URL);
    expect(first.objective).toBe('APP_INSTALLS');

    const second = extractCreationParams(
      "Great, let's say Speaker App Campaign, $4 budget, I want to get installs from this campaign so use the best channel for installs.",
      first as any
    );
    expect(second.name).toBe('Speaker App Campaign');
    expect(second.budgetDaily).toBe(4);
    expect(second.currency).toBe('USD');
    expect(second.objective).toBe('APP_INSTALLS');
    expect(second.appUrl).toBe(APP_URL);
  });

  it('maps app installs to a multi-channel app campaign and other objectives to search', () => {
    expect(channelForObjective('APP_INSTALLS')).toBe('MULTI_CHANNEL');
    expect(channelForObjective('LEADS')).toBe('SEARCH');
    expect(channelForObjective('SALES')).toBe('SEARCH');
    expect(channelForObjective(undefined)).toBe('SEARCH');
  });

  it('detects objectives from natural language', () => {
    expect(detectObjective('I want to get installs')).toBe('APP_INSTALLS');
    expect(detectObjective('I need more qualified leads')).toBe('LEADS');
    expect(detectObjective('drive online sales')).toBe('SALES');
    expect(detectObjective('increase website traffic')).toBe('TRAFFIC');
  });

  it('recognises creation requests and continuations', () => {
    expect(isCreationRequest('Create me a campaign for my app')).toBe(true);
    expect(isCreationRequest('make a new campaign')).toBe(true);
    expect(isCreationRequest('how is my spend this week?')).toBe(false);

    const draft = { name: undefined, budgetDaily: undefined, requested_at: '', updated_at: '' };
    expect(looksLikeCreationContinuation('$4 budget', draft as any)).toBe(true);
    expect(looksLikeCreationContinuation("let's say Speaker App Campaign", draft as any)).toBe(true);
    expect(looksLikeCreationContinuation('how is my spend this week?', draft as any)).toBe(false);
    expect(looksLikeCreationContinuation('$4 budget', undefined)).toBe(false);
  });

  it('reports only genuinely missing required fields', () => {
    expect(missingCreationFields(undefined)).toEqual(['name', 'budgetDaily']);
    expect(missingCreationFields({ name: 'Speaker App Campaign' })).toEqual(['budgetDaily']);
    expect(missingCreationFields({ name: 'Speaker App Campaign', budgetDaily: 4 })).toEqual([]);
  });
});

describe('campaign creation routing', () => {
  it('sends the complete chronological transcript to the response model', async () => {
    openRouterMock.send
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          intent: 'question',
          operation: null,
          target_ref: { kind: 'none', value: '' },
          params: {},
          missing_fields: [],
          confidence: 0.99,
          clarification_question: null,
        }),
        modelUsed: 'test',
      })
      .mockResolvedValueOnce({ reply: 'It depends on the campaign objective.', modelUsed: 'test' });

    await POST(chatRequest('What about yesterday?', 'history-conversation', [
      { role: 'user', content: 'How did my campaigns perform?' },
      { role: 'assistant', content: 'The account was stable.' },
      { role: 'user', content: 'Can you explain that?' },
      { role: 'assistant', content: 'The strongest campaign drove most conversions.' },
    ]) as any);

    const responseRequest = openRouterMock.send.mock.calls[1][0];
    expect(responseRequest.messages.map((item: { role: string; content: string }) => item.content)).toEqual([
      expect.stringContaining('Google Ads Optimization Specialist'),
      'How did my campaigns perform?',
      'The account was stable.',
      'Can you explain that?',
      'The strongest campaign drove most conversions.',
      expect.stringContaining('What about yesterday?'),
    ]);
  });

  it('stops before calling a model when the selected model context is full', async () => {
    const history = [{ role: 'user', content: 'x'.repeat(131072) }];
    const response = await POST(chatRequest('Continue', 'full-context-conversation', history) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contextLimitReached).toBe(true);
    expect(body.reply).toContain('start a new chat');
    expect(openRouterMock.send).not.toHaveBeenCalled();
  });

  it('continues the original creation task instead of asking to choose an existing campaign', async () => {
    const conversationId = 'repro-conversation';

    // Turn 1: objective + app URL only.
    const firstResponse = await POST(
      chatRequest(`Create me a campaign for my app ${APP_URL}, I want installs.`, conversationId) as any
    );
    const firstBody = await firstResponse.json();
    expect(firstBody.success).toBe(true);
    expect(firstBody.actionProposal).toBeUndefined();
    expect(firstBody.reply).toContain('campaign name');
    expect(firstBody.reply).toContain('daily budget');

    const stateAfterFirst = await getConversationState(conversationId, '1234567890');
    expect(stateAfterFirst.pending_campaign_creation?.appUrl).toBe(APP_URL);
    expect(stateAfterFirst.pending_campaign_creation?.objective).toBe('APP_INSTALLS');

    // Turn 2: name + budget + objective restated.
    const secondResponse = await POST(
      chatRequest(
        "Great, let's say Speaker App Campaign, $4 budget, I want to get installs from this campaign so use the best channel for installs.",
        conversationId,
        [
          { role: 'user', content: `Create me a campaign for my app ${APP_URL}, I want installs.` },
          { role: 'assistant', content: firstBody.reply },
        ]
      ) as any
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.success).toBe(true);
    expect(secondBody.error).toBeUndefined();
    expect(secondBody.candidates).toBeUndefined();
    expect(JSON.stringify(secondBody)).not.toContain('Please choose one campaign');

    expect(secondBody.actionProposal).toBeDefined();
    expect(secondBody.actionProposal.actionType).toBe('CREATE_CAMPAIGN');
    expect(secondBody.actionProposal.campaignName).toBe('Speaker App Campaign');
    expect(secondBody.actionProposal.payload.name).toBe('Speaker App Campaign');
    expect(secondBody.actionProposal.payload.budgetDaily).toBe(4);
    expect(secondBody.actionProposal.payload.channelType).toBe('MULTI_CHANNEL');
    expect(secondBody.actionProposal.payload.objective).toBe('APP_INSTALLS');
    expect(secondBody.actionProposal.payload.appUrl).toBe(APP_URL);
    expect(secondBody.actionProposal.status).toBe('PENDING_APPROVAL');
  });

  it('creates campaigns for other objectives without entering campaign selection', async () => {
    const cases = [
      {
        conversationId: 'leads-conversation',
        first: 'Create a new campaign for my B2B demo landing page, I want leads.',
        second: 'Call it Q1 Demo Leads, budget $25 per day.',
        expectedName: 'Q1 Demo Leads',
        expectedBudget: 25,
        expectedChannel: 'SEARCH',
      },
      {
        conversationId: 'sales-conversation',
        first: 'Make me a campaign for my online store, I want sales.',
        second: 'Name it Store Sales Campaign with a $50 daily budget.',
        expectedName: 'Store Sales Campaign',
        expectedBudget: 50,
        expectedChannel: 'SEARCH',
      },
      {
        conversationId: 'traffic-conversation',
        first: 'Set up a campaign to drive traffic to my blog.',
        second: 'Call it Blog Traffic, $12 budget.',
        expectedName: 'Blog Traffic',
        expectedBudget: 12,
        expectedChannel: 'SEARCH',
      },
    ];

    for (const testCase of cases) {
      const firstResponse = await POST(chatRequest(testCase.first, testCase.conversationId) as any);
      const firstBody = await firstResponse.json();
      expect(firstBody.actionProposal).toBeUndefined();

      const secondResponse = await POST(
        chatRequest(testCase.second, testCase.conversationId, [
          { role: 'user', content: testCase.first },
          { role: 'assistant', content: firstBody.reply },
        ]) as any
      );
      const secondBody = await secondResponse.json();

      expect(secondResponse.status).toBe(200);
      expect(JSON.stringify(secondBody)).not.toContain('Please choose one campaign');
      expect(secondBody.actionProposal?.actionType).toBe('CREATE_CAMPAIGN');
      expect(secondBody.actionProposal?.payload.name).toBe(testCase.expectedName);
      expect(secondBody.actionProposal?.payload.budgetDaily).toBe(testCase.expectedBudget);
      expect(secondBody.actionProposal?.payload.channelType).toBe(testCase.expectedChannel);
    }
  });

  it('revises the pending app-install proposal instead of selecting an existing campaign', async () => {
    const conversationId = 'pending-revision-conversation';
    openRouterMock.send.mockImplementation(async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
      const message = messages[messages.length - 1]?.content || '';
      if (/add 7/i.test(message)) {
        return classification({
          intent: 'modify_proposal',
          operation: 'update_campaign_budget',
          target_ref: { kind: 'current_focus', value: '' },
          params: { newDailyBudget: 7, currency: 'USD' },
        });

      }
      if (/one we are talking about/i.test(message)) {
        return classification({
          intent: 'modify_proposal',
          operation: 'update_campaign_budget',
          target_ref: { kind: 'current_focus', value: '' },
          params: {},
        });

      }
      if (/^7\$/i.test(message.trim())) {
        return classification({
          intent: 'modify_proposal',
          operation: 'update_campaign_budget',
          target_ref: { kind: 'current_focus', value: '' },
          params: { newDailyBudget: 7, currency: 'USD' },
        });
      }
      if (/speaker app campaign/i.test(message)) {
        return classification({
          params: {
            name: 'Speaker App Campaign',
            budgetDaily: 6,
            currency: 'USD',
            objective: 'APP_INSTALLS',
            appUrl: APP_URL,
          },
        });
      }
      return classification({
        params: { objective: 'APP_INSTALLS', appUrl: APP_URL },
      });
    });

    const first = await POST(
      chatRequest(`Create me a campaign for my app ${APP_URL}, I want installs.`, conversationId) as any
    );
    const firstBody = await first.json();
    const second = await POST(
      chatRequest('speaker app campaign, 6$, yes', conversationId, [
        { role: 'user', content: `Create me a campaign for my app ${APP_URL}, I want installs.` },
        { role: 'assistant', content: firstBody.reply },
      ]) as any
    );
    const secondBody = await second.json();
    expect(secondBody.actionProposal?.payload?.budgetDaily).toBe(6);
    const proposalId = secondBody.actionProposal?.proposalId;

    const revised = await POST(chatRequest('add 7$ budget', conversationId) as any);
    const revisedBody = await revised.json();
    expect(revisedBody.actionProposal?.proposalId).toBe(proposalId);
    expect(revisedBody.actionProposal?.revision).toBe(2);
    expect(revisedBody.actionProposal?.payload?.budgetDaily).toBe(7);
    expect(revisedBody.actionProposal?.payload?.objective).toBe('APP_INSTALLS');
    expect(revisedBody.actionProposal?.payload?.appUrl).toBe(APP_URL);
    expect(JSON.stringify(revisedBody)).not.toContain('Please choose one campaign');

    const clarification = await POST(chatRequest('the one we are talking about', conversationId) as any);
    const clarificationBody = await clarification.json();
    expect(clarificationBody.actionProposal?.proposalId).toBe(proposalId);
    expect(JSON.stringify(clarificationBody)).not.toContain('Please choose one campaign');
  });

  it('keeps the original app URL when the objective is revised later', async () => {
    const conversationId = 'objective-revision-context-conversation';
    const classifierSystems: string[] = [];
    openRouterMock.send.mockImplementation(async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
      classifierSystems.push(messages[0]?.content || '');
      const latest = messages[messages.length - 1]?.content || '';
      if (/make it optimized/i.test(latest)) {
        return classification({
          intent: 'modify_proposal',
          operation: 'create_campaign',
          target_ref: { kind: 'none', value: '' },
          params: { objective: 'APP_INSTALLS' },
        });

      }
      if (/test speaker app campaign/i.test(latest)) {
        return classification({
          params: { name: 'test speaker app campaign', budgetDaily: 5, currency: 'USD' },
        });
      }
      return classification({
        params: { objective: 'APP_INSTALLS', appUrl: APP_URL },
      });
    });

    const first = await POST(
      chatRequest(`Create me a campaign for my app ${APP_URL}, I want installs.`, conversationId) as any
    );
    const firstBody = await first.json();
    const second = await POST(
      chatRequest('test speaker app campaign, 5$', conversationId, [
        { role: 'user', content: `Create me a campaign for my app ${APP_URL}, I want installs.` },
        { role: 'assistant', content: firstBody.reply },
      ]) as any
    );
    const secondBody = await second.json();
    expect(secondBody.actionProposal?.payload?.appUrl).toBe(APP_URL);

    const revised = await POST(
      chatRequest('make it optimized for installs', conversationId, [
        { role: 'user', content: `Create me a campaign for my app ${APP_URL}, I want installs.` },
        { role: 'assistant', content: firstBody.reply },
        { role: 'user', content: 'test speaker app campaign, 5$' },
        { role: 'assistant', content: secondBody.reply },
      ]) as any
    );
    const revisedBody = await revised.json();
    expect(revisedBody.actionProposal?.payload?.objective).toBe('APP_INSTALLS');
    expect(revisedBody.actionProposal?.payload?.appUrl).toBe(APP_URL);
    expect(revisedBody.reply).not.toContain('What Google Play or App Store URL');
    expect(classifierSystems.at(-1)).toContain(APP_URL);
    expect(classifierSystems.at(-1)).toContain('test speaker app campaign');

    const referenced = await POST(
      chatRequest('the link I provided in first message', conversationId, [
        { role: 'user', content: `Create me a campaign for my app ${APP_URL}, I want installs.` },
        { role: 'assistant', content: firstBody.reply },
        { role: 'user', content: 'test speaker app campaign, 5$' },
        { role: 'assistant', content: secondBody.reply },
        { role: 'user', content: 'make it optimized for installs' },
        { role: 'assistant', content: revisedBody.reply },
      ]) as any
    );
    const referencedBody = await referenced.json();
    expect(referencedBody.reply).not.toContain('What Google Play or App Store URL');
    expect(referencedBody.actionProposal?.payload?.appUrl).toBe(APP_URL);
  });

  it('still routes explicit existing-campaign actions to that campaign', async () => {
    openRouterMock.send.mockResolvedValueOnce(
      classification({
        intent: 'propose_change',
        operation: 'pause_campaign',
        target_ref: { kind: 'name', value: 'WinningProd-Leads-Search' },
        params: {},
      })
    );

    const enabledCampaigns = ACCOUNT_CAMPAIGNS.map((item) =>
      item.name === 'WinningProd-Leads-Search' ? { ...item, status: 'ENABLED' as const } : item
    );

    const request = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Pause WinningProd-Leads-Search',
        conversationHistory: [],
        model: 'deepseek',
        context: {
          userId: 'user-1',
          conversationId: 'existing-campaign-conversation',
          account: {
            clientCustomerId: '1234567890',
            accountName: 'Test Account',
            currency: 'USD',
            isConnected: true,
          },
          campaigns: enabledCampaigns,
          keywords: [],
          searchTerms: [],
          auditLogs: [],
          anomalies: [],
          insights: [],
          recommendations: [],
          rules: [],
        },
      }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(body.actionProposal?.actionType).toBe('PAUSE_CAMPAIGN');
    expect(body.actionProposal?.campaignName).toBe('WinningProd-Leads-Search');
    expect(JSON.stringify(body)).not.toContain('Please choose one campaign');
  });

  it('answers a question about creating campaigns without drafting one', async () => {
    openRouterMock.send.mockResolvedValueOnce(
      classification({
        intent: 'question',
        operation: null,
        target_ref: { kind: 'none', value: '' },
        params: {},
      })
    );

    const response = await POST(
      chatRequest('How do I create a campaign in Google Ads?', 'question-conversation') as any
    );
    const body = await response.json();

    expect(body.actionProposal).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('Please choose one campaign');
  });

  it('clears the creation draft after a successful creation', async () => {
    const conversationId = 'clear-draft-conversation';
    await recordPendingCampaignCreation(conversationId, '1234567890', {
      name: 'Speaker App Campaign',
      budgetDaily: 4,
      objective: 'APP_INSTALLS',
    });
    expect((await getConversationState(conversationId, '1234567890')).pending_campaign_creation).toBeDefined();

    await clearPendingCampaignCreation(conversationId, '1234567890');
    expect((await getConversationState(conversationId, '1234567890')).pending_campaign_creation).toBeUndefined();
  });
  it('starts a new creation task instead of inheriting the previous draft', async () => {
    const conversationId = 'task-switch-context-conversation';
    openRouterMock.send.mockImplementation(async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
      const latest = messages[messages.length - 1]?.content || '';
      return classification({
        params: /First App|speaker\.watereject/i.test(latest)
          ? { name: 'First App Campaign', budgetDaily: 5, objective: 'APP_INSTALLS', appUrl: APP_URL }
          : { name: 'Second App Campaign', budgetDaily: 8, objective: 'APP_INSTALLS', appUrl: 'https://play.google.com/store/apps/details?id=com.second.app' },
      });
    });

    await POST(chatRequest(`Create me a campaign for my app ${APP_URL}, I want installs.`, conversationId) as any);
    const firstProposal = await POST(chatRequest('First App Campaign, 5$', conversationId) as any);
    expect((await firstProposal.json()).actionProposal?.payload?.name).toBe('First App Campaign');

    const second = await POST(
      chatRequest('Create a new campaign for https://play.google.com/store/apps/details?id=com.second.app, I want installs.', conversationId) as any
    );
    const secondBody = await second.json();
    expect(secondBody.actionProposal?.payload?.name).toBe('Second App Campaign');
    expect(secondBody.actionProposal?.payload?.appUrl).toContain('com.second.app');
  });
});

describe('create_campaign tool', () => {
  it('is registered, available, and prepares a proposal with the app objective', async () => {
    const result = await executeGoogleAdsTool(
      'create_campaign',
      {
        name: 'Speaker App Campaign',
        budgetDaily: 4,
        objective: 'APP_INSTALLS',
        appUrl: APP_URL,
      },
      {
        account: {
          id: 'acc-1',
          clientCustomerId: '1234567890',
          accountName: 'Test',
          currency: 'USD',
          timezone: 'UTC',
          isConnected: true,
          lastSyncAt: new Date().toISOString(),
          syncStatus: 'IDLE',
          isDemo: false,
          totalCampaignsCount: 0,
          monthlySpendCap: 1000,
        },
        campaigns: ACCOUNT_CAMPAIGNS,
        keywords: [],
        searchTerms: [],
        auditLogs: [],
        anomalies: [],
        insights: [],
        recommendations: [],
        rules: [],
      }
    );

    expect(result.success).toBe(true);
    expect(result.actionProposal?.actionType).toBe('CREATE_CAMPAIGN');
    expect(result.actionProposal?.payload?.channelType).toBe('MULTI_CHANNEL');
    expect(result.actionProposal?.payload?.appUrl).toBe(APP_URL);
    expect(result.actionProposal?.payload?.appId).toBe('com.speaker.watereject');
    expect(result.actionProposal?.evidence).toContain('APP_INSTALLS');
  });
});
