import type { ChatMessage } from '@/types/adoptimize';

/**
 * Server IDs differ from optimistic browser IDs. Match in chronological order
 * so a partial server transcript cannot erase newer locally saved turns.
 */
export function mergeChatHistory(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  const merged: ChatMessage[] = [];
  let cursor = 0;
  let pending: ChatMessage[] = [];

  for (const message of remote) {
    const index = local.findIndex((candidate, position) =>
      position >= cursor &&
      (candidate.id === message.id ||
        (candidate.role === message.role && candidate.content === message.content))
    );
    if (index === -1) {
      pending.push(message);
      continue;
    }

    merged.push(...local.slice(cursor, index), ...pending, { ...local[index], ...message });
    pending = [];
    cursor = index + 1;
  }

  return [...merged, ...local.slice(cursor), ...pending];
}
