import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequest, jsonRequest, ScriptedModel, textResponse, toolResponse } from './helpers/model';
import { FakeGoogleAds } from './helpers/fake-google-ads';

const mocks = vi.hoisted(() => ({
  model: undefined as any,
  binding: { customerId: '1234567890', currency: 'USD' },
}));

vi.mock('@/lib/openrouter-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openrouter-service')>('@/lib/openrouter-service');
  return {
    ...actual,
    sendOpenRouterChat: (options: any) => mocks.model.handler(options),
    getModelLimits: async () => ({ contextLength: 128000, source: 'fallback' }),
  };
});

vi.mock('@/lib/ai/identity', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/identity')>('@/lib/ai/identity');
  return { ...actual, requireIdentity: async () => ({ uid: 'user-1', emailVerified: true, expiresAt: 0 }) };
});

vi.mock('@/lib/ai/account-binding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/account-binding')>('@/lib/ai/account-binding');
  return {
    ...actual,
    resolveAccountBinding: async () => ({
      userId: 'user-1',
      customerId: mocks.binding.customerId,
      accountName: 'Acme Outdoors',
      currency: mocks.binding.currency,
      isConnected: true,
    }),
    resolveFreshAccessToken: async () => ({ accessToken: 'token' }),
  };
});

import { POST as chatPost } from '@/app/api/ai/chat/route';
import { POST as approvePost } from '@/app/api/ai/chat/approve/route';
import { POST as executePost } from '@/app/api/ai/chat/execute/route';
import { GET as conversationsGet } from '@/app/api/ai/conversations/route';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import { loadAgentState } from '@/lib/ai/conversations';
import { invalidateGaqlCache } from '@/lib/google-ads/gaql';

let scripted: ScriptedModel;
let fake: FakeGoogleAds;

async function chat(message: string, conversationId?: string) {
  const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message, model: 'chatgpt', conversationId }));
  return { status: response.status, body: await response.json() };
}

async function approveAndExecute(proposal: any, acknowledge = false) {
  const identity = { proposal_id: proposal.proposalId, revision: proposal.revision, payload_hash: proposal.payloadHash };
  const approval = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', { ...identity, acknowledge_risk: acknowledge }));
  if (approval.status !== 200) return { approval: { status: approval.status, body: await approval.json() } };
  const execution = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity));
  return { approval: { status: 200 }, execution: { status: execution.status, body: await execution.json() } };
}

beforeEach(() => {
  process.env.AI_STORE = 'memory';
  resetMemoryStore();
  scripted = new ScriptedModel();
  mocks.model = scripted;
  mocks.binding = { customerId: '1234567890', currency: 'USD' };
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  scripted.verify();
});

describe('multi-turn campaign creation', () => {
  it('collects parameters across turns, handles a currency correction, revises the proposal and executes it', async () => {
    // Turn 1: objective and budget, no Google Ads data needed.
    scripted.script(
      toolResponse(
        [
          {
            name: 'update_task',
            args: {
              newTask: true,
              title: 'Winter boots search campaign',
              objective: 'Launch a Search campaign for winter boots',
              parameters: { campaignType: 'SEARCH', dailyBudget: 30 },
              openQuestions: ['campaign name'],
            },
          },
        ],
        'Happy to set that up. What should the campaign be called?'
      )
    );
    const turn1 = await chat('I want to launch a search campaign for our winter boots, around 30 a day');
    expect(turn1.status).toBe(200);
    expect(turn1.body.openRouterRequestCount).toBe(1);
    expect(fake.requests).toHaveLength(0);
    const conversationId = turn1.body.conversationId;

    // Turn 2: the name plus a currency that does not match the account.
    scripted.script(
      (request) => {
        const system = String(request.messages[0].content);
        expect(system).toMatch(/"dailyBudget": 30/);
        expect(system).toMatch(/campaign name/);
        expect(request.messages.some((message) => message.content === 'I want to launch a search campaign for our winter boots, around 30 a day')).toBe(true);
        return toolResponse([{ name: 'create_campaign', args: { name: 'Winter Boots 2026', campaignType: 'SEARCH', dailyBudget: 30, currency: 'GBP' } }]);
      },
      (request) => {
        const result = JSON.parse(String(request.messages[request.messages.length - 1].content));
        expect(result.error).toMatchObject({ code: 'invalid_argument', message: expect.stringMatching(/billed in USD/) });
        return toolResponse(
          [{ name: 'update_task', args: { parameters: { name: 'Winter Boots 2026' }, constraints: ['Account is billed in USD'], openQuestions: ['USD daily budget'] } }],
          'Your account is billed in USD, so the budget has to be set in USD. What daily amount in USD would you like?'
        );
      }
    );
    const turn2 = await chat('Call it Winter Boots 2026, and the budget is in GBP', conversationId);
    expect(turn2.body.reply).toMatch(/billed in USD/);
    expect(turn2.body.actionProposal).toBeUndefined();
    expect(fake.mutates(true)).toHaveLength(0);

    // Turn 3: the user resolves the currency; everything else is kept.
    scripted.script(
      (request) => {
        expect(String(request.messages[0].content)).toMatch(/"name": "Winter Boots 2026"/);
        return toolResponse([{ name: 'create_campaign', args: { name: 'Winter Boots 2026', campaignType: 'SEARCH', dailyBudget: 40, status: 'PAUSED' } }]);
      },
      textResponse('I prepared the paused campaign at $40/day. Approve it on the card when ready.')
    );
    const turn3 = await chat('ok make it $40 and keep it paused', conversationId);
    const first = turn3.body.actionProposal;
    expect(first).toMatchObject({ status: 'PENDING_APPROVAL', actionType: 'CREATE_CAMPAIGN', revision: 1 });
    expect(first.proposedChanges).toMatch(/Daily budget: \$40\.00/);
    expect(first.proposedChanges).toMatch(/Status after creation: paused/);

    // Turn 4: a correction to one parameter revises the same proposal.
    scripted.script(
      toolResponse([
        {
          name: 'create_campaign',
          args: { name: 'Winter Boots 2026', campaignType: 'SEARCH', dailyBudget: 40, status: 'PAUSED', biddingStrategy: 'MAXIMIZE_CLICKS', maxCpcLimit: 1.2 },
        },
      ]),
      textResponse('Updated: Maximize clicks with a $1.20 max CPC. The earlier version is replaced.')
    );
    const turn4 = await chat('Actually use maximize clicks with a max CPC of 1.20', conversationId);
    const second = turn4.body.actionProposal;
    expect(second).toMatchObject({ revision: 2, status: 'PENDING_APPROVAL' });
    expect(second.proposedChanges).toMatch(/max CPC \$1\.20/);
    expect(turn4.body.supersededProposalIds).toEqual([first.proposalId]);

    // The superseded revision can no longer be approved.
    const stale = await approveAndExecute(first);
    expect(stale.approval.status).toBe(409);

    const done = await approveAndExecute(second);
    expect(done.execution!.status).toBe(200);
    expect(done.execution!.body).toMatchObject({ success: true, status: 'succeeded' });
    const created = fake.account.campaigns.find((campaign) => campaign.name === 'Winter Boots 2026')!;
    expect(created).toMatchObject({ status: 'PAUSED', bidding: 'TARGET_SPEND', cpcCeilingMicros: 1_200_000, budgetMicros: 40_000_000 });

    // Turn 5: the agent knows the real outcome and the new campaign ID.
    scripted.script((request) => {
      const system = String(request.messages[0].content);
      expect(system).toMatch(/"status": "succeeded"/);
      expect(system).toContain(`"campaign:${created.id}"`);
      return textResponse(`Yes — Winter Boots 2026 was created (ID ${created.id}) and is paused.`);
    });
    const turn5 = await chat('did it work?', conversationId);
    expect(turn5.body.reply).toContain(created.id);
    expect(turn5.body.openRouterRequestCount).toBe(1);

    const state = await loadAgentState('user-1', conversationId);
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0]).toMatchObject({ status: 'completed', parameters: { name: 'Winter Boots 2026', campaignType: 'SEARCH', dailyBudget: 40 } });
  });
});

describe('task switching and independent proposals', () => {
  it('keeps unrelated pending proposals approvable and remembers both tasks', async () => {
    scripted.script(
      toolResponse([{ name: 'update_campaign_budget', args: { campaignId: '111', dailyBudget: 65 } }]),
      textResponse('Prepared a budget increase for Brand.')
    );
    const first = await chat('Raise the brand budget to 65');
    const conversationId = first.body.conversationId;

    scripted.script(
      toolResponse([
        { name: 'update_task', args: { newTask: true, title: 'Pause generic boots', objective: 'Pause the generic boots campaign' } },
        { name: 'update_campaign_status', args: { campaignId: '222', status: 'PAUSED' } },
      ]),
      textResponse('Prepared the pause as well.')
    );
    const second = await chat('Separately, pause Generic - Hiking Boots', conversationId);
    expect(second.body.supersededProposalIds).toBeUndefined();

    const proposals = await memoryStore.proposals.listByConversation(conversationId, 'user-1');
    expect(proposals.map((proposal) => proposal.status)).toEqual(['pending_approval', 'pending_approval']);

    const state = await loadAgentState('user-1', conversationId);
    expect(state.tasks.map((task) => task.status)).toEqual(['awaiting_approval', 'awaiting_approval']);
    expect(state.activeTaskId).toBe('t2');

    // Switching back to the first task by reference.
    scripted.script((request) => {
      expect(String(request.messages[0].content)).toMatch(/"otherOpenTasks"/);
      return toolResponse([{ name: 'update_task', args: { taskId: 't1', parameters: { note: 'user prefers gradual increases' } } }], 'Noted for the brand budget change.');
    });
    await chat('For the brand budget one, I prefer gradual increases', conversationId);
    expect((await loadAgentState('user-1', conversationId)).activeTaskId).toBe('t1');
  });
});

describe('resource resolution', () => {
  it('returns candidates for an ambiguous campaign name instead of guessing', async () => {
    scripted.script(toolResponse([{ name: 'get_campaign_details', args: { campaignName: 'hiking boots' } }]), (request) => {
      const result = JSON.parse(String(request.messages[request.messages.length - 1].content));
      expect(result.error.code).toBe('ambiguous');
      expect(result.error.candidates.map((candidate: any) => candidate.id).sort()).toEqual(['222', '333']);
      return textResponse('Do you mean "Generic - Hiking Boots" (active) or "Generic - Hiking Boots (Old)" (paused)?');
    });
    const result = await chat('What bidding does the hiking boots campaign use?');
    expect(result.body.reply).toMatch(/Do you mean/);
  });

  it('remembers campaigns from get_campaign_details and resolves follow-up "it" references without re-asking', async () => {
    // Turn 1: user asks about a campaign by name
    scripted.script(
      toolResponse([{ name: 'get_campaign_details', args: { campaignName: 'Generic - Hiking Boots' } }]),
      textResponse('Generic - Hiking Boots (ID 222) is active with Maximize conversions.')
    );
    const first = await chat('How is Generic - Hiking Boots performing?');
    expect(first.status).toBe(200);
    const conversationId = first.body.conversationId;

    // Verify state has recorded the resource
    const state = await loadAgentState('user-1', conversationId);
    expect(state.resources.some((r) => r.id === '222' && r.name === 'Generic - Hiking Boots')).toBe(true);

    // Turn 2: user says "Pause it"
    scripted.script(
      (request) => {
        // Verify system prompt received knownResources containing campaign:222
        const system = String(request.messages[0].content);
        expect(system).toMatch(/"ref": "campaign:222"/);
        expect(system).toMatch(/Generic - Hiking Boots/);
        return toolResponse([
          { name: 'update_campaign_status', args: { campaignId: '222', status: 'PAUSED' } },
        ]);
      },
      textResponse('I prepared the pause for Generic - Hiking Boots (ID 222). Please approve on the card.')
    );
    const second = await chat('Pause it', conversationId);
    expect(second.status).toBe(200);
    const proposal = second.body.actionProposal;
    expect(proposal).toBeDefined();
    expect(proposal.campaignId).toBe('222');
    expect(proposal.proposedChanges).toMatch(/paused/i);
  });
});

describe('conversion goals', () => {
  it('investigates and makes an App campaign optimise for downloads only', async () => {
    scripted.script(
      toolResponse([{ name: 'get_conversion_setup', args: { campaignId: '444' } }]),
      (request) => {
        const setup = JSON.parse(String(request.messages[request.messages.length - 1].content));
        const download = setup.conversionActions.find((action: any) => action.category === 'DOWNLOAD');
        expect(download.id).toBe('63');
        return toolResponse([{ name: 'set_campaign_conversion_actions', args: { campaignId: '444', conversionActionIds: [download.id] } }]);
      },
      textResponse('Prepared: Trail App Installs will optimise only for Android installs.')
    );
    const result = await chat('Make the app campaign count only downloads');
    const proposal = result.body.actionProposal;
    expect(proposal.proposedChanges).toMatch(/Android installs/);
    const executed = await approveAndExecute(proposal);
    expect(executed.execution!.body.status).toBe('succeeded');
    expect(fake.account.campaigns.find((campaign) => campaign.id === '444')!.selective).toEqual(['customers/1234567890/conversionActions/63']);
  });

  it('applies a campaign-specific custom goal for a Search campaign and verifies it', async () => {
    scripted.script(
      toolResponse([{ name: 'set_campaign_conversion_actions', args: { campaignId: '222', conversionActionIds: ['61'] } }]),
      textResponse('Prepared.')
    );
    const result = await chat('Only count website purchases for Generic - Hiking Boots');
    const executed = await approveAndExecute(result.body.actionProposal);
    expect(executed.execution!.body).toMatchObject({ status: 'succeeded', result: { realIds: { customConversionGoalId: expect.any(String) } } });
    expect(fake.account.goalConfigs['222'].level).toBe('CAMPAIGN');
  });
});

describe('error recovery', () => {
  it('lets the model correct a request Google Ads rejected during validation', async () => {
    fake.failNext(
      (request) => request.kind === 'mutate' && Boolean(request.validateOnly),
      'BIDDING_STRATEGY_TYPE_INCOMPATIBLE_WITH_SHARED_BUDGET',
      'campaignError',
      'This bidding strategy cannot be used with a shared budget.',
      'operations.update.target_spend'
    );
    scripted.script(
      toolResponse([{ name: 'update_campaign_bidding', args: { campaignId: '111', strategy: 'MAXIMIZE_CLICKS' } }]),
      (request) => {
        const result = JSON.parse(String(request.messages[request.messages.length - 1].content));
        expect(result.error).toMatchObject({
          code: 'api_restriction',
          google_ads_code: 'BIDDING_STRATEGY_TYPE_INCOMPATIBLE_WITH_SHARED_BUDGET',
          field_path: expect.stringContaining('target_spend'),
        });
        expect(result.error.message).toMatch(/nothing was proposed or changed/);
        return toolResponse([{ name: 'update_campaign_bidding', args: { campaignId: '111', strategy: 'MAXIMIZE_CONVERSIONS' } }]);
      },
      textResponse('Maximize clicks is not allowed with this shared budget, so I prepared Maximize conversions instead.')
    );
    const result = await chat('Switch brand to maximize clicks');
    expect(result.body.actionProposal.proposedChanges).toMatch(/maximize conversions/);
    expect(fake.mutates()).toHaveLength(0);
  });

  it('reports rate limiting as retryable and does not loop', async () => {
    fake.failures.push({
      match: (request) => request.kind === 'query',
      status: 429,
      body: { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Too many requests' } },
      times: 10,
    });
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), (request) => {
      const result = JSON.parse(String(request.messages[request.messages.length - 1].content));
      expect(result.error).toMatchObject({ code: 'quota', retryable: true });
      return textResponse('Google Ads is rate limiting requests right now; please try again in a minute.');
    });
    const result = await chat('List my campaigns');
    expect(result.body.reply).toMatch(/rate limiting/);
    expect(result.body.openRouterRequestCount).toBe(2);
  });
});

describe('efficiency', () => {
  it('reuses reads within a turn and across turns through the short cache', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), textResponse('Here is the overview.'));
    const first = await chat('Give me an overview');
    const afterFirst = fake.requests.length;
    expect(first.body.usage).toMatchObject({ modelCalls: 2, toolCalls: 1 });
    expect(afterFirst).toBe(3);

    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), textResponse('Same as before.'));
    const second = await chat('And again?', first.body.conversationId);
    expect(fake.requests.length).toBe(afterFirst);
    expect(second.body.usage.googleAdsCacheHits).toBeGreaterThan(0);
  });
});

describe('persistence', () => {
  it('rebuilds the visible conversation and approval cards after a reload', async () => {
    scripted.script(
      toolResponse([{ name: 'update_campaign_budget', args: { campaignId: '111', dailyBudget: 70 } }], 'Let me prepare that.'),
      textResponse('The budget change is ready for approval.')
    );
    const turn = await chat('Raise brand budget to 70');
    const response = await conversationsGet(getRequest(`http://localhost/api/ai/conversations?conversationId=${turn.body.conversationId}`));
    const data = await response.json();
    expect(data.transcript.map((message: any) => [message.role, message.content])).toEqual([
      ['user', 'Raise brand budget to 70'],
      ['assistant', 'The budget change is ready for approval.'],
    ]);
    expect(data.proposals).toHaveLength(1);
    expect(data.proposals[0]).toMatchObject({ status: 'PENDING_APPROVAL', messageId: data.transcript[1].id });
    expect(data.messages.some((message: any) => message.role === 'tool')).toBe(true);
  });

  it('continues with full history and task state after a server restart', async () => {
    scripted.script(
      toolResponse([{ name: 'update_task', args: { objective: 'Audit brand campaign', parameters: { campaignId: '111' } } }], 'Noted, auditing Brand.')
    );
    const turn = await chat('Let us audit the brand campaign');

    // Simulate a restart: every module is re-created, only the durable store survives.
    const preserved = await import('@/lib/store/memory');
    vi.resetModules();
    vi.doMock('@/lib/store/memory', () => preserved);
    const { POST: freshChat } = await import('@/app/api/ai/chat/route');

    scripted.script((request) => {
      expect(String(request.messages[0].content)).toMatch(/Audit brand campaign/);
      expect(request.messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'tool', 'user']);
      return textResponse('Continuing the Brand audit.');
    });
    const response = await freshChat(jsonRequest('http://localhost/api/ai/chat', { message: 'continue', model: 'chatgpt', conversationId: turn.body.conversationId }));
    expect((await response.json()).reply).toMatch(/Continuing/);
    vi.doUnmock('@/lib/store/memory');
  });
});
