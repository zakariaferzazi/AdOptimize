import { NextRequest, NextResponse } from 'next/server';
import { runAgent, type AgentMessage } from '@/lib/ai/agent';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import {
  AccountBindingError,
  resolveAccountBinding,
  resolveGoogleAdsCredentials,
} from '@/lib/ai/account-binding';
import {
  appendMessages,
  ensureConversation,
  loadMessages,
  renameConversation,
  toAgentHistory,
} from '@/lib/ai/conversations';
import { createProposal, expireStaleProposals, toProposalView } from '@/lib/ai/proposals';
import { getStore } from '@/lib/store';
import { queryLiveCampaigns } from '@/lib/google-ads-api';
import { executeGoogleAdsTokenRefresh } from '@/lib/google-token-refresh';
import type { McpServerContext } from '@/lib/mcp/google-ads-server';
import type { Campaign, Keyword, SearchTerm, ProposedAccountChange } from '@/types/adoptimize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACTION_TYPE_BY_OPERATION: Record<string, ProposedAccountChange['actionType']> = {
  update_campaign_budget: 'UPDATE_BUDGET',
  update_campaign_name: 'UPDATE_SETTINGS',
  update_campaign_dates: 'UPDATE_SETTINGS',
  update_campaign_network_settings: 'UPDATE_SETTINGS',
  update_campaign_tracking: 'UPDATE_SETTINGS',
  update_campaign_bidding_strategy: 'UPDATE_SETTINGS',
};

function toClientProposal(
  view: ReturnType<typeof toProposalView>,
  conversationId: string
): ProposedAccountChange {
  const payload = view.payload;
  const isPause =
    view.operation === 'update_campaign_status' && String(payload.status) === 'PAUSED';
  const actionType = isPause
    ? 'PAUSE_CAMPAIGN'
    : view.operation === 'update_campaign_status'
    ? 'ENABLE_CAMPAIGN'
    : ACTION_TYPE_BY_OPERATION[view.operation] || 'UPDATE_SETTINGS';

  return {
    id: view.proposalId,
    proposalId: view.proposalId,
    revision: view.revision,
    payloadHash: view.payloadHash,
    conversationId,
    actionType,
    campaignId: view.campaignId || '',
    campaignName: view.campaignName || 'Campaign',
    currentSettings: JSON.stringify(view.beforeSnapshot),
    proposedChanges: view.summary,
    reason: String(payload.reason || view.summary),
    evidence: `Prepared from live Google Ads data for campaign ${view.campaignId || ''}.`,
    potentialRisks:
      'This change affects live campaign delivery. It is applied only after you approve this exact revision.',
    status: 'PENDING_APPROVAL',
    payload,
  };
}

async function resolveAccessToken(
  userId: string,
  idToken: string
): Promise<{ accessToken?: string; error?: string }> {
  const credentials = await resolveGoogleAdsCredentials(userId, idToken);
  if (!credentials) return { error: 'No Google Ads credentials are stored for this account.' };

  const expiresSoon =
    typeof credentials.expiresAt === 'number' && credentials.expiresAt - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return { accessToken: credentials.accessToken };
  if (!credentials.refreshToken) return { accessToken: credentials.accessToken };

  const refreshed = await executeGoogleAdsTokenRefresh({ refreshToken: credentials.refreshToken });
  if (refreshed.success && refreshed.accessToken) return { accessToken: refreshed.accessToken };
  return { accessToken: credentials.accessToken };
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();

    const body = await req.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const model = String(body?.model || body?.modelTier || 'deepseek');
    const requestedConversationId =
      typeof body?.conversationId === 'string' ? body.conversationId : undefined;

    if (!message) {
      return NextResponse.json({ success: false, error: 'A message is required.' }, { status: 400 });
    }

    const binding = await resolveAccountBinding(identity.uid, idToken);
    if (!binding) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Connect a Google Ads account before asking the agent about performance or changes.',
        },
        { status: 409 }
      );
    }

    const conversation = await ensureConversation({
      userId: identity.uid,
      conversationId: requestedConversationId,
      accountId: binding.customerId,
      model,
      title: message.slice(0, 80),
    });

    await expireStaleProposals(identity.uid, conversation.id);

    const stored = await loadMessages(identity.uid, conversation.id);
    const history = toAgentHistory(stored);

    const { accessToken, error: tokenError } = await resolveAccessToken(identity.uid, idToken);
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            tokenError || 'Google Ads access has expired. Reconnect the account to continue.',
        },
        { status: 401 }
      );
    }

    // One live snapshot per turn, shared by every tool call.
    let snapshot: McpServerContext['snapshot'];
    let liveError: string | undefined;
    try {
      const live = await queryLiveCampaigns(
        binding.customerId,
        accessToken,
        process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        binding.loginCustomerId,
        { forceRefresh: true }
      );
      if (live.success) {
        snapshot = {
          campaigns: (live.campaigns || []) as Campaign[],
          keywords: (live.keywords || []) as Keyword[],
          searchTerms: (live.searchTerms || []) as SearchTerm[],
          fetchedAt: live.fetchedAt || new Date().toISOString(),
        };
      } else {
        liveError = live.error || 'Google Ads did not return account data.';
      }
    } catch (error) {
      liveError = error instanceof Error ? error.message : 'The live account read failed.';
    }

    const mcpContext: McpServerContext = {
      customerId: binding.customerId,
      accessToken,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      loginCustomerId: binding.loginCustomerId,
      currency: binding.currency,
      accountName: binding.accountName,
      snapshot,
    };

    const userMessage: AgentMessage = { role: 'user', content: message };
    await appendMessages({
      userId: identity.uid,
      conversationId: conversation.id,
      messages: [userMessage],
      model,
    });

    const result = await runAgent({
      model,
      history: [...history, userMessage],
      mcpContext,
      mcpHooks: {
        prepareProposal: async (prepared) => {
          const record = await createProposal({
            userId: identity.uid,
            conversationId: conversation.id,
            accountId: binding.customerId,
            prepared,
          });
          return { proposalId: record.id, revision: record.revision };
        },
      },
    });

    const assistantMessages = result.producedMessages.filter(
      (item) => item.role === 'assistant' || item.role === 'tool'
    );
    await appendMessages({
      userId: identity.uid,
      conversationId: conversation.id,
      messages: assistantMessages,
      model: result.modelUsed,
      usage: result.usage,
    });

    if (stored.length === 0) {
      await renameConversation(identity.uid, conversation.id, message.slice(0, 80));
    }

    // Surface the newest proposal created during this turn.
    const store = await getStore();
    const latest = await store.proposals.getLatest(conversation.id, identity.uid);
    const proposal =
      latest && latest.status === 'pending_approval'
        ? toClientProposal(toProposalView(latest), conversation.id)
        : undefined;

    const toolCalls = result.toolCalls.map((call) => ({
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
      actionProposal: proposal,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      modelUsed: result.modelUsed,
      contextLimitReached: result.contextFull || undefined,
      liveDataError: liveError,
      openRouterRequestCount: result.steps,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof AccountBindingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error('[AI Chat] Request failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'The marketing agent could not complete this request. No Google Ads changes were made.',
      },
      { status: 500 }
    );
  }
}
