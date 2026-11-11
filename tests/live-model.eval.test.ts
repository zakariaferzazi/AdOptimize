import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds } from './helpers/fake-google-ads';

/**
 * Live-model evaluation.
 *
 * These tests run the real OpenRouter model against a deterministic fake
 * Google Ads account, so they measure the agent's actual reasoning: tool
 * selection, follow-up resolution, corrections, error recovery and honesty.
 * They are skipped unless OPENROUTER_API_KEY and the model variables are set:
 *
 *   OPENROUTER_API_KEY=... MODEL_CHATGPT=openai/gpt-4o-mini npm run test:eval
 */

const live = Boolean(process.env.OPENROUTER_API_KEY && (process.env.MODEL_CHATGPT || process.env.MODEL_DEEPSEEK));

vi.mock('@/lib/ai/identity', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/identity')>('@/lib/ai/identity');
  return { ...actual, requireIdentity: async () => ({ uid: 'eval-user', emailVerified: true, expiresAt: 0 }) };
});

vi.mock('@/lib/ai/account-binding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/account-binding')>('@/lib/ai/account-binding');
  return {
    ...actual,
    resolveAccountBinding: async () => ({ userId: 'eval-user', customerId: '1234567890', accountName: 'Acme Outdoors', currency: 'USD', isConnected: true }),
    resolveFreshAccessToken: async () => ({ accessToken: 'token' }),
  };
});

import { POST as chatPost } from '@/app/api/ai/chat/route';
import { POST as approvePost } from '@/app/api/ai/chat/approve/route';
import { POST as executePost } from '@/app/api/ai/chat/execute/route';
import { resetMemoryStore } from '@/lib/store/memory';
import { loadAgentState } from '@/lib/ai/conversations';
import { invalidateGaqlCache } from '@/lib/google-ads/gaql';

const MODEL = process.env.MODEL_CHATGPT ? 'chatgpt' : 'deepseek';
let fake: FakeGoogleAds;

async function say(message: string, conversationId?: string) {
  const response = await chatPost(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ message, model: MODEL, conversationId }),
    }) as never
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`chat failed: ${JSON.stringify(body)}`);
  return body as {
    conversationId: string;
    reply: string;
    actionProposal?: any;
    actionProposals?: any[];
    toolCalls?: Array<{ name: string; status: string; result: any }>;
    usage: { modelCalls: number; toolCalls: number; googleAdsRequests: number; promptTokens: number; completionTokens: number; costUsd?: number };
  };
}

async function approveAndExecute(proposal: any) {
  const identity = { proposal_id: proposal.proposalId, revision: proposal.revision, payload_hash: proposal.payloadHash };
  const approval = await approvePost(
    new Request('http://localhost/api/ai/chat/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ ...identity, acknowledge_risk: true }),
    }) as never
  );
  expect(approval.status).toBe(200);
  const execution = await executePost(
    new Request('http://localhost/api/ai/chat/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify(identity),
    }) as never
  );
  return (await execution.json()) as any;
}

beforeEach(() => {
  process.env.AI_STORE = 'memory';
  resetMemoryStore();
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
});

afterEach(() => vi.unstubAllGlobals());

describe.skipIf(!live)('live model evaluation', () => {
  it('answers a conceptual question without touching Google Ads', async () => {
    const turn = await say('In one sentence, what does ROAS mean?');
    expect(turn.usage.googleAdsRequests).toBe(0);
    expect(turn.usage.modelCalls).toBe(1);
    expect(turn.reply.toLowerCase()).toMatch(/conversion value|revenue/);
  }, 90_000);

  it('investigates before recommending and cites real numbers', async () => {
    const turn = await say('Where am I wasting money right now?');
    expect(turn.usage.toolCalls).toBeGreaterThan(0);
    expect(turn.reply).toMatch(/420|hiking boots repair|cheap hiking boots/i);
    expect(turn.reply).not.toMatch(/I cannot access|no data/i);
  }, 120_000);

  it('creates a campaign across turns without re-asking and executes it', async () => {
    const first = await say('I want a search campaign for winter boots, 40 a day, paused for now');
    expect(first.reply).toMatch(/\?|name/i);
    const second = await say('Call it Winter Boots 2026', first.conversationId);
    const proposal = second.actionProposal || second.actionProposals?.[0];
    expect(proposal).toBeDefined();
    expect(proposal.proposedChanges).toMatch(/40/);
    expect(proposal.proposedChanges.toLowerCase()).toMatch(/paused/);

    const outcome = await approveAndExecute(proposal);
    expect(outcome.status).toBe('succeeded');
    const created = fake.account.campaigns.find((campaign) => campaign.name === 'Winter Boots 2026');
    expect(created).toMatchObject({ status: 'PAUSED', budgetMicros: 40_000_000 });

    const state = await loadAgentState('eval-user', first.conversationId);
    expect(state.tasks[0].status).toBe('completed');
  }, 180_000);

  it('applies a one-parameter correction without losing the rest', async () => {
    const first = await say('Create a paused search campaign called Spring Sale at 25 a day');
    const proposal = first.actionProposal || first.actionProposals?.[0];
    expect(proposal).toBeDefined();
    const second = await say('Make the budget 30 instead', first.conversationId);
    const revised = second.actionProposal || second.actionProposals?.[0];
    expect(revised.proposedChanges).toMatch(/30/);
    expect(revised.proposedChanges.toLowerCase()).toMatch(/paused/);
    expect(revised.proposedChanges).toMatch(/Spring Sale/);
  }, 180_000);

  it('asks which campaign when the name is ambiguous', async () => {
    const turn = await say('Pause the hiking boots campaign');
    expect(turn.actionProposal).toBeUndefined();
    expect(turn.reply).toMatch(/Generic - Hiking Boots/);
    expect(turn.reply).toMatch(/Old/);
  }, 120_000);

  it('explains a real limitation instead of inventing a capability', async () => {
    const turn = await say('Set a max CPC of 50 cents on the Generic - Hiking Boots campaign');
    expect(turn.reply).toMatch(/ad group|keyword|maximize clicks|not possible|cannot/i);
    expect(turn.actionProposal).toBeUndefined();
  }, 120_000);

  it('recovers from a Google Ads rejection with a corrected approach', async () => {
    fake.failNext(
      (request) => request.kind === 'mutate' && Boolean(request.validateOnly),
      'BIDDING_STRATEGY_TYPE_INCOMPATIBLE_WITH_SHARED_BUDGET',
      'campaignError',
      'This bidding strategy cannot be used with a shared budget.'
    );
    const turn = await say('Switch Brand - Search to maximize clicks');
    expect(turn.reply).toMatch(/shared budget|not allowed|cannot/i);
    expect(turn.usage.modelCalls).toBeLessThanOrEqual(4);
  }, 150_000);

  it('stays within a small model-call budget for a multi-step analysis', async () => {
    const turn = await say('Compare my campaigns over the last 30 days and tell me the single most valuable change to make.');
    expect(turn.usage.modelCalls).toBeLessThanOrEqual(5);
    expect(turn.usage.toolCalls).toBeLessThanOrEqual(8);
    expect(turn.reply.length).toBeGreaterThan(80);
  }, 150_000);
});
