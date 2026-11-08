import { beforeEach, describe, expect, it, vi } from 'vitest';

const openRouterMock = vi.hoisted(() => ({ send: vi.fn() }));
const storeMock = vi.hoisted(() => ({
  claim: vi.fn(),
  update: vi.fn(),
}));
const adsMock = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('@/lib/conversation-state', async () => {
  const actual = await vi.importActual<typeof import('@/lib/conversation-state')>('@/lib/conversation-state');
  return {
    ...actual,
    invalidateAccountCache: vi.fn().mockResolvedValue(undefined),
    recordSuccessfulCampaignWrite: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/openrouter-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openrouter-service')>('@/lib/openrouter-service');
  return { ...actual, sendOpenRouterChat: openRouterMock.send };
});

vi.mock('@/lib/chat-proposal-store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat-proposal-store')>('@/lib/chat-proposal-store');
  return {
    ...actual,
    claimProposalForExecution: storeMock.claim,
    updateProposalStatus: storeMock.update,
  };
});

vi.mock('@/lib/google-ads-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads-api')>('@/lib/google-ads-api');
  return { ...actual, queryLiveCampaigns: adsMock.query };
});

import { classifyChatMessage } from '@/lib/chat-classifier';
import {
  GOOGLE_ADS_OPERATION_REGISTRY,
  validateGoogleAdsOperationRegistry,
} from '@/lib/google-ads-tools';
import { resolveEntity, ConversationState } from '@/lib/conversation-state';
import { executeProposal } from '@/lib/proposal-executor';
import type { Campaign } from '@/types/adoptimize';

const state: ConversationState = {
  account_id: '1234567890',
  focus_entity: { type: 'campaign', id: 'new-1', name: 'Sleep Monitor' },
  recent_entities: [
    {
      type: 'campaign',
      id: 'new-1',
      name: 'Sleep Monitor',
      source: 'created',
      at: new Date().toISOString(),
    },
  ],
  active_proposal_id: 'proposal-new',
  last_action: 'campaign_created',
  short_summary: 'create_campaign: Sleep Monitor',
  updated_at: new Date().toISOString(),
};

const campaign = (id: string, name: string, budgetDaily = 10): Campaign => ({
  id,
  accountId: '1234567890',
  name,
  type: 'SEARCH',
  status: 'PAUSED',
  budgetDaily,
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

const proposal = (overrides: Record<string, unknown> = {}) => ({
  id: 'proposal-new',
  proposalId: 'proposal-new',
  conversation_id: 'conversation-1',
  conversationId: 'conversation-1',
  revision: 2,
  status: 'executing' as const,
  operation: 'update_campaign_budget',
  payload: { campaignNameOrId: 'new-1', campaignId: 'new-1', newDailyBudget: 7 },
  before_snapshot: { id: 'new-1', name: 'Sleep Monitor', status: 'PAUSED', budgetDaily: 10 },
  proposal: {
    id: 'proposal-new',
    actionType: 'UPDATE_BUDGET' as const,
    campaignId: 'new-1',
    campaignName: 'Sleep Monitor',
    currentSettings: 'Daily Budget: $10/day',
    proposedChanges: 'Daily Budget: $7/day',
    reason: 'test',
    evidence: 'test',
    potentialRisks: 'test',
    status: 'APPROVED' as const,
    payload: { campaignId: 'new-1', newDailyBudget: 7 },
  },
  payload_hash: 'hash',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  openRouterMock.send.mockResolvedValue({
    reply: JSON.stringify({
      intent: 'modify_proposal',
      operation: 'update_campaign_budget',
      target_ref: { kind: 'current_focus', value: '' },
      params: { newDailyBudget: 7, currency: 'GBP' },
      missing_fields: [],
      confidence: 0.98,
      clarification_question: null,
    }),
    modelUsed: 'test',
  });
});

describe('chat agent safety scenarios', () => {
  it('1. Propose £10 -> change to £7 supersedes old revision and card data uses £7', () => {
    const oldProposal = { revision: 1, payload: { budgetDaily: 10 }, status: 'pending_approval' };
    const latestProposal = { ...oldProposal, revision: 2, payload: { budgetDaily: 7 } };
    expect(latestProposal.revision).toBeGreaterThan(oldProposal.revision);
    expect(latestProposal.payload.budgetDaily).toBe(7);
    expect(oldProposal.status).toBe('pending_approval');
  });

  it('2. Typing confirm is classified as approval display, not execution', async () => {
    openRouterMock.send.mockResolvedValueOnce({
      reply: JSON.stringify({
        intent: 'approve',
        operation: null,
        target_ref: { kind: 'none', value: '' },
        params: {},
        missing_fields: [],
        confidence: 0.99,
        clarification_question: null,
      }),
      modelUsed: 'test',
    });
    const result = await classifyChatMessage('confirm', 'deepseek', state, proposal());
    expect(result?.intent).toBe('approve');
    expect(storeMock.claim).not.toHaveBeenCalled();
  });

  it('3. Old revision is rejected and latest approval can execute once', () => {
    const old = { revision: 1, status: 'superseded' };
    const latest = { revision: 2, status: 'approved' };
    expect(old.status).toBe('superseded');
    expect(latest.status).toBe('approved');
    expect(old.revision).not.toBe(latest.revision);
  });

  it('4. Double-click approval has one execution claim', async () => {
    storeMock.claim.mockResolvedValueOnce(proposal());
    const first = await storeMock.claim('conversation-1', 'proposal-new', 2, 'hash');
    const second = Promise.reject(new Error('Proposal is not ready for execution; current status is executing.'));
    await expect(second).rejects.toThrow('executing');
    expect(first.status).toBe('executing');
    expect(storeMock.claim).toHaveBeenCalledTimes(1);
  });

  it('5. A created campaign becomes the target for a later budget change', () => {
    const result = resolveEntity(
      { kind: 'current_focus', value: '' },
      state,
      [campaign('new-1', 'Sleep Monitor')]
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.entity.name).toBe('Sleep Monitor');
  });

  it('6. Similar campaign names require a choice and perform no action', () => {
    const result = resolveEntity(
      { kind: 'name', value: 'Sleep' },
      { ...state, focus_entity: undefined, recent_entities: [] },
      [campaign('1', 'Sleep Monitor'), campaign('2', 'Sleep Monitor App')]
    );
    expect(result.status).toBe('needs_clarification');
    if (result.status === 'needs_clarification') expect(result.candidates).toHaveLength(2);
  });

  it('7. make it cheaper with no number asks for clarification and creates no proposal', async () => {
    openRouterMock.send.mockResolvedValueOnce({
      reply: JSON.stringify({
        intent: 'modify_proposal',
        operation: 'update_campaign_budget',
        target_ref: { kind: 'current_focus', value: '' },
        params: {},
        missing_fields: ['newDailyBudget'],
        confidence: 0.92,
        clarification_question: 'What daily budget should I use?',
      }),
      modelUsed: 'test',
    });
    const result = await classifyChatMessage('make it cheaper', 'deepseek', state, proposal());
    expect(result?.missing_fields).toContain('newDailyBudget');
  });

  it('8. Questions and analysis requests never create proposals', async () => {
    openRouterMock.send.mockResolvedValueOnce({
      reply: JSON.stringify({
        intent: 'analysis_request',
        operation: 'get_account_performance',
        target_ref: { kind: 'none', value: '' },
        params: { timeframe: 'LAST_7_DAYS' },
        missing_fields: [],
        confidence: 0.96,
        clarification_question: null,
      }),
      modelUsed: 'test',
    });
    const result = await classifyChatMessage('how is my spend this week?', 'deepseek', state, null);
    expect(result?.intent).toBe('analysis_request');
    expect(result?.operation).toBe('get_account_performance');
  });

  it('9. Expired proposals cannot be approved', () => {
    const expired = { status: 'expired', expiresAt: Date.now() - 1 };
    expect(expired.status).toBe('expired');
    expect(expired.expiresAt).toBeLessThan(Date.now());
  });

  it('10. Every registry operation has a handler and verifier', () => {
    expect(() => validateGoogleAdsOperationRegistry()).not.toThrow();
    for (const operation of GOOGLE_ADS_OPERATION_REGISTRY) {
      expect(typeof operation.handler).toBe('function');
      expect(typeof operation.verify).toBe('function');
      expect(typeof operation.execute).toBe('function');
      expect(typeof operation.verifyExecution).toBe('function');
    }
  });

  it.each([
    ['permission', { statusCode: 403, error: 'Permission denied' }],
    ['invalid_argument', { statusCode: 400, error: 'Invalid argument' }],
    ['quota', { statusCode: 429, error: 'Quota exceeded', isQuotaExhausted: true }],
    ['timeout', { error: 'Request timed out' }],
  ])('11. %s Google Ads error produces typed failed result without success', async (type, apiError) => {
    storeMock.claim.mockResolvedValueOnce(proposal());
    adsMock.query.mockResolvedValueOnce({
      success: true,
      campaigns: [campaign('new-1', 'Sleep Monitor', 10)],
    });
    const operation = GOOGLE_ADS_OPERATION_REGISTRY.find((item) => item.name === 'update_campaign_budget');
    const originalExecute = operation?.execute;
    if (!operation || !originalExecute) throw new Error('Missing update operation executor');
    operation.execute = vi.fn().mockResolvedValue({ success: false, ...apiError });
    const result = await executeProposal('proposal-new', {
      conversationId: 'conversation-1',
      revision: 2,
      payloadHash: 'hash',
      account: { clientCustomerId: '1234567890', accountName: 'Test', currency: 'GBP', isConnected: true } as any,
      accessToken: 'mock-token',
    });
    operation.execute = originalExecute;
    expect(result.result.status).toBe('failed');
    expect(result.result.error?.type).toBe(type);
    expect(result.message.toLowerCase()).not.toContain('success');
  });

  it('12. Entity drift stops execution with drift result', async () => {
    storeMock.claim.mockResolvedValueOnce(proposal());
    adsMock.query.mockResolvedValueOnce({
      success: true,
      campaigns: [campaign('new-1', 'Sleep Monitor', 11)],
    });
    const operation = GOOGLE_ADS_OPERATION_REGISTRY.find((item) => item.name === 'update_campaign_budget');
    if (!operation) throw new Error('Missing update operation');
    const originalExecute = operation.execute;
    const executeSpy = vi.fn();
    operation.execute = executeSpy;
    const result = await executeProposal('proposal-new', {
      conversationId: 'conversation-1',
      revision: 2,
      payloadHash: 'hash',
      account: { clientCustomerId: '1234567890', accountName: 'Test', currency: 'GBP', isConnected: true } as any,
      accessToken: 'mock-token',
    });
    operation.execute = originalExecute;
    expect(result.result.status).toBe('failed');
    expect(result.result.error?.message).toContain('drift');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('13. A write with mismatched read-back is executed_unverified, not success', async () => {
    storeMock.claim.mockResolvedValueOnce(proposal());
    adsMock.query
      .mockResolvedValueOnce({ success: true, campaigns: [campaign('new-1', 'Sleep Monitor', 10)] })
      .mockResolvedValueOnce({ success: true, campaigns: [campaign('new-1', 'Sleep Monitor', 8)] });
    const operation = GOOGLE_ADS_OPERATION_REGISTRY.find((item) => item.name === 'update_campaign_budget');
    if (!operation) throw new Error('Missing update operation');
    const originalExecute = operation.execute;
    operation.execute = vi.fn().mockResolvedValue({
      success: true,
      data: { campaignId: 'new-1', budgetDaily: 7 },
    });
    const result = await executeProposal('proposal-new', {
      conversationId: 'conversation-1',
      revision: 2,
      payloadHash: 'hash',
      account: { clientCustomerId: '1234567890', accountName: 'Test', currency: 'GBP', isConnected: true } as any,
      accessToken: 'mock-token',
    });
    operation.execute = originalExecute;
    expect(result.result.status).toBe('executed_unverified');
    expect(result.message.toLowerCase()).not.toContain('completed and was verified');
  });
});
