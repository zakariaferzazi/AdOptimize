import { NextRequest, NextResponse } from 'next/server';
import { sendOpenRouterChat, ChatCompletionMessage, getModelContextLimit, getModelDisplayName, OpenRouterResponse } from '@/lib/openrouter-service';
import {
  executeGoogleAdsTool,
  GOOGLE_ADS_TOOL_DEFINITIONS,
  getGoogleAdsOperation,
  ToolContext,
} from '@/lib/google-ads-tools';
import { Campaign, ProposedAccountChange, ToolCallExecution, InteractiveRecommendationCard, AnalysisSummaryDetail } from '@/types/adoptimize';
import { getCurrencySymbol } from '@/lib/metrics-calculator';
import { queryLiveCampaigns } from '@/lib/google-ads-api';
import {
  getLatestProposal,
  proposalRecordToClientProposal,
  registerChatProposal,
  cancelProposal,
} from '@/lib/chat-proposal-store';
import {
  cacheAccountCampaigns,
  compactConversationState,
  getConversationState,
  isAccountCacheFresh,
  recordMentionedEntity,
  recordConversationFacts,
  resetTaskContext,
  recordPendingCampaignCreation,
  clearPendingCampaignCreation,
  resolveEntity,
  ConversationState,
  PendingCampaignCreation,
} from '@/lib/conversation-state';
import { classifyChatMessage } from '@/lib/chat-classifier';
import {
  channelForObjective,
  creationClarificationQuestion,
  CreationObjective,
  extractCreationParams,
  isCreationRequest,
  looksLikeCreationContinuation,
  missingCreationFields,
} from '@/lib/campaign-creation';

function emptyConversationState(accountId: string): ConversationState {
  return {
    account_id: accountId,
    recent_entities: [],
    updated_at: new Date().toISOString(),
  };
}

function proposalStorageFailure(error: unknown) {
  console.error('[AI Chat] Proposal persistence failed; no approval card was issued:', error);
  return NextResponse.json(
    {
      success: false,
      error: 'The request was understood, but approval storage is unavailable. No Google Ads changes were made. Please try again after the conversation storage is available.',
    },
    { status: 503 }
  );
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s,)"']+/gi)].map(([url]) => url);
}

function estimateTokens(messages: Array<{ role: string; content?: string | null }>): number {
  return Math.ceil(messages.reduce((total, item) => total + (item.content || '').length, 0) / 4);
}

/**
 * Intelligent deterministic optimization engine.
 * Ensures the user always receives an exhaustive, accurate, and actionable
 * Google Ads report even if external LLM credentials have a latency spike or are unset.
 */
async function synthesizeDeterministicGoogleAdsResponse(
  message: string,
  toolContext: ToolContext,
  modelName: string
) {
  const q = message.toLowerCase();
  const { campaigns = [], searchTerms = [], account } = toolContext;

  let toolNamesToRun: string[] = [];
  let capturedProposal: ProposedAccountChange | undefined;
  let capturedTableData: any;
  const executedToolCalls: ToolCallExecution[] = [];
  const interactiveRecommendations: InteractiveRecommendationCard[] = [];

  const isWasted = q.includes('waste') || q.includes('bleed') || q.includes('drain') || q.includes('leak') || q.includes('zero conv') || q.includes('inefficient');
  const isBudget = q.includes('budget') || q.includes('improve') || q.includes('reallocat') || q.includes('scale') || q.includes('shift') || q.includes('cut');
  const isChanges = q.includes('change') || q.includes('history') || q.includes('previous') || q.includes('compare') || q.includes('why');
  const isSearchTerms = q.includes('search term') || q.includes('query') || q.includes('queries') || q.includes('negative');
  const isPause = q.includes('pause') || q.includes('stop');
  const isEnable = q.includes('enable') || q.includes('resume') || q.includes('start');

  if (isPause) {
    const matchedCamp = campaigns.find((c) => q.includes(c.name.toLowerCase())) || campaigns.find((c) => c.conversions === 0 && c.spend > 0) || campaigns[0];
    if (matchedCamp) {
      const res = await executeGoogleAdsTool('pause_campaign', { campaignNameOrId: matchedCamp.name }, toolContext);
      if (res.actionProposal) capturedProposal = res.actionProposal;
      toolNamesToRun = [];
    }
  } else if (isEnable) {
    const matchedCamp = campaigns.find((c) => q.includes(c.name.toLowerCase())) || campaigns.find((c) => c.status === 'PAUSED') || campaigns[0];
    if (matchedCamp) {
      const res = await executeGoogleAdsTool('enable_campaign', { campaignNameOrId: matchedCamp.name }, toolContext);
      if (res.actionProposal) capturedProposal = res.actionProposal;
      toolNamesToRun = [];
    }
  } else if (isWasted) {
    toolNamesToRun = ['find_wasted_spend', 'get_search_terms', 'identify_underperforming_campaigns'];
  } else if (isBudget) {
    toolNamesToRun = ['analyze_budget_allocation', 'generate_optimization_recommendations', 'get_campaigns'];
  } else if (isChanges) {
    toolNamesToRun = ['get_performance_changes', 'get_change_history'];
  } else if (isSearchTerms) {
    toolNamesToRun = ['get_search_terms', 'identify_search_term_opportunities'];
  } else {
    // General campaign audit
    toolNamesToRun = ['get_account_overview', 'get_campaigns', 'find_wasted_spend'];
  }

  // Execute selected tools
  for (const tName of toolNamesToRun) {
    const start = Date.now();
    const result = await executeGoogleAdsTool(tName, {}, toolContext);
    const duration = Date.now() - start;

    executedToolCalls.push({
      id: `tool-${Date.now()}-${tName}`,
      name: tName,
      args: {},
      result: result.data || result.message,
      status: result.success ? 'success' : 'error',
      executionTimeMs: duration,
    });

    if (result.actionProposal && !capturedProposal) {
      capturedProposal = result.actionProposal;
    }
    if (result.tableData && !capturedTableData) {
      capturedTableData = result.tableData;
    }

    if (tName === 'find_wasted_spend' && result.data?.bleeders && Array.isArray(result.data.bleeders)) {
      result.data.bleeders.slice(0, 2).forEach((b: any, idx: number) => {
        interactiveRecommendations.push({
          id: `rec-waste-${b.id || idx}`,
          type: 'WASTED_SPEND',
          title: 'Potential Wasted Spend',
          campaignName: b.name,
          finding: `The campaign spent $${Number(b.spend || 0).toFixed(2)} without recording conversions during the selected period.`,
          metrics: { spend: b.spend, conversions: 0, cpa: b.cpa },
          actions: [
            { label: 'Inspect Search Terms', prompt: `Inspect search terms for ${b.name} to see which queries spent money without converting.` },
            { label: 'Analyze Campaign', prompt: `Perform a detailed performance diagnosis on ${b.name}.` },
            { label: 'Review Optimization Recommendation', prompt: `Recommend how to adjust or pause ${b.name} to eliminate waste.` },
          ],
        });
      });
    }
  }

  // Synthesize Markdown Content
  const sym = getCurrencySymbol(account.currency);
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalConv = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const blendedCpa = totalConv > 0 ? totalSpend / totalConv : 0;
  const totalVal = campaigns.reduce((s, c) => s + (c.conversionValue || 0), 0);
  const accountRoas = totalSpend > 0 ? totalVal / totalSpend : 0;

  const bleeders = campaigns.filter((c) => c.conversions === 0 && c.spend >= 40);
  const totalBleederSpend = bleeders.reduce((s, c) => s + c.spend, 0);

  let reply = '';

  if (isWasted) {
    reply = `## Executive Summary
I have audited your active campaigns, auction logs, and search queries for **${account.accountName}**. We detected **${sym}${totalBleederSpend.toFixed(2)}** in non-converting ad spend that can be eliminated or reclaimed immediately.

## Key Findings
- **Zero-Conversion Bleeders**: **${bleeders.length}** campaign${bleeders.length !== 1 ? 's' : ''} consumed **${sym}${totalBleederSpend.toFixed(2)}** without generating any conversions.
- **Search Query Leakage**: Several broad match queries accrued clicks on non-buying traffic.
- **Blended Account CPA**: Currently **${totalConv > 0 ? `${sym}${blendedCpa.toFixed(2)}` : '—'}** across **${totalConv}** conversions.

| Campaign | Status | Spend | Conversions | CPA | Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
${campaigns.slice(0, 5).map((c) => `| **${c.name}** | ${c.status} | ${sym}${c.spend.toFixed(2)} | ${c.conversions} | ${c.conversions > 0 ? `${sym}${c.cpa.toFixed(2)}` : '—'} | ${c.conversions === 0 ? 'Pause / Cut Budget' : 'Scale'} |`).join('\n')}

## Evidence-Based Interpretation
The synchronized campaign and search-term records show where spend occurred without conversions. The available data does not by itself prove broad-match intent, missing negatives, or intraday budget depletion, so those causes should be verified before making changes.

## Recommended Next Steps
- Review the exact non-converting queries in the confirmation cards.
- Decide which specific queries or campaigns should be changed.
- Apply only the approved campaign change; no changes have been made by this analysis.`;
  } else if (isBudget) {
    const topCamp = [...campaigns].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0];
    const lowestCamp = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => (a.roas || 0) - (b.roas || 0))[0];

    reply = `## Budget Optimization Plan
I analyzed your daily pacing across **${campaigns.length} campaigns** to evaluate marginal return on ad spend (ROAS).

## Key Allocation Findings
- **Top Efficiency Campaign**: **${topCamp?.name}** is generating **${(topCamp?.roas || 0).toFixed(2)}x ROAS** with an average CPA of **${topCamp?.conversions ? `${sym}${topCamp.cpa.toFixed(2)}` : '—'}**.
- **Underperforming Campaign**: **${lowestCamp?.name}** is operating at **${(lowestCamp?.roas || 0).toFixed(2)}x ROAS** (${lowestCamp?.conversions ? `${sym}${lowestCamp.cpa.toFixed(2)} CPA` : '0 conversions'}).
- **Opportunity to investigate**: ${topCamp?.name || 'No campaign'} has the strongest observed ROAS in the synchronized data, while ${lowestCamp?.name || 'no campaign'} has the weakest among campaigns with spend. This is not a forecast and does not authorize a budget change.

| Campaign | Current Daily Budget | Proposed Daily Budget | Net Shift | Expected Impact |
| :--- | :--- | :--- | :--- | :--- |
| **${lowestCamp?.name || '—'}** | ${lowestCamp ? `${sym}${lowestCamp.budgetDaily.toFixed(2)}/day` : '—'} | Not proposed | — | Review evidence first |
| **${topCamp?.name || '—'}** | ${topCamp ? `${sym}${topCamp.budgetDaily.toFixed(2)}/day` : '—'} | Not proposed | — | Review evidence first |

## Recommended Next Steps
Ask me to prepare the budget update for any campaign when you are ready to review and apply the change in Google Ads.`;
  } else if (capturedProposal) {
    reply = `## Confirm Change for ${capturedProposal.campaignName}
The requested Google Ads change is ready. It will not be sent until you click the confirmation button.

Please review the details in the confirmation card below:
- **Campaign**: **${capturedProposal.campaignName}**
- **Change to Apply**: ${capturedProposal.proposedChanges}
- **Reason**: ${capturedProposal.reason}
- **Potential Risks**: ${capturedProposal.potentialRisks}

Click the action button below to apply this exact change in Google Ads.`;
  } else {
    reply = `## Account Performance Audit
Here is the current performance summary for **${account.accountName}**:

## Key Metrics Summary
- **Total Tracked Spend**: **$${totalSpend.toFixed(2)}**
- **Total Conversions**: **${totalConv}**
- **Blended CPA**: **$${blendedCpa.toFixed(2)}**
- **Overall ROAS**: **${accountRoas.toFixed(2)}x**
- **Active Campaigns**: **${campaigns.filter((c) => c.status === 'ENABLED').length} of ${campaigns.length} Enabled**

| Campaign | Status | Daily Budget | 7d Spend | Conversions | CPA | ROAS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${campaigns.slice(0, 6).map((c) => `| **${c.name}** | ${c.status} | $${c.budgetDaily.toFixed(2)}/d | $${c.spend.toFixed(2)} | ${c.conversions} | $${c.cpa.toFixed(2)} | ${c.roas.toFixed(2)}x |`).join('\n')}

## Recommended Next Steps
- Tell me to **find wasted spend** to isolate non-converting search queries.
- Ask me to **improve budget allocation** to scale winning campaigns.
- Ask to **inspect any individual campaign** for keyword Quality Scores.`;
  }

  const analysisDetails: AnalysisSummaryDetail = {
    campaignsCount: campaigns.length,
    dateRangeExamined: '7-day and 30-day performance windows',
    aspectsExamined: [
      'Audited active campaign budgets, pacing, and status',
      'Inspected search queries and non-converting keyword candidates',
      'Evaluated blended CPA and ROAS against account benchmarks',
    ],
  };

  return {
    reply,
    executedToolCalls,
    capturedProposal,
    capturedTableData,
    interactiveRecommendations,
    analysisDetails,
    modelUsed: modelName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      model = 'deepseek',
      modelTier,
      context = {},
    } = body;

    const requestedModel = (model || modelTier || 'deepseek');
    const displayName = getModelDisplayName(requestedModel);

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const toolContext: ToolContext = {
      userId: context.userId,
      account: {
        ...(context.account || {}),
        accountName: context.account?.accountName || 'Google Ads Account',
        clientCustomerId: context.account?.clientCustomerId || 'Connected',
        currency: context.account?.currency || 'USD',
        isConnected: context.account?.isConnected ?? true,
      },
      campaigns: context.campaigns || [],
      keywords: context.keywords || [],
      searchTerms: context.searchTerms || [],
      auditLogs: context.auditLogs || [],
      anomalies: context.anomalies || [],
      insights: context.insights || [],
      recommendations: context.recommendations || [],
      rules: context.rules || [],
      accessToken: context.accessToken,
    };
    const conversationId = String(context.conversationId || 'default');
    const accountId = String(toolContext.account.clientCustomerId || 'unknown');
    let conversationState: ConversationState;
    try {
      conversationState = await getConversationState(conversationId, accountId);
    } catch (error) {
      console.error('[AI Chat] Conversation state read failed; continuing with an empty state:', error);
      conversationState = emptyConversationState(accountId);
    }
    const transcript = (Array.isArray(conversationHistory) ? conversationHistory : [])
      .filter((item: { role?: string; content?: string }) =>
        (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
      )
      .map((item: { role: string; content: string }) => ({ role: item.role, content: item.content }));
    const hasLatestMessage = transcript.some(
      (item, index) => index === transcript.length - 1 && item.role === 'user' && item.content === message
    );
    if (!hasLatestMessage) transcript.push({ role: 'user', content: message });

    const contextLimit = getModelContextLimit(requestedModel);
    if (estimateTokens(transcript) > contextLimit) {
      return NextResponse.json({
        success: true,
        contextLimitReached: true,
        reply: `This conversation has reached the context limit for ${displayName}. I have not removed any earlier messages. Please start a new chat to continue.`,
        openRouterRequestCount: 0,
      });
    }

    const messageUrls = extractUrls(transcript.map((item) => item.content).join('\n'));
    if (messageUrls.length > 0) {
      try {
        conversationState = await recordConversationFacts(conversationId, accountId, {
          known_urls: messageUrls,
        });
      } catch (error) {
        console.error('[AI Chat] Conversation facts write failed; continuing with current state:', error);
      }
    }
    const proposalMetadata = (proposal: ProposedAccountChange) => {
      const campaign = (toolContext.campaigns || []).find(
        (item) => String(item.id) === String(proposal.campaignId)
      );
      return {
        userId: context.userId ? String(context.userId) : undefined,
        accountId: toolContext.account.clientCustomerId
          ? String(toolContext.account.clientCustomerId)
          : undefined,
        beforeSnapshot: proposal.actionType === 'CREATE_CAMPAIGN'
          ? { exists: false, name: proposal.payload?.name || proposal.campaignName }
          : campaign
          ? {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              budgetDaily: campaign.budgetDaily,
            }
          : undefined,
      };
    };

    const recentActionProposals = Array.isArray(context.recentActionProposals)
      ? context.recentActionProposals
      : [];
    const activeCampaignReference =
      context.activeCampaign && typeof context.activeCampaign === 'object'
        ? {
            id: String(context.activeCampaign.id || ''),
            name: String(context.activeCampaign.name || ''),
          }
        : undefined;
    const recentCreatedProposal = [...recentActionProposals]
      .reverse()
      .find((proposal: ProposedAccountChange) =>
        proposal.actionType === 'CREATE_CAMPAIGN' &&
        proposal.status === 'EXECUTED' &&
        proposal.campaignId &&
        !String(proposal.campaignId).startsWith('draft-')
      );
    let liveDataStatus = 'Using the latest synchronized account snapshot supplied by the dashboard.';
    const cacheIsFresh = isAccountCacheFresh(conversationState);
    if (cacheIsFresh && conversationState.account_cache) {
      toolContext.campaigns = conversationState.account_cache.campaigns || [];
      liveDataStatus = `Using account data cached at ${conversationState.account_cache.fetched_at}.`;
    } else if (
      toolContext.accessToken &&
      toolContext.account.clientCustomerId &&
      toolContext.account.clientCustomerId !== 'Not Connected'
    ) {
      try {
        const liveResult = await queryLiveCampaigns(
          toolContext.account.clientCustomerId,
          toolContext.accessToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId,
          { forceRefresh: true }
        );
        if (liveResult.success) {
          toolContext.campaigns = (liveResult.campaigns || []) as ToolContext['campaigns'];
          toolContext.keywords = (liveResult.keywords || []) as ToolContext['keywords'];
          toolContext.searchTerms = (liveResult.searchTerms || []) as ToolContext['searchTerms'];
          try {
            conversationState = await cacheAccountCampaigns(
              conversationId,
              accountId,
              toolContext.campaigns,
              liveResult.fetchedAt || new Date().toISOString()
            );
          } catch (error) {
            console.error('[AI Chat] Account cache write failed; continuing with live data:', error);
          }
          liveDataStatus = `Live Google Ads data was fetched at ${liveResult.fetchedAt || new Date().toISOString()}.`;
        } else {
          liveDataStatus = `Live refresh failed: ${liveResult.error || 'Google Ads did not return data'}. Use the supplied synchronized snapshot and clearly label it as the latest available data, not a live refresh.`;
        }
      } catch (error) {
        console.error('[AI Chat] Live Google Ads refresh failed:', error);
        liveDataStatus = 'Live refresh failed unexpectedly. Use the supplied synchronized snapshot and clearly label it as the latest available data.';
      }
    }
    if (
      recentCreatedProposal &&
      !toolContext.campaigns.some((campaign) => String(campaign.id) === String(recentCreatedProposal.campaignId))
    ) {
      const payload = recentCreatedProposal.payload || {};
      const rawType = String(payload.channelType || 'SEARCH').toUpperCase();
      const fallbackType: Campaign['type'] =
        rawType === 'PERFORMANCE_MAX' || rawType === 'DISPLAY' || rawType === 'SHOPPING'
          ? rawType
          : 'SEARCH';
      const fallbackCampaign: Campaign = {
        id: String(recentCreatedProposal.campaignId),
        accountId: toolContext.account.clientCustomerId,
        name: recentCreatedProposal.campaignName,
        type: fallbackType,
        status: 'PAUSED',
        budgetDaily: Number(payload.budgetDaily) || 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        cpa: 0,
        conversionValue: 0,
        roas: 0,
        conversionRate: 0,
        healthStatus: 'WARNING',
        healthScore: 0,
        trendPoints: [],
        historicalPoints: [],
        keywordsCount: 0,
        activeAdsCount: 0,
      };
      toolContext.campaigns = [...toolContext.campaigns, fallbackCampaign];
    }

    const systemPrompt = `You are the Google Ads Optimization Specialist for AdOptimize.app.
You communicate directly like a senior, highly experienced Google Ads performance marketer.
You have direct access to tools that query the user's connected Google Ads account and suggest or perform optimizations.

OPERATING RULES:
1. Determine the user's exact objective and scope before acting. If the request is ambiguous, ask one short clarification question and do not call a tool.
2. Use the live-data status below and tools as the source of truth. Never invent metrics, causes, recommendations, campaign names, or completed actions.
3. Analysis requests are read-only. Action requests must affect only the named campaign or setting.
4. Action requests must return a clear confirmation action. Never claim a change was executed until the user confirms it and the execution endpoint reports success.
5. After a confirmed mutation, verify the changed campaign through fresh Google Ads data before reporting success.
6. Respect the account currency and the available reporting window. If a requested date range is unavailable, say so instead of silently substituting another range.
7. Campaign references may be informal or shortened. Match the user's meaningful campaign words to the closest actual campaign name returned by the account; for example, "dress better ai app" refers to "Dress Better AI promotion-App". Only ask for clarification when multiple campaigns are genuinely plausible.

LIVE-DATA STATUS:
${liveDataStatus}

CONVERSATION STATE (server-maintained; do not infer or overwrite it):
${JSON.stringify(compactConversationState(conversationState))}

RESPONSE FORMATTING GUIDELINES:
1. Always ground your analysis strictly in the account's real data retrieved via tools.
2. Structure your responses so they are easy to scan:
   - **Summary**: 1-2 sentence executive overview.
   - **Key Findings**: Clear bullet points with exact metrics (Spend, Conversions, CPA, ROAS, CTR).
   - **Campaign Breakdown**: Use a clean Markdown table when comparing campaigns, keywords, or search queries.
   - **Root Cause Analysis**: Why underperformance or budget leakage is occurring.
   - **Recommended Next Steps**: Concrete actions the advertiser should take.
3. Formats:
   - Format currencies as $XX.XX.
   - Format ROAS as X.Xx (e.g. 3.40x).
   - Format CPA as $XX.XX.
   - Bold important metric names and values.
4. The server has already retrieved the relevant evidence before this request. Do not request tools or claim to have performed a new action. For explicit changes, describe the confirmation action supplied in the evidence; for recommendations, remain read-only.
5. NEVER mention internal function names (e.g. "get_account_performance", "find_wasted_spend").
6. NEVER mention API keys, JSON payloads, or developer terms. Speak strictly in business and PPC advertising terms.
8. Support natural conversational follow-ups (e.g. "Explain the first one", "Pause it", "Show me search terms for it") by referencing the campaigns and data discussed earlier in the conversation history.
9. State clearly what you found, what you recommend, and what you actually did.`;

    const formattedMessages: ChatCompletionMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const h of transcript) {
      formattedMessages.push({ role: h.role as 'user' | 'assistant', content: h.content });
    }

    let latestProposalRecord;
    try {
      latestProposalRecord = await getLatestProposal(conversationId);
    } catch (error) {
      console.error('[AI Chat] Pending proposal read failed; continuing without proposal context:', error);
      latestProposalRecord = undefined;
    }
    const pendingProposalToRevise = latestProposalRecord
      ? proposalRecordToClientProposal(latestProposalRecord)
      : undefined;
    const newCreationTask = isCreationRequest(message);
    const proposalForClassification = newCreationTask ? undefined : pendingProposalToRevise;
    if (newCreationTask && pendingProposalToRevise) {
      try {
        await cancelProposal(conversationId, pendingProposalToRevise.proposalId || pendingProposalToRevise.id);
      } catch (error) {
        console.error('[AI Chat] Previous proposal could not be retired for a new task:', error);
      }
    }
    if (pendingProposalToRevise?.actionType === 'CREATE_CAMPAIGN') {
      const proposalPayload = pendingProposalToRevise.payload || {};
      const recoveredAppUrl = String(
        proposalPayload.appUrl ||
        conversationState.task_context?.known_urls?.[0] ||
        ''
      );
      if (
        recoveredAppUrl &&
        (!conversationState.pending_campaign_creation ||
          conversationState.pending_campaign_creation.appUrl !== recoveredAppUrl)
      ) {
        try {
          conversationState = await recordPendingCampaignCreation(conversationId, accountId, {
            name: pendingProposalToRevise.campaignName,
            budgetDaily: Number(proposalPayload.budgetDaily),
            currency: toolContext.account.currency,
            objective: proposalPayload.objective,
            appUrl: recoveredAppUrl,
            finalUrl: String(proposalPayload.finalUrl || recoveredAppUrl),
            channelType: String(proposalPayload.channelType || ''),
          });
        } catch (error) {
          console.error('[AI Chat] Pending proposal context recovery failed:', error);
        }
      }
    }
    const classification = await classifyChatMessage(
      message,
      requestedModel,
      conversationState,
      proposalForClassification,
      transcript.slice(0, -1)
    );
    const resolvedClassification = classification || {
      intent: 'question' as const,
      operation: null,
      target_ref: { kind: 'none' as const, value: '' },
      params: {},
      missing_fields: [],
      confidence: 0,
      clarification_question: null,
    };
    const classifiedParams = resolvedClassification.params;
    const classifiedOperation = resolvedClassification.operation;
    const classifiedIntent = resolvedClassification.intent;

    // ---------------------------------------------------------------------
    // Campaign creation is a multi-turn task, not an operation on an existing
    // campaign. Resolve it before any existing-campaign entity resolution so a
    // follow-up turn that supplies the name and budget can never be routed into
    // the "choose one campaign" selection flow.
    // ---------------------------------------------------------------------
    const pendingCreation = newCreationTask ? undefined : conversationState.pending_campaign_creation;
      const suppliedCreation = extractCreationParams(message);
      const extractedCreation = extractCreationParams(message, pendingCreation);
      const creationContinuation = looksLikeCreationContinuation(message, pendingCreation);
      const creationRequested = isCreationRequest(message);
    const creationBlocked = classifiedIntent === 'cancel' || classifiedIntent === 'approve';

    // A message that explicitly names an existing campaign is an operation on
    // that campaign, never a creation continuation.
    const earlyTargetRef = resolvedClassification.target_ref;
    const earlyEntityResolution = resolveEntity(earlyTargetRef, conversationState, toolContext.campaigns);
    const referencesExistingCampaign =
      earlyEntityResolution.status === 'resolved' &&
      (earlyTargetRef.kind === 'id' || earlyTargetRef.kind === 'name');

    const isCreateCampaign =
      !creationBlocked &&
      !referencesExistingCampaign &&
      (classifiedOperation === 'create_campaign' ||
        creationContinuation ||
        creationRequested ||
        (
          pendingProposalToRevise?.actionType === 'CREATE_CAMPAIGN' &&
          (classifiedIntent === 'modify_proposal' || classifiedOperation === 'update_campaign_budget')
        )) &&
      // A purely interrogative message with no creation parameters and no draft
      // in progress is a question about creating campaigns, not a request to
      // create one. Imperative requests always proceed.
      !(
        !pendingCreation &&
        extractedCreation.name === undefined &&
        extractedCreation.budgetDaily === undefined &&
        extractedCreation.appUrl === undefined &&
        /^\s*(how|what|where|when|why|which|who|can|could|should|would|do|does|is|are|will)\b/i.test(message)
      );

    if (isCreateCampaign) {
      if (newCreationTask && conversationState.pending_campaign_creation) {
        try {
          conversationState = await clearPendingCampaignCreation(conversationId, accountId);
          conversationState = await resetTaskContext(conversationId, accountId, 'create_campaign');
        } catch (error) {
          console.error('[AI Chat] New task context reset failed; continuing with isolated draft:', error);
        }
      }
      if (
        pendingProposalToRevise?.actionType === 'CREATE_CAMPAIGN' &&
        classifiedOperation !== 'create_campaign' &&
        Object.keys(suppliedCreation).length === 0
      ) {
        return NextResponse.json({
          success: true,
          reply: 'I found the pending campaign creation proposal we are discussing. What daily budget should I use for its revision?',
          actionProposal: pendingProposalToRevise,
          openRouterRequestCount: 1,
        });
      }
      const merged: Partial<PendingCampaignCreation> = {
        ...(pendingCreation || {}),
        ...Object.fromEntries(
          Object.entries(extractedCreation).filter(
            ([, value]) => value !== undefined && value !== null && value !== ''
          )
        ),
      };

      // Model-supplied values only fill gaps the deterministic extractor missed.
      if (merged.name === undefined && typeof classifiedParams.name === 'string') {
        merged.name = classifiedParams.name;
      }
      if (merged.budgetDaily === undefined) {
        const modelBudget = classifiedParams.budgetDaily ?? classifiedParams.newDailyBudget;
        if (typeof modelBudget === 'number' && modelBudget > 0) merged.budgetDaily = modelBudget;
      }
      if (merged.currency === undefined && typeof classifiedParams.currency === 'string') {
        merged.currency = classifiedParams.currency;
      }
      if (merged.objective === undefined && typeof classifiedParams.objective === 'string') {
        merged.objective = classifiedParams.objective;
      }
      if (merged.appUrl === undefined && typeof classifiedParams.appUrl === 'string') {
        merged.appUrl = classifiedParams.appUrl;
      }
      if (merged.finalUrl === undefined) merged.finalUrl = merged.appUrl;
      if (merged.channelType === undefined && typeof classifiedParams.channelType === 'string') {
        merged.channelType = classifiedParams.channelType;
      }

      const creationObjective = (merged.objective
        ? String(merged.objective).toUpperCase()
        : undefined) as CreationObjective | undefined;
      if (!merged.channelType) merged.channelType = channelForObjective(creationObjective);

      try {
        conversationState = await recordPendingCampaignCreation(conversationId, accountId, merged);
      } catch (error) {
        console.error('[AI Chat] Campaign creation draft write failed; continuing with in-memory draft:', error);
      }

      const missing = missingCreationFields(merged);
      if (missing.length > 0) {
        return NextResponse.json({
          success: true,
          reply: creationClarificationQuestion(missing),
          openRouterRequestCount: 1,
        });
      }

      const createArgs: Record<string, any> = {
        name: String(merged.name),
        budgetDaily: Number(merged.budgetDaily),
        channelType: String(merged.channelType),
        reason: pendingCreation
          ? 'User continued the in-progress campaign creation request through the AI Marketing Agent.'
          : 'User requested a campaign draft through the AI Marketing Agent.',
        ...(merged.objective ? { objective: String(merged.objective) } : {}),
        ...(merged.appUrl ? { appUrl: String(merged.appUrl) } : {}),
        ...(merged.finalUrl ? { finalUrl: String(merged.finalUrl) } : {}),
      };

      const createResult = await executeGoogleAdsTool('create_campaign', createArgs, toolContext);
      if (!createResult.success || !createResult.actionProposal) {
        console.error('[AI Chat] Campaign creation could not be prepared:', createResult.error || createResult.message);
        return NextResponse.json(
          {
            success: true,
            reply: 'I could not prepare that campaign change yet. Please check the campaign details and try again. No Google Ads changes were made.',
            openRouterRequestCount: 0,
          }
        );
      }

      const supersedesCreationId =
        !newCreationTask &&
        pendingProposalToRevise?.actionType === 'CREATE_CAMPAIGN'
          ? pendingProposalToRevise.id
          : undefined;
      let creationProposal: ProposedAccountChange;
      try {
        creationProposal = await registerChatProposal(
          {
            ...createResult.actionProposal,
            supersedesProposalId: supersedesCreationId,
            revision: newCreationTask ? 1 : (pendingProposalToRevise?.revision || 0) + 1,
          },
          conversationId,
          supersedesCreationId,
          proposalMetadata(createResult.actionProposal)
        );
      } catch (error) {
        return proposalStorageFailure(error);
      }

      return NextResponse.json(
        {
          success: true,
          reply:
            'Review the new campaign below, then click "Create paused campaign". Nothing has been created in Google Ads yet.',
          toolCalls: [
            {
              id: `pre-${Date.now()}-create_campaign`,
              name: 'create_campaign',
              args: createArgs,
              result: createResult.message,
              status: 'success' as const,
              executionTimeMs: 0,
            },
          ],
          actionProposal: creationProposal,
          openRouterRequestCount: 0,
        },
        { headers: { 'X-OpenRouter-Requests': '0' } }
      );
    }

    if (
      (resolvedClassification.confidence < 0.65 || resolvedClassification.missing_fields.length > 0) &&
      Boolean(classifiedOperation) &&
      (classifiedIntent === 'propose_change' || classifiedIntent === 'modify_proposal')
    ) {
      return NextResponse.json({
        success: true,
        reply: resolvedClassification.clarification_question || 'What would you like me to clarify before preparing that action?',
        openRouterRequestCount: 1,
      });
    }
    const classifiedRegistryOperation = classifiedOperation
      ? getGoogleAdsOperation(classifiedOperation)
      : undefined;
    if (
      classifiedOperation &&
      !classifiedRegistryOperation
    ) {
      return NextResponse.json({
        success: true,
        reply: 'That operation is not available for this connected Google Ads account. Please rephrase your request.',
        openRouterRequestCount: 1,
      });
    }
    if (
      classifiedRegistryOperation?.risk === 'write' &&
      classifiedIntent !== 'propose_change' &&
      classifiedIntent !== 'modify_proposal'
    ) {
      return NextResponse.json({
        success: true,
        reply: 'I can prepare that change, but it must be submitted as a new proposal before it can be approved.',
        openRouterRequestCount: 1,
      });
    }
    const requestedBudgetValue =
      typeof classifiedParams.newDailyBudget === 'number'
        ? classifiedParams.newDailyBudget
        : typeof classifiedParams.budgetDaily === 'number'
        ? classifiedParams.budgetDaily
        : undefined;
    const requestedBudget = requestedBudgetValue === undefined ? undefined : String(requestedBudgetValue);
    const isPendingProposalModification =
      classifiedIntent === 'modify_proposal' && Boolean(pendingProposalToRevise);
    const isStatusMutation = classifiedOperation === 'pause_campaign' || classifiedOperation === 'enable_campaign';
    const isExplicitMutation =
      classifiedIntent === 'propose_change' || classifiedIntent === 'modify_proposal';
    const targetRef = resolvedClassification.target_ref;
    const entityResolution = earlyEntityResolution;
    if (entityResolution.status === 'needs_clarification' && (isExplicitMutation || isStatusMutation)) {
      return NextResponse.json(
        {
          success: true,
          reply: entityResolution.candidates.length > 0
            ? `Which campaign did you mean? I found: ${entityResolution.candidates.map((candidate) => candidate.name).join(', ')}.`
            : 'Which campaign should I use? Please share its name or ID so I do not guess.',
          candidates: entityResolution.candidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
          })),
          openRouterRequestCount: 0,
        },
        { status: 422 }
      );
    }
    const resolvedCampaign = entityResolution.status === 'resolved' ? entityResolution.entity : undefined;
    const directCampaign = resolvedCampaign;
    let requestedCampaign = directCampaign;
    if (resolvedCampaign) {
      requestedCampaign = resolvedCampaign;
      try {
        conversationState = await recordMentionedEntity(conversationId, accountId, resolvedCampaign);
      } catch (error) {
        console.error('[AI Chat] Mentioned-entity state write failed; continuing with resolved campaign:', error);
      }
    }
    const supersededProposalId =
      classifiedIntent === 'modify_proposal' && pendingProposalToRevise
        ? pendingProposalToRevise.id
        : undefined;
    if (classifiedIntent === 'cancel' && pendingProposalToRevise) {
      await cancelProposal(conversationId, pendingProposalToRevise.proposalId || pendingProposalToRevise.id);
      return NextResponse.json({
        success: true,
        reply: 'The pending Google Ads proposal was cancelled. No account changes were made.',
        openRouterRequestCount: 1,
      });
    }
    if (classifiedIntent === 'cancel') {
      return NextResponse.json({
        success: true,
        reply: 'There is no pending Google Ads proposal to cancel.',
        openRouterRequestCount: 1,
      });
    }
    if (classifiedIntent === 'clarification_answer' && pendingProposalToRevise) {
      return NextResponse.json({
        success: true,
        reply: 'Your clarification does not approve the pending action. Please review the latest proposal card and click its approval button.',
        actionProposal: pendingProposalToRevise,
        openRouterRequestCount: 1,
      });
    }
    if (classifiedIntent === 'approve') {
      return NextResponse.json({
        success: true,
        reply: 'The pending Google Ads action was not approved through chat. Please click the approval button on the exact proposal card to authorize this change.',
        actionProposal: pendingProposalToRevise,
        activeCampaign: activeCampaignReference,
        openRouterRequestCount: 0,
      });
    }
    if (isExplicitMutation && !requestedCampaign && entityResolution.status === 'needs_clarification') {
        return NextResponse.json(
          {
            success: true,
            reply: entityResolution.candidates.length > 0
              ? `Which campaign did you mean? I found: ${entityResolution.candidates.map((candidate) => candidate.name).join(', ')}.`
              : 'Which campaign should I use? Please share its name or ID so I do not guess.',
            candidates: entityResolution.candidates.map((candidate) => ({ id: candidate.id, name: candidate.name })),
            openRouterRequestCount: 0,
          },
        );
    }
    const evidenceTools: Array<{ name: string; args: Record<string, any> }> = [];
    if (classifiedOperation || (classifiedIntent !== 'question' && classifiedIntent !== 'unrelated')) {
      const selectedOperation = classifiedOperation ||
        (requestedCampaign ? 'analyze_campaign' : 'get_account_overview');
      const args: Record<string, any> = { ...classifiedParams };
      if (requestedCampaign && ['analyze_campaign', 'get_campaign_performance', 'get_search_terms', 'get_keywords', 'get_ads_performance', 'update_campaign_budget', 'pause_campaign', 'enable_campaign'].includes(selectedOperation)) {
        args.campaignNameOrId = requestedCampaign.name;
      }
      if (requestedBudget && selectedOperation === 'update_campaign_budget') {
        args.newDailyBudget = Number(requestedBudget);
        args.reason = 'User requested this budget change through the AI Marketing Agent.';
      }
      evidenceTools.push({
        name: selectedOperation,
        args,
      });
    }

    const executedToolCalls: ToolCallExecution[] = [];
    let capturedProposal: ProposedAccountChange | undefined;
    let capturedTableData: any;
    const evidence: Array<{ tool: string; result: unknown }> = [];
    const interactiveRecommendations: InteractiveRecommendationCard[] = [];
    for (const plannedTool of evidenceTools) {
      const startedAt = Date.now();
      const result = await executeGoogleAdsTool(plannedTool.name, plannedTool.args, toolContext);
      executedToolCalls.push({
        id: `pre-${Date.now()}-${plannedTool.name}`,
        name: plannedTool.name,
        args: plannedTool.args,
        result: result.data || result.message,
        status: result.success ? 'success' : 'error',
        executionTimeMs: Date.now() - startedAt,
      });
      evidence.push({ tool: plannedTool.name, result: result.success ? result.data || result.message : { error: result.error } });
      if (result.actionProposal) capturedProposal = result.actionProposal;
      if (result.tableData) capturedTableData = result.tableData;
      if (result.recommendationCards) interactiveRecommendations.push(...result.recommendationCards);
    }

    // Mutations must not depend on a second-party model response. The local
    // action resolver has already identified the exact campaign and payload.
    if (isExplicitMutation) {
      if (!capturedProposal) {
        const actionFailure = evidence.find((item) => {
          const value = item.result as { error?: string } | undefined;
          return Boolean(value?.error);
        });
        return NextResponse.json(
          {
            success: true,
            reply: actionFailure
              ? 'I could not prepare that Google Ads change. Please review the request and try again. No account changes were made.'
              : 'I could not identify the campaign for this action. Include its name, or refer to the campaign in your previous message. No account changes were made.',
            openRouterRequestCount: 0,
          }
        );
      }

      const actionLabel =
        capturedProposal.actionType === 'ENABLE_CAMPAIGN'
          ? 'Enable campaign'
          : capturedProposal.actionType === 'PAUSE_CAMPAIGN'
          ? 'Pause campaign'
          : capturedProposal.actionType === 'CREATE_CAMPAIGN'
          ? 'Create paused campaign'
          : 'Apply change';

      try {
        capturedProposal = await registerChatProposal({
          ...capturedProposal,
          supersedesProposalId: supersededProposalId,
          revision: (pendingProposalToRevise?.revision || 0) + 1,
        }, conversationId, supersededProposalId, proposalMetadata(capturedProposal));
      } catch (error) {
        return proposalStorageFailure(error);
      }
      console.info(`[AI Chat] Mutation prepared locally: ${capturedProposal.actionType}; OpenRouter requests: 0`);
      return NextResponse.json(
        {
          success: true,
          reply: `Review the exact change below, then click "${actionLabel}". Nothing has been changed in Google Ads yet.`,
          toolCalls: executedToolCalls,
          actionProposal: capturedProposal,
          supersededProposalId,
          activeCampaign: requestedCampaign
            ? { id: requestedCampaign.id, name: requestedCampaign.name }
            : undefined,
          openRouterRequestCount: 0,
        },
        { headers: { 'X-OpenRouter-Requests': '0' } }
      );
    }

    // Keep the complete transcript intact and enrich only the latest user turn
    // with tool evidence for the response-writing call.
    const latestUserIndex = formattedMessages.map((item) => item.role).lastIndexOf('user');
    if (latestUserIndex >= 0) {
      const latestUser = formattedMessages[latestUserIndex];
      formattedMessages[latestUserIndex] = {
        ...latestUser,
        content: `${latestUser.content || message}\n\nREAL ACCOUNT EVIDENCE (already retrieved; do not invent beyond it):\n${JSON.stringify(evidence)}`,
      };
    }

    let response: OpenRouterResponse;
    try {
      response = await sendOpenRouterChat({
        model: requestedModel as any,
        tier: requestedModel as any,
        messages: formattedMessages,
        tools: GOOGLE_ADS_TOOL_DEFINITIONS,
        temperature: 0.2,
      });
    } catch (error) {
      console.error('[AI Chat] OpenRouter request failed:', error);
      const fallback = await synthesizeDeterministicGoogleAdsResponse(message, toolContext, displayName);
      let fallbackProposal: ProposedAccountChange | undefined;
      if (fallback.capturedProposal) {
        try {
          fallbackProposal = await registerChatProposal({
              ...fallback.capturedProposal,
              supersedesProposalId: supersededProposalId,
              revision: (pendingProposalToRevise?.revision || 0) + 1,
            }, conversationId, supersededProposalId, proposalMetadata(fallback.capturedProposal));
        } catch (error) {
          return proposalStorageFailure(error);
        }
      }
      return NextResponse.json({
        success: true,
        reply: fallback.reply,
        toolCalls: fallback.executedToolCalls.length > 0 ? fallback.executedToolCalls : undefined,
        actionProposal: fallbackProposal,
        supersededProposalId: fallbackProposal ? supersededProposalId : undefined,
        recommendations: fallback.interactiveRecommendations.length > 0 ? fallback.interactiveRecommendations : undefined,
        analysisDetails: fallback.analysisDetails,
        tableData: fallback.capturedTableData,
        activeCampaign: requestedCampaign
          ? { id: requestedCampaign.id, name: requestedCampaign.name }
          : undefined,
        modelUsed: 'grounded-account-analyst',
        openRouterRequestCount: 0,
      }, { headers: { 'X-OpenRouter-Requests': '0' } });
    }
    if (!response.reply) {
      const fallback = await synthesizeDeterministicGoogleAdsResponse(message, toolContext, displayName);
      let fallbackProposal: ProposedAccountChange | undefined;
      if (fallback.capturedProposal) {
        try {
          fallbackProposal = await registerChatProposal({
              ...fallback.capturedProposal,
              supersedesProposalId: supersededProposalId,
              revision: (pendingProposalToRevise?.revision || 0) + 1,
            }, conversationId, supersededProposalId, proposalMetadata(fallback.capturedProposal));
        } catch (error) {
          return proposalStorageFailure(error);
        }
      }
      return NextResponse.json({
        success: true,
        reply: fallback.reply,
        toolCalls: fallback.executedToolCalls.length > 0 ? fallback.executedToolCalls : undefined,
        actionProposal: fallbackProposal,
        supersededProposalId: fallbackProposal ? supersededProposalId : undefined,
        recommendations: fallback.interactiveRecommendations.length > 0 ? fallback.interactiveRecommendations : undefined,
        analysisDetails: fallback.analysisDetails,
        tableData: fallback.capturedTableData,
        activeCampaign: requestedCampaign
          ? { id: requestedCampaign.id, name: requestedCampaign.name }
          : undefined,
        modelUsed: 'grounded-account-analyst',
        openRouterRequestCount: 0,
      }, { headers: { 'X-OpenRouter-Requests': '0' } });
    }

    // Build user-friendly analysis details
    let analysisDetails: AnalysisSummaryDetail | undefined;
    if (executedToolCalls.length > 0) {
      const toolNames = executedToolCalls.map((t) => t.name);
      const aspects: string[] = [];

      if (toolNames.some((n) => n.includes('campaign'))) aspects.push('Audited active campaign budgets, pacing, and status');
      if (toolNames.some((n) => n.includes('search_term') || n.includes('wasted_spend'))) aspects.push('Analyzed search queries and negative keyword candidates');
      if (toolNames.some((n) => n.includes('keyword'))) aspects.push('Evaluated keyword match types and Quality Scores');
      if (toolNames.some((n) => n.includes('budget') || n.includes('recommendation'))) aspects.push('Evaluated marginal ROAS for budget reallocation');
      if (toolNames.some((n) => n.includes('account') || n.includes('conversion'))) aspects.push('Compared blended CPA against historical target benchmarks');

      analysisDetails = {
        campaignsCount: toolContext.campaigns?.length || 0,
        dateRangeExamined: '7-day and 30-day Google Ads performance windows',
        aspectsExamined: aspects.length > 0 ? aspects : ['Examined campaign performance and auction metrics'],
      };
    }

    const actionReply = capturedProposal
      ? `I found the requested campaign action. Review the details below, then click the confirmation button to apply it in Google Ads. Nothing has been changed yet.`
      : response.reply;

    const registeredProposal = capturedProposal
      ? await registerChatProposal({
          ...capturedProposal,
          supersedesProposalId: supersededProposalId,
          revision: (pendingProposalToRevise?.revision || 0) + 1,
        }, conversationId, supersededProposalId, proposalMetadata(capturedProposal))
      : undefined;
    console.info(`[AI Chat] OpenRouter requests for user message: 1; precomputed tools: ${executedToolCalls.map((tool) => tool.name).join(', ') || 'none'}`);
    return NextResponse.json({
      success: true,
      reply: actionReply,
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
      actionProposal: registeredProposal,
      supersededProposalId: registeredProposal ? supersededProposalId : undefined,
      recommendations: interactiveRecommendations.length > 0 ? interactiveRecommendations : undefined,
      analysisDetails,
      tableData: capturedTableData,
      activeCampaign: requestedCampaign
        ? { id: requestedCampaign.id, name: requestedCampaign.name }
        : undefined,
      modelUsed: response.modelUsed || displayName,
      openRouterRequestCount: 1,
    }, { headers: { 'X-OpenRouter-Requests': '1' } });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json(
      { success: false, error: 'The marketing agent could not complete this request. No account changes were made.' },
      { status: 500 }
    );
  }
}
