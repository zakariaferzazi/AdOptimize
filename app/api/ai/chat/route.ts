import { NextRequest, NextResponse } from 'next/server';
import { runAgent, type AgentMessage } from '@/lib/ai/agent';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { AccountBindingError, resolveAccountBinding, resolveFreshAccessToken } from '@/lib/ai/account-binding';
import {
  appendMessages,
  ensureConversation,
  loadAgentState,
  loadMessages,
  renameConversation,
  saveAgentState,
  toAgentHistory,
} from '@/lib/ai/conversations';
import { createProposal, expireStaleProposals, toProposalView } from '@/lib/ai/proposals';
import { toClientProposal } from '@/lib/ai/proposal-client';
import { recordProposalOutcome } from '@/lib/ai/agent-state';
import { getStore, isDurableStore } from '@/lib/store';
import { newRequestStats, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { OpenRouterError } from '@/lib/openrouter-service';
import type { ProposedAccountChange } from '@/types/adoptimize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One conversational turn with the marketing agent.
 *
 * Nothing is pre-fetched from Google Ads: the model decides whether live data
 * is needed and the tools fetch only that. The full transcript and the durable
 * conversation state are loaded, the agent runs, and the turn (user message,
 * tool calls, tool results, reply) plus the updated state are persisted.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const model = String(body?.model || body?.modelTier || 'deepseek');
    const requestedConversationId = typeof body?.conversationId === 'string' ? body.conversationId : undefined;

    if (!message) {
      return NextResponse.json({ success: false, error: 'A message is required.' }, { status: 400 });
    }

    const binding = await resolveAccountBinding(identity.uid, idToken);
    if (!binding) {
      return NextResponse.json(
        { success: false, error: 'Connect a Google Ads account before asking the agent about performance or changes.' },
        { status: 409 }
      );
    }

    const { accessToken, error: tokenError } = await resolveFreshAccessToken(identity.uid, idToken);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: tokenError || 'Google Ads access has expired. Reconnect the account to continue.' },
        { status: 401 }
      );
    }

    const conversation = await ensureConversation({
      userId: identity.uid,
      conversationId: requestedConversationId,
      accountId: binding.customerId,
      model,
      title: message.slice(0, 80),
    });

    const [stored, initialState, expired] = await Promise.all([
      loadMessages(identity.uid, conversation.id),
      loadAgentState(identity.uid, conversation.id),
      expireStaleProposals(identity.uid, conversation.id),
    ]);

    let state = initialState;
    for (const record of expired) {
      state = recordProposalOutcome(state, {
        proposalId: record.id,
        revision: record.revision,
        operation: record.operation,
        summary: toProposalView(record).summary,
        status: 'expired',
      });
    }

    const ads: GoogleAdsContext = {
      customerId: binding.customerId,
      accessToken,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      loginCustomerId: binding.loginCustomerId,
      currency: binding.currency,
      accountName: binding.accountName,
      stats: newRequestStats(),
    };

    const userMessage: AgentMessage = { role: 'user', content: message };
    const supersededThisTurn: string[] = [];

    const result = await runAgent({
      model,
      history: [...toAgentHistory(stored), userMessage],
      ads,
      state,
      saveProposal: async (draft) => {
        // A proposal must survive until the approval request. The in-memory
        // store does not cross Worker isolates, so fail closed in production.
        if (process.env.NODE_ENV === 'production' && !isDurableStore()) {
          throw new Error('Durable proposal storage is not configured, so no change can be prepared safely.');
        }
        const { record, supersededIds } = await createProposal({
          userId: identity.uid,
          conversationId: conversation.id,
          accountId: binding.customerId,
          operation: draft.operation,
          payload: draft.args,
          before: draft.before,
          meta: {
            taskId: draft.taskId,
            targetKey: draft.targetKey,
            title: draft.title,
            summary: draft.summary,
            changes: draft.changes,
            warnings: draft.warnings,
            destructive: draft.destructive,
            actionType: draft.actionType,
            target: draft.target,
            reason: typeof draft.args.reason === 'string' ? draft.args.reason : undefined,
          },
        });
        supersededThisTurn.push(...supersededIds);
        return { proposalId: record.id, revision: record.revision, supersededIds };
      },
    });

    await appendMessages({
      userId: identity.uid,
      conversationId: conversation.id,
      messages: [userMessage, ...result.producedMessages],
      model: result.modelUsed,
      usage: result.usage,
    });
    await saveAgentState(identity.uid, conversation.id, result.state);
    if (stored.length === 0) await renameConversation(identity.uid, conversation.id, message.slice(0, 80));

    // Cards for every proposal prepared during this turn, in order.
    const store = await getStore();
    const proposals: ProposedAccountChange[] = [];
    const seen = new Set<string>();
    for (const call of result.toolCalls) {
      const payload = call.result as { status?: string; proposalId?: string } | undefined;
      if (call.kind !== 'write' || payload?.status !== 'proposal_prepared' || !payload.proposalId || seen.has(payload.proposalId)) continue;
      seen.add(payload.proposalId);
      const record = await store.proposals.get(payload.proposalId, identity.uid);
      if (record) proposals.push(toClientProposal(toProposalView(record), conversation.id));
    }
    const pending = proposals.filter((proposal) => proposal.status === 'PENDING_APPROVAL');

    const toolCalls = result.toolCalls
      .filter((call) => call.kind !== 'memory')
      .map((call) => ({
        id: call.id,
        name: call.name,
        args: call.arguments,
        result: call.result,
        status: call.isError ? ('error' as const) : ('success' as const),
        executionTimeMs: call.durationMs,
      }));

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      reply: result.reply,
      actionProposal: pending[pending.length - 1],
      actionProposals: pending.length ? pending : undefined,
      supersededProposalIds: supersededThisTurn.length ? supersededThisTurn : undefined,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      modelUsed: result.modelUsed,
      contextLimitReached: result.contextFull || undefined,
      stopReason: result.stopReason,
      openRouterRequestCount: result.usage.modelCalls,
      usage: {
        ...result.usage,
        contextTokens: result.budget.totalTokens,
        contextLimit: result.budget.contextLimit,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof AccountBindingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error('[AI Chat] Request failed:', error);
    const modelFailure =
      error instanceof OpenRouterError || /OpenRouter|No model is configured/i.test(error instanceof Error ? error.message : '');
    return NextResponse.json(
      {
        success: false,
        error: modelFailure
          ? 'The AI model did not respond, so this message was not processed. No Google Ads changes were made. Please try again or switch model.'
          : 'The marketing agent could not complete this request. No Google Ads changes were made. Please try again.',
      },
      { status: modelFailure ? 502 : 500 }
    );
  }
}
