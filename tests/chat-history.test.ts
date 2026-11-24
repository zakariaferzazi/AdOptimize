import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAccountChatSessions, loadChatMessages, mergeChatHistory } from '@/lib/ai/chat-history';
import type { ChatMessage } from '@/types/adoptimize';

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, timestamp: '12:00' };
}

afterEach(() => vi.unstubAllGlobals());

describe('account history requests', () => {
  it('merges account conversation metadata without discarding unsynced cached messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ conversations: [{
      id: 'existing', title: 'Renamed on another device', model: 'gemini',
      createdAt: '2026-11-24T10:00:00Z', updatedAt: '2026-11-24T12:00:00Z',
    }] })));
    const messages = [message('local', 'user', 'Cached question')];
    const sessions = await loadAccountChatSessions('token', [{
      id: 'existing', title: 'Old name', createdAt: 0, updatedAt: 0, model: 'claude', messages,
    }]);
    expect(sessions[0]).toMatchObject({ title: 'Renamed on another device', model: 'gemini', messages });
    expect(fetch).toHaveBeenCalledWith('/api/ai/conversations', expect.objectContaining({
      headers: { Authorization: 'Bearer token' }, cache: 'no-store',
    }));
  });

  it('surfaces server failures rather than pretending the account has no chats', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () =>
      Response.json({ error: 'Storage unavailable' }, { status: 503 })));
    await expect(loadAccountChatSessions('token', [])).rejects.toThrow('Storage unavailable');
    await expect(loadChatMessages('token', 'saved')).rejects.toThrow('Storage unavailable');
  });

  it('does not resurrect a saved conversation deleted from another device', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ conversations: [] })));
    const sessions = await loadAccountChatSessions('token', [{
      id: 'deleted', title: 'Deleted elsewhere', createdAt: 0, updatedAt: 0,
      model: 'claude', messages: [message('old', 'user', 'Old question')], persisted: true,
    }]);
    expect(sessions).toEqual([]);
  });
});

describe('chat history restoration', () => {
  const firstUser = message('local-user-1', 'user', 'Inspect my campaigns');
  const firstReply = message('local-reply-1', 'assistant', 'Here is the overview.');
  const nextUser = message('local-user-2', 'user', 'Which one wastes money?');
  const nextReply = message('local-reply-2', 'assistant', 'The generic campaign.');
  const local = [firstUser, firstReply, nextUser, nextReply];

  it('keeps later turns when the server only returns the first exchange', () => {
    const remote = [
      { ...firstUser, id: 'server-user-1' },
      { ...firstReply, id: 'server-reply-1', modelUsed: 'Claude' },
    ];
    const restored = mergeChatHistory(local, remote);
    expect(restored).toEqual([...remote, nextUser, nextReply]);
    expect(mergeChatHistory(restored, remote)).toEqual(restored);
  });

  it('restores a newer server tail without duplicating cached messages or losing UI metadata', () => {
    const cached = { ...firstReply, tableData: { headers: ['Spend'], rows: [[20]] } };
    const remote = local.map((item) => ({ ...item, id: `server-${item.id}` }));
    const restored = mergeChatHistory([firstUser, cached], remote);
    expect(restored.map((item) => item.content)).toEqual(local.map((item) => item.content));
    expect(restored[1].tableData).toEqual(cached.tableData);
  });

  it('preserves repeated identical turns in order and handles an empty server', () => {
    const repeated = [firstUser, firstReply, { ...firstUser, id: 'repeat-user' }, { ...firstReply, id: 'repeat-reply' }];
    expect(mergeChatHistory(repeated, [firstUser, firstReply])).toEqual(repeated);
    expect(mergeChatHistory(repeated, [])).toEqual(repeated);
    expect(mergeChatHistory([], local)).toEqual(local);
  });

  it('preserves a local prefix when a different server instance only has the latest exchange', () => {
    expect(mergeChatHistory(local, [
      { ...nextUser, id: 'server-user-2' },
      { ...nextReply, id: 'server-reply-2' },
    ]).map((item) => item.content)).toEqual(local.map((item) => item.content));
  });
});
