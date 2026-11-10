import { randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ConversationRecord, MessageRecord } from '@/lib/store/types';
import type { AgentMessage } from './agent';
import {
  mergeTaskState,
  parseTaskState,
  serializeTaskState,
  type TaskPatch,
  type TaskState,
} from './task-state';

/**
 * Server-authoritative conversation storage.
 *
 * The browser renders what the server returns. History, tool calls and tool
 * results live here so a refresh, a second tab, or a different worker instance
 * all see the same conversation.
 */

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export async function ensureConversation(input: {
  userId: string;
  conversationId?: string;
  accountId: string;
  model: string;
  title?: string;
}): Promise<ConversationRecord> {
  const store = await getStore();
  const id = input.conversationId || randomUUID();
  const existing = await store.conversations.get(id, input.userId);
  if (existing) {
    if (existing.model !== input.model || existing.account_id !== input.accountId) {
      const updated: ConversationRecord = {
        ...existing,
        model: input.model,
        account_id: input.accountId,
        updated_at: new Date().toISOString(),
      };
      await store.conversations.upsert(updated);
      return updated;
    }
    return existing;
  }

  const now = new Date().toISOString();
  const record: ConversationRecord = {
    id,
    user_id: input.userId,
    account_id: input.accountId,
    title: input.title || 'New conversation',
    model: input.model,
    task_state: null,
    created_at: now,
    updated_at: now,
  };
  await store.conversations.upsert(record);
  return record;
}

/** Read the durable task state for a conversation. */
export async function loadTaskState(
  userId: string,
  conversationId: string
): Promise<TaskState | undefined> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  return parseTaskState(conversation?.task_state);
}

/**
 * Merge a patch into the conversation's task state and persist it.
 *
 * This is the mechanism that makes follow-ups work: the model sends only what
 * changed, and everything captured earlier survives.
 */
export async function updateTaskState(
  userId: string,
  conversationId: string,
  patch: TaskPatch
): Promise<TaskState> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  if (!conversation) {
    return mergeTaskState(undefined, patch);
  }
  const next = mergeTaskState(parseTaskState(conversation.task_state), patch);
  await store.conversations.upsert({
    ...conversation,
    task_state: serializeTaskState(next),
    updated_at: new Date().toISOString(),
  });
  return next;
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const store = await getStore();
  const records = await store.conversations.list(userId);
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    model: record.model,
    accountId: record.account_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }));
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const store = await getStore();
  await store.conversations.delete(conversationId, userId);
}

export interface StoredMessage {
  id: string;
  seq: number;
  role: MessageRecord['role'];
  content: string | null;
  toolCalls?: unknown;
  toolCallId?: string | null;
  name?: string | null;
  model?: string | null;
  createdAt: string;
}

export async function loadMessages(
  userId: string,
  conversationId: string
): Promise<StoredMessage[]> {
  const store = await getStore();
  const records = await store.messages.list(conversationId, userId);
  return records.map((record) => ({
    id: record.id,
    seq: record.seq,
    role: record.role,
    content: record.content,
    toolCalls: record.tool_calls ? safeParse(record.tool_calls) : undefined,
    toolCallId: record.tool_call_id,
    name: record.name,
    model: record.model,
    createdAt: record.created_at,
  }));
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Convert stored messages into the exact transcript sent to the model. */
export function toAgentHistory(messages: StoredMessage[]): AgentMessage[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      if (message.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: message.toolCallId || undefined,
          name: message.name || undefined,
          content: message.content || '',
        };
      }
      if (message.role === 'assistant' && message.toolCalls) {
        return {
          role: 'assistant' as const,
          content: message.content,
          tool_calls: message.toolCalls as AgentMessage['tool_calls'],
        };
      }
      return {
        role: message.role as 'user' | 'assistant',
        content: message.content || '',
      };
    });
}

export async function appendMessages(input: {
  userId: string;
  conversationId: string;
  messages: AgentMessage[];
  model?: string;
  usage?: unknown;
}): Promise<StoredMessage[]> {
  const store = await getStore();
  const appended: StoredMessage[] = [];
  let seq = await store.messages.nextSeq(input.conversationId);

  for (const message of input.messages) {
    const record: MessageRecord = {
      id: randomUUID(),
      conversation_id: input.conversationId,
      user_id: input.userId,
      seq,
      role: message.role,
      content: message.content ?? null,
      tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      tool_call_id: message.tool_call_id || null,
      name: message.name || null,
      model: input.model || null,
      usage: input.usage ? JSON.stringify(input.usage) : null,
      created_at: new Date().toISOString(),
    };
    await store.messages.append(record);
    appended.push({
      id: record.id,
      seq: record.seq,
      role: record.role,
      content: record.content,
      toolCalls: message.tool_calls,
      toolCallId: record.tool_call_id,
      name: record.name,
      model: record.model,
      createdAt: record.created_at,
    });
    seq += 1;
  }

  const conversation = await store.conversations.get(input.conversationId, input.userId);
  if (conversation) {
    await store.conversations.upsert({
      ...conversation,
      updated_at: new Date().toISOString(),
    });
  }

  return appended;
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  if (!conversation) return;
  await store.conversations.upsert({
    ...conversation,
    title: title.slice(0, 120),
    updated_at: new Date().toISOString(),
  });
}
