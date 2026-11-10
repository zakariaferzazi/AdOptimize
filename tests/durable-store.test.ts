import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import type { ProposalRecord } from '@/lib/store/types';
import { computeBudget, estimateTokens, CONTEXT_FULL_MESSAGE } from '@/lib/ai/context-budget';

function proposal(overrides: Partial<ProposalRecord> = {}): ProposalRecord {
  const now = new Date().toISOString();
  return {
    id: 'proposal-1',
    user_id: 'user-1',
    conversation_id: 'conversation-1',
    account_id: '1234567890',
    revision: 1,
    status: 'pending_approval',
    operation: 'update_campaign_budget',
    payload: JSON.stringify({ campaignId: 'camp-1', newDailyBudget: 10 }),
    payload_hash: 'hash-1',
    before_snapshot: JSON.stringify({ id: 'camp-1', budgetDaily: 5 }),
    supersedes_id: null,
    expires_at: null,
    result: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

beforeEach(() => {
  resetMemoryStore();
});

describe('durable store: proposals', () => {
  it('approves only the exact revision and payload hash', async () => {
    await memoryStore.proposals.create(proposal());

    expect(await memoryStore.proposals.approve('proposal-1', 'user-1', 2, 'hash-1')).toBeUndefined();
    expect(await memoryStore.proposals.approve('proposal-1', 'user-1', 1, 'wrong')).toBeUndefined();
    expect(await memoryStore.proposals.approve('proposal-1', 'other-user', 1, 'hash-1')).toBeUndefined();

    const approved = await memoryStore.proposals.approve('proposal-1', 'user-1', 1, 'hash-1');
    expect(approved?.status).toBe('approved');
  });

  it('cannot approve the same revision twice', async () => {
    await memoryStore.proposals.create(proposal());
    expect(await memoryStore.proposals.approve('proposal-1', 'user-1', 1, 'hash-1')).toBeDefined();
    expect(await memoryStore.proposals.approve('proposal-1', 'user-1', 1, 'hash-1')).toBeUndefined();
  });

  it('claims an approved proposal exactly once', async () => {
    await memoryStore.proposals.create(proposal({ status: 'approved' }));

    const first = await memoryStore.proposals.claim('proposal-1', 'user-1', 1, 'hash-1');
    const second = await memoryStore.proposals.claim('proposal-1', 'user-1', 1, 'hash-1');

    expect(first?.status).toBe('executing');
    expect(second).toBeUndefined();
  });

  it('refuses to claim a proposal that was never approved', async () => {
    await memoryStore.proposals.create(proposal());
    expect(await memoryStore.proposals.claim('proposal-1', 'user-1', 1, 'hash-1')).toBeUndefined();
  });

  it('returns the latest proposal regardless of terminal status', async () => {
    await memoryStore.proposals.create(proposal({ id: 'p1', revision: 1, status: 'succeeded' }));
    await memoryStore.proposals.create(proposal({ id: 'p2', revision: 2, status: 'pending_approval' }));

    const latest = await memoryStore.proposals.getLatest('conversation-1', 'user-1');
    expect(latest?.id).toBe('p2');
  });

  it('scopes proposals to their owner', async () => {
    await memoryStore.proposals.create(proposal());
    expect(await memoryStore.proposals.get('proposal-1', 'other-user')).toBeUndefined();
    expect(await memoryStore.proposals.get('proposal-1', 'user-1')).toBeDefined();
  });
});

describe('durable store: idempotency', () => {
  it('allows only one execution per idempotency key', async () => {
    const record = {
      idempotency_key: 'key-1',
      proposal_id: 'proposal-1',
      attempt: 1,
      status: 'started' as const,
      before: null,
      after: null,
      error: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    expect(await memoryStore.executions.begin(record)).toBe(true);
    expect(await memoryStore.executions.begin(record)).toBe(false);

    await memoryStore.executions.complete('key-1', {
      status: 'succeeded',
      completed_at: new Date().toISOString(),
    });
    const stored = await memoryStore.executions.get('key-1');
    expect(stored?.status).toBe('succeeded');
  });
});

describe('durable store: messages', () => {
  it('keeps full chronological history with monotonic sequence numbers', async () => {
    const base = {
      conversation_id: 'conversation-1',
      user_id: 'user-1',
      tool_calls: null,
      tool_call_id: null,
      name: null,
      model: null,
      usage: null,
      created_at: new Date().toISOString(),
    };

    for (let index = 0; index < 5; index += 1) {
      const seq = await memoryStore.messages.nextSeq('conversation-1');
      await memoryStore.messages.append({
        ...base,
        id: `message-${index}`,
        seq,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index}`,
      });
    }

    const history = await memoryStore.messages.list('conversation-1', 'user-1');
    expect(history).toHaveLength(5);
    expect(history.map((item) => item.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(history.map((item) => item.content)).toEqual([
      'message 0',
      'message 1',
      'message 2',
      'message 3',
      'message 4',
    ]);
  });
});

describe('context budget', () => {
  it('counts system, tools, history and output reserve', () => {
    const breakdown = computeBudget({
      systemPrompt: 'x'.repeat(400),
      toolSchemas: { tools: ['a', 'b'] },
      messages: [
        { role: 'user', content: 'y'.repeat(400) },
        { role: 'assistant', content: 'z'.repeat(400) },
      ],
      reserveOutputTokens: 2048,
      contextLimit: 32768,
    });

    expect(breakdown.systemTokens).toBeGreaterThan(0);
    expect(breakdown.toolTokens).toBeGreaterThan(0);
    expect(breakdown.historyTokens).toBeGreaterThan(0);
    expect(breakdown.reserveTokens).toBe(2048);
    expect(breakdown.totalTokens).toBe(
      breakdown.systemTokens +
        breakdown.toolTokens +
        breakdown.historyTokens +
        breakdown.reserveTokens
    );
    expect(breakdown.fits).toBe(true);
  });

  it('reports a full context instead of truncating history', () => {
    const breakdown = computeBudget({
      systemPrompt: 'system',
      toolSchemas: {},
      messages: [{ role: 'user', content: 'x'.repeat(200000) }],
      reserveOutputTokens: 2048,
      contextLimit: 32768,
    });

    expect(breakdown.fits).toBe(false);
    expect(breakdown.remainingTokens).toBeLessThan(0);
    expect(CONTEXT_FULL_MESSAGE).toContain('start a new chat');
  });

  it('charges structured payloads more densely than prose', () => {
    const prose = estimateTokens('a'.repeat(400));
    const structured = estimateTokens(
      JSON.stringify(Array.from({ length: 40 }, (_, index) => ({ id: index, name: 'x' })))
    );
    const structuredLength = JSON.stringify(
      Array.from({ length: 40 }, (_, index) => ({ id: index, name: 'x' }))
    ).length;
    expect(structured).toBeGreaterThan(Math.ceil(structuredLength / 4));
    expect(prose).toBe(100);
  });
});
