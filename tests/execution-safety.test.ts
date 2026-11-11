import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequest, jsonRequest, ScriptedModel, textResponse, toolResponse } from './helpers/model';
import { FakeGoogleAds } from './helpers/fake-google-ads';

const mocks = vi.hoisted(() => ({ model: undefined as any }));

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
    resolveAccountBinding: async () => ({ userId: 'user-1', customerId: '1234567890', accountName: 'Acme', currency: 'USD', isConnected: true }),
    resolveFreshAccessToken: async () => ({ accessToken: 'token' }),
  };
});

import { POST as chatPost } from '@/app/api/ai/chat/route';
import { POST as approvePost } from '@/app/api/ai/chat/approve/route';
import { POST as executePost } from '@/app/api/ai/chat/execute/route';
import { POST as cancelPost } from '@/app/api/ai/chat/cancel/route';
import { GET as conversationsGet } from '@/app/api/ai/conversations/route';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import { loadAgentState } from '@/lib/ai/conversations';
import { invalidateGaqlCache } from '@/lib/google-ads/gaql';

let scripted: ScriptedModel;
let fake: FakeGoogleAds;

async function prepareProposal(message = 'Raise brand budget to 70') {
  scripted.script(toolResponse([{ name: 'update_campaign_budget', args: { campaignId: '111', dailyBudget: 70 } }]), textResponse('Prepared.'));
  const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message, model: 'chatgpt' }));
  const body = await response.json();
  return { conversationId: body.conversationId as string, proposal: body.actionProposal };
}

const identity = (proposal: any) => ({ proposal_id: proposal.proposalId, revision: proposal.revision, payload_hash: proposal.payloadHash });

beforeEach(() => {
  process.env.AI_STORE = 'memory';
  resetMemoryStore();
  scripted = new ScriptedModel();
  mocks.model = scripted;
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  scripted.verify();
});

describe('execution safety', () => {
  it('refuses to execute a proposal that was never approved', async () => {
    const { proposal } = await prepareProposal();
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    expect(response.status).toBe(409);
    expect(fake.mutates()).toHaveLength(0);
  });

  it('refuses a stale revision or a wrong payload hash', async () => {
    const { proposal } = await prepareProposal();
    const wrongHash = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', { ...identity(proposal), payload_hash: 'deadbeef' }));
    expect(wrongHash.status).toBe(409);
    const wrongRevision = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', { ...identity(proposal), revision: 99 }));
    expect(wrongRevision.status).toBe(409);
    expect(fake.mutates()).toHaveLength(0);
  });

  it('applies exactly once even when execution is retried', async () => {
    const { proposal } = await prepareProposal();
    await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    const first = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    const second = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    expect((await first.json()).status).toBe('succeeded');
    expect((await second.json()).status).toBe('succeeded');
    expect(fake.mutates()).toHaveLength(1);
    expect(fake.account.campaigns[0].budgetMicros).toBe(70_000_000);
  });

  it('detects drift when the account changed after the proposal was made', async () => {
    const { proposal } = await prepareProposal();
    await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    fake.account.campaigns[0].budgetMicros = 55_000_000;
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.result.error.type).toBe('drift');
    expect(fake.mutates()).toHaveLength(0);
  });

  it('requires an explicit acknowledgement for a destructive change', async () => {
    scripted.script(toolResponse([{ name: 'update_campaign_status', args: { campaignId: '111', status: 'PAUSED' } }]), textResponse('Prepared the pause.'));
    const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'Pause brand', model: 'chatgpt' }));
    const proposal = (await response.json()).actionProposal;
    expect(proposal.destructive).toBe(true);

    const unacknowledged = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    expect(unacknowledged.status).toBe(428);
    expect((await unacknowledged.json()).code).toBe('acknowledgement_required');

    const acknowledged = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', { ...identity(proposal), acknowledge_risk: true }));
    expect(acknowledged.status).toBe(200);
    const executed = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    expect((await executed.json()).status).toBe('succeeded');
    expect(fake.account.campaigns[0].status).toBe('PAUSED');
  });

  it('reports executed-but-unverified when the read-back does not confirm the change', async () => {
    const { proposal } = await prepareProposal();
    await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    fake.dropWrites = true;
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: false, status: 'executed_unverified' });
    expect(body.message).toMatch(/did not confirm/);
    const state = await loadAgentState('user-1', (await memoryStore.proposals.get(proposal.proposalId, 'user-1'))!.conversation_id);
    expect(state.actions[0]).toMatchObject({ status: 'executed_unverified' });
  });

  it('records a Google Ads rejection as a failed execution with a classified reason', async () => {
    const { proposal } = await prepareProposal();
    await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    fake.failNext((request) => request.kind === 'mutate' && !request.validateOnly, 'USER_PERMISSION_DENIED', 'authorizationError', 'Denied');
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.result.error).toMatchObject({ type: 'permission', google_ads_code: 'USER_PERMISSION_DENIED' });
  });

  it('declines a proposal server-side and tells the agent', async () => {
    const { proposal, conversationId } = await prepareProposal();
    const response = await cancelPost(jsonRequest('http://localhost/api/ai/chat/cancel', { proposal_id: proposal.proposalId }));
    expect(response.status).toBe(200);
    const record = await memoryStore.proposals.get(proposal.proposalId, 'user-1');
    expect(record?.status).toBe('cancelled');
    const state = await loadAgentState('user-1', conversationId);
    expect(state.actions[0]).toMatchObject({ status: 'cancelled' });
    const approve = await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    expect(approve.status).toBe(409);
  });

  it('expires a proposal that was left unapproved and records it', async () => {
    const { proposal, conversationId } = await prepareProposal();
    const record = await memoryStore.proposals.get(proposal.proposalId, 'user-1');
    await memoryStore.proposals.update({ ...record!, expires_at: new Date(Date.now() - 1000).toISOString() });

    scripted.script((request) => {
      expect(String(request.messages[0].content)).toMatch(/"status": "expired"/);
      return textResponse('That earlier proposal expired, so I will re-check the account before preparing it again.');
    });
    const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'still want that', model: 'chatgpt', conversationId }));
    expect((await response.json()).reply).toMatch(/expired/);
    expect((await memoryStore.proposals.get(proposal.proposalId, 'user-1'))!.status).toBe('expired');
  });

  it('never exposes a proposal from another account', async () => {
    const { proposal } = await prepareProposal();
    const record = await memoryStore.proposals.get(proposal.proposalId, 'user-1');
    await memoryStore.proposals.update({ ...record!, account_id: '9999999999' });
    await approvePost(jsonRequest('http://localhost/api/ai/chat/approve', identity(proposal)));
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    expect(response.status).toBe(403);
    expect(fake.mutates()).toHaveLength(0);
  });

  it('does not leak another user’s proposal', async () => {
    const { proposal } = await prepareProposal();
    const response = await executePost(jsonRequest('http://localhost/api/ai/chat/execute', identity(proposal)));
    expect(response.status).toBe(409);
    const other = await memoryStore.proposals.get(proposal.proposalId, 'user-2');
    expect(other).toBeUndefined();
  });
});

describe('model payload', () => {
  it('sends the full chronological transcript with tool results and the persisted state', async () => {
    scripted.script(
      toolResponse(
        [
          { name: 'update_task', args: { objective: 'Investigate wasted spend', parameters: { campaignId: '222' } } },
          { name: 'get_search_terms', args: { campaignId: '222', filter: 'NON_CONVERTING' } },
        ],
        'Looking into it.'
      ),
      textResponse('Two queries wasted $420.')
    );
    const first = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'Where am I wasting money?', model: 'chatgpt' }));
    const conversationId = (await first.json()).conversationId;

    scripted.script((request) => {
      const roles = request.messages.map((message: any) => message.role);
      expect(roles).toEqual(['system', 'user', 'assistant', 'tool', 'tool', 'assistant', 'user']);
      const system = String(request.messages[0].content);
      expect(system).toContain('Investigate wasted spend');
      expect(system).toContain('"campaign:222"');
      expect(system).toContain('Acme');
      expect(system).toContain('USD');
      const toolNames = (request.tools || []).map((tool: any) => tool.function.name);
      expect(toolNames).toEqual(expect.arrayContaining(['list_campaigns', 'get_performance', 'get_search_terms', 'update_task', 'create_campaign']));
      expect(toolNames).not.toEqual(expect.arrayContaining(['mutate', 'run_gaql']));
      return textResponse('Still $420 on two queries.');
    });
    await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'and now?', model: 'chatgpt', conversationId }));
  });

  it('closes an interrupted tool call so the transcript stays valid', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), () => {
      throw new Error('OpenRouter request failed (503)');
    });
    const first = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'list campaigns', model: 'chatgpt' }));
    const conversationId = (await first.json()).conversationId;

    scripted.script((request) => {
      const toolMessages = request.messages.filter((message: any) => message.role === 'tool');
      expect(toolMessages).toHaveLength(1);
      expect(toolMessages[0].content).toMatch(/campaigns/);
      return textResponse('Here they are.');
    });
    const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'again', model: 'chatgpt', conversationId }));
    expect((await response.json()).reply).toBe('Here they are.');
  });

  it('asks the user to start a new chat when the conversation no longer fits', async () => {
    scripted.script(textResponse('ok'));
    const first = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'hello', model: 'chatgpt' }));
    const conversationId = (await first.json()).conversationId;

    const store = await import('@/lib/store');
    const conversation = await (await store.getStore()).conversations.get(conversationId, 'user-1');
    const filler = 'x'.repeat(800_000);
    await (await store.getStore()).messages.append({
      id: 'filler',
      conversation_id: conversationId,
      user_id: 'user-1',
      seq: 999,
      role: 'user',
      content: filler,
      tool_calls: null,
      tool_call_id: null,
      name: null,
      model: null,
      usage: null,
      created_at: new Date().toISOString(),
    });
    expect(conversation).toBeDefined();

    const before = scripted.requests.length;
    const response = await chatPost(jsonRequest('http://localhost/api/ai/chat', { message: 'continue', model: 'chatgpt', conversationId }));
    const body = await response.json();
    expect(body.contextLimitReached).toBe(true);
    expect(body.reply).toMatch(/start a new chat/);
    expect(scripted.requests.length).toBe(before);
  });

  it('returns the conversation transcript and cards for a reload', async () => {
    const { conversationId } = await prepareProposal();
    const response = await conversationsGet(getRequest(`http://localhost/api/ai/conversations?conversationId=${conversationId}`));
    const data = await response.json();
    expect(data.transcript).toHaveLength(2);
    expect(data.proposals[0]).toMatchObject({ status: 'PENDING_APPROVAL', campaignName: 'Brand - Search' });
    expect(data.proposals[0].currentSettings).toMatch(/Daily budget: 50/);
  });
});
