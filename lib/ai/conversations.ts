import { randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ConversationRecord, MessageRecord, ProposalRecord } from '@/lib/store/types';
import type { AgentMessage } from './agent';
import {
  emptyState,
  parseAgentState,
  recordProposalOutcome,
  serializeAgentState,
  type AgentState,
  type ProposalState,
} from './agent-state';
import { parseMeta } from './proposals';

/**
 * Server-authoritative conversation storage.
 *
 * The browser renders what the server returns. History, tool calls, tool
 * results, task state and proposals live here, so a refresh, a second tab, a
 * server restart or a different worker instance all see the same conversation.
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

export async function loadAgentState(userId: string, conversationId: string): Promise<AgentState> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  return conversation ? parseAgentState(conversation.task_state) : emptyState();
}

export async function saveAgentState(userId: string, conversationId: string, state: AgentState): Promise<void> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  if (!conversation) return;
  await store.conversations.upsert({
    ...conversation,
    task_state: serializeAgentState(state),
    updated_at: new Date().toISOString(),
  });
}

/** Read-modify-write of the agent state. */
export async function updateAgentState(
  userId: string,
  conversationId: string,
  update: (state: AgentState) => AgentState
): Promise<AgentState> {
  const next = update(await loadAgentState(userId, conversationId));
  await saveAgentState(userId, conversationId, next);
  return next;
}

/**
 * Record a proposal outcome (approval, execution, cancellation, expiry) in the
 * conversation so the agent knows what really happened on the next turn.
 */
export async function recordProposalEvent(
  record: ProposalRecord,
  status: ProposalState,
  detail?: { message?: string; realIds?: Record<string, string> }
): Promise<void> {
  const meta = parseMeta(record);
  const createdCampaignId = detail?.realIds?.campaignId;
  await updateAgentState(record.user_id, record.conversation_id, (state) =>
    recordProposalOutcome(state, {
      proposalId: record.id,
      revision: record.revision,
      operation: record.operation,
      summary: meta.summary,
      status,
      detail: detail?.message,
      realIds: detail?.realIds,
      createdResource:
        createdCampaignId && meta.target.kind === 'new_campaign'
          ? { type: 'campaign', id: createdCampaignId, name: meta.target.campaignName }
          : undefined,
    })
  );
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

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export async function loadMessages(userId: string, conversationId: string): Promise<StoredMessage[]> {
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

/**
 * Convert stored messages into the exact transcript sent to the model.
 * Tool calls without a stored result (an interrupted turn) are closed with an
 * explicit "interrupted" result so the transcript stays valid without hiding
 * that anything happened.
 */
export function toAgentHistory(messages: StoredMessage[]): AgentMessage[] {
  const history: AgentMessage[] = [];
  const answered = new Set(messages.filter((message) => message.role === 'tool').map((message) => message.toolCallId));

  for (const message of messages) {
    if (message.role === 'system') continue;
    if (message.role === 'tool') {
      history.push({
        role: 'tool',
        tool_call_id: message.toolCallId || undefined,
        name: message.name || undefined,
        content: message.content || '',
      });
      continue;
    }
    if (message.role === 'assistant' && Array.isArray(message.toolCalls) && message.toolCalls.length) {
      const calls = message.toolCalls as NonNullable<AgentMessage['tool_calls']>;
      history.push({ role: 'assistant', content: message.content, tool_calls: calls });
      for (const call of calls) {
        if (!answered.has(call.id)) {
          history.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function?.name,
            content: JSON.stringify({ error: { code: 'internal', message: 'This step was interrupted and has no result.' } }),
          });
        }
      }
      continue;
    }
    history.push({ role: message.role as 'user' | 'assistant', content: message.content || '' });
  }
  return history;
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
    await store.conversations.upsert({ ...conversation, updated_at: new Date().toISOString() });
  }

  return appended;
}

export async function renameConversation(userId: string, conversationId: string, title: string): Promise<void> {
  const store = await getStore();
  const conversation = await store.conversations.get(conversationId, userId);
  if (!conversation) return;
  await store.conversations.upsert({ ...conversation, title: title.slice(0, 120), updated_at: new Date().toISOString() });
}

/**
 * Map each proposal to the visible assistant message of the turn that created
 * it, so approval cards reappear in the right place after a reload.
 */
export function mapProposalsToMessages(messages: StoredMessage[]): Map<string, string> {
  const mapping = new Map<string, string>();
  let pending: string[] = [];
  let lastReplyId: string | undefined;
  const flush = () => {
    if (lastReplyId) for (const proposalId of pending) mapping.set(proposalId, lastReplyId);
    pending = [];
    lastReplyId = undefined;
  };
  for (const message of messages) {
    if (message.role === 'user') {
      flush();
      continue;
    }
    if (message.role === 'tool' && message.content) {
      const payload = safeParse(message.content) as { proposalId?: string; status?: string } | undefined;
      if (payload?.status === 'proposal_prepared' && payload.proposalId) pending.push(payload.proposalId);
      continue;
    }
    if (message.role === 'assistant' && message.content && message.content.trim()) lastReplyId = message.id;
  }
  flush();
  return mapping;
}
