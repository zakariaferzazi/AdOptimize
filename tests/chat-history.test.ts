import { describe, expect, it } from 'vitest';
import { mergeChatHistory } from '@/lib/ai/chat-history';
import type { ChatMessage } from '@/types/adoptimize';

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, timestamp: '12:00' };
}

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
