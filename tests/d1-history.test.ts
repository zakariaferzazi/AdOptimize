import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { D1Database } from '@/lib/store/d1';
import { getStore, isD1Active, resetStoreCache } from '@/lib/store';
import { appendMessages, deleteConversation, ensureConversation, listConversations, loadMessages } from '@/lib/ai/conversations';

const binding = vi.hoisted(() => ({ db: undefined as D1Database | undefined }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: async () => ({ env: { DB: binding.db } }),
}));

let dispose: (() => Promise<void>) | undefined;

beforeAll(async () => {
  vi.stubEnv('AI_STORE', '');
  const platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.jsonc',
    persist: false,
  });
  binding.db = platform.env.DB;
  dispose = platform.dispose;
  resetStoreCache();
}, 30000);

afterAll(async () => {
  resetStoreCache();
  vi.unstubAllEnvs();
  await dispose?.();
});

describe('D1 account history', () => {
  it('filters audit events by account before keyset pagination', async () => {
    const store = await getStore();
    const timestamp = '2026-10-16T12:00:00.000Z';
    for (const [id, userId, accountId] of [
      ['activity-a', 'activity-user', '1234567890'],
      ['activity-b', 'activity-user', '1234567890'],
      ['activity-z', 'activity-user', '9999999999'],
      ['activity-y', 'another-user', '1234567890'],
    ]) {
      await store.audit.append({
        id, user_id: userId, account_id: accountId, timestamp, event: 'proposal_approved',
        proposal_id: null, conversation_id: null, details: null,
      });
    }
    const first = await store.audit.list('activity-user', 1, { accountId: '1234567890' });
    expect(first.map((entry) => entry.id)).toEqual(['activity-b']);
    const next = await store.audit.list('activity-user', 1, {
      accountId: '1234567890', before: { timestamp, id: first[0].id },
    });
    expect(next.map((entry) => entry.id)).toEqual(['activity-a']);
  });

  it('survives store reinitialization without a browser cache and remains scoped to its owner', async () => {
    const conversation = await ensureConversation({
      userId: 'd1-user', accountId: 'test-account', model: 'claude', title: 'Saved campaign audit',
    });
    await appendMessages({
      userId: 'd1-user', conversationId: conversation.id, model: 'Claude',
      messages: [
        { role: 'user', content: 'Inspect my campaigns' },
        { role: 'assistant', content: 'Here is the overview.' },
        { role: 'user', content: 'What next?' },
        { role: 'assistant', content: 'Review the search terms.' },
      ],
    });
    expect(isD1Active()).toBe(true);

    resetStoreCache();
    expect((await listConversations('d1-user')).map((item) => item.id)).toEqual([conversation.id]);
    expect((await loadMessages('d1-user', conversation.id)).map((item) => item.content)).toEqual([
      'Inspect my campaigns', 'Here is the overview.', 'What next?', 'Review the search terms.',
    ]);
    expect(await listConversations('different-user')).toEqual([]);
    expect(await loadMessages('different-user', conversation.id)).toEqual([]);

    await deleteConversation('different-user', conversation.id);
    expect(await loadMessages('d1-user', conversation.id)).toHaveLength(4);
    await deleteConversation('d1-user', conversation.id);
    expect(await listConversations('d1-user')).toEqual([]);
    expect(await loadMessages('d1-user', conversation.id)).toEqual([]);
    expect(await (await getStore()).conversations.get(conversation.id, 'd1-user')).toBeUndefined();
  });
});
