import type { ChatMessage, ProposedAccountChange } from '@/types/adoptimize';

export type ActiveAiModel = 'claude' | 'chatgpt' | 'gemini';

export function normalizeModel(model: string | undefined): ActiveAiModel {
  if (model === 'fast') return 'gemini';
  if (model === 'balanced') return 'chatgpt';
  if (model === 'advanced' || model === 'analysis' || model === 'deepseek') return 'claude';
  if (model === 'claude' || model === 'chatgpt' || model === 'gemini') return model;
  return 'claude';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ActiveAiModel;
  messages: ChatMessage[];
  persisted?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
}

export async function loadAccountChatSessions(
  idToken: string,
  cached: ChatSession[],
  signal?: AbortSignal
): Promise<ChatSession[]> {
  const response = await fetch('/api/ai/conversations', {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
    signal,
  });
  const data: { conversations?: ConversationSummary[]; error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || 'Account conversations could not be loaded.');
  if (!Array.isArray(data.conversations)) throw new Error('Invalid account conversation response.');

  const savedIds = new Set(data.conversations.map((conversation) => conversation.id));
  const sessions = new Map(cached
    .filter((session) => !session.persisted || savedIds.has(session.id))
    .map((session) => [session.id, session]));
  for (const conversation of data.conversations) {
    sessions.set(conversation.id, {
      id: conversation.id,
      title: conversation.title,
      createdAt: Date.parse(conversation.createdAt),
      updatedAt: Date.parse(conversation.updatedAt),
      model: normalizeModel(conversation.model),
      messages: sessions.get(conversation.id)?.messages || [],
      persisted: true,
    });
  }
  return [...sessions.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | null;
  createdAt: string;
  model?: string | null;
}

export async function loadChatMessages(
  idToken: string,
  conversationId: string,
  signal?: AbortSignal
): Promise<ChatMessage[]> {
  const response = await fetch(`/api/ai/conversations?conversationId=${encodeURIComponent(conversationId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
    signal,
  });
  if (response.status === 404) return [];
  const data: { transcript?: TranscriptMessage[]; proposals?: ProposedAccountChange[]; error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || 'Conversation messages could not be loaded.');
  if (!Array.isArray(data.transcript)) throw new Error('Invalid conversation transcript response.');

  const proposalsByMessage = new Map<string, ProposedAccountChange>();
  for (const proposal of data.proposals || []) {
    if (proposal.messageId) proposalsByMessage.set(proposal.messageId, proposal);
  }
  return data.transcript
    .filter((item) => item.role === 'user' ||
      (item.role === 'assistant' && item.content && !/stopped responding partway through this request/i.test(item.content)))
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content || '',
      timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...(item.role === 'assistant' && item.model ? { modelUsed: item.model } : {}),
      ...(proposalsByMessage.has(item.id) ? { actionProposal: proposalsByMessage.get(item.id) } : {}),
    }));
}

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
