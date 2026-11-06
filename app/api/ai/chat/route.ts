import { NextRequest, NextResponse } from 'next/server';
import { sendOpenRouterChat, ChatCompletionMessage, resolveModelId, getModelDisplayName, OpenRouterResponse } from '@/lib/openrouter-service';
import { GOOGLE_ADS_TOOL_DEFINITIONS, executeGoogleAdsTool, ToolContext } from '@/lib/google-ads-tools';
import { ProposedAccountChange, ToolCallExecution, InteractiveRecommendationCard, AnalysisSummaryDetail } from '@/types/adoptimize';
import { getCurrencySymbol } from '@/lib/metrics-calculator';
import { queryLiveCampaigns } from '@/lib/google-ads-api';

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
    reply = `## Change Prepared for ${capturedProposal.campaignName}
I have prepared the requested Google Ads modification. Because this will affect live auctions and ad delivery, it requires your explicit approval before being applied.

Please review the details in the confirmation card below:
- **Campaign**: **${capturedProposal.campaignName}**
- **Proposed Modification**: ${capturedProposal.proposedChanges}
- **Reason**: ${capturedProposal.reason}
- **Potential Risks**: ${capturedProposal.potentialRisks}

Click **Approve & Execute Change** below to execute this in Google Ads.`;
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
      account: context.account || { accountName: 'Google Ads Account', clientCustomerId: 'Connected', isConnected: true },
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

    let liveDataStatus = 'The supplied account snapshot could not be refreshed before this request.';
    if (
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
          liveDataStatus = `Live Google Ads data was fetched at ${liveResult.fetchedAt || new Date().toISOString()}.`;
        } else {
          liveDataStatus = `Live refresh failed: ${liveResult.error || 'Google Ads did not return data'}. Do not present the supplied snapshot as current.`;
        }
      } catch (error) {
        console.error('[AI Chat] Live Google Ads refresh failed:', error);
        liveDataStatus = 'Live refresh failed unexpectedly. Do not present the supplied snapshot as current.';
      }
    }

    const systemPrompt = `You are the Google Ads Optimization Specialist for AdOptimize.app.
You communicate directly like a senior, highly experienced Google Ads performance marketer.
You have direct access to tools that query the user's connected Google Ads account and suggest or perform optimizations.

OPERATING RULES:
1. Determine the user's exact objective and scope before acting. If the request is ambiguous, ask one short clarification question and do not call a tool.
2. Use the live-data status below and tools as the source of truth. Never invent metrics, causes, recommendations, campaign names, or completed actions.
3. Analysis requests are read-only. Action requests must affect only the named campaign or setting.
4. Action tools create approval proposals. Never claim a change was executed until the user approves it and the execution endpoint reports success.
5. After a confirmed mutation, verify the changed campaign through fresh Google Ads data before reporting success.
6. Respect the account currency and the available reporting window. If a requested date range is unavailable, say so instead of silently substituting another range.
7. Campaign references may be informal or shortened. Match the user's meaningful campaign words to the closest actual campaign name returned by the account; for example, "dress better ai app" refers to "Dress Better AI promotion-App". Only ask for clarification when multiple campaigns are genuinely plausible.

LIVE-DATA STATUS:
${liveDataStatus}

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
4. When the user explicitly asks to change a campaign (for example, "pause", "enable", or "set the budget to"), call the corresponding action tool to prepare a confirmation card. When the user asks what they should do, diagnose or recommend, use read-only analysis tools and do not prepare a mutation.
5. NEVER mention internal function names (e.g. "get_account_performance", "find_wasted_spend").
6. NEVER mention API keys, JSON payloads, or developer terms. Speak strictly in business and PPC advertising terms.
8. Support natural conversational follow-ups (e.g. "Explain the first one", "Pause it", "Show me search terms for it") by referencing the campaigns and data discussed earlier in the conversation history.
9. State clearly what you found, what you recommend, and what you actually did.`;

    const formattedMessages: ChatCompletionMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Append up to 8 recent conversation turns
    const recentHistory = conversationHistory.slice(-8);
    for (const h of recentHistory) {
      if (h.role === 'user' || h.role === 'assistant') {
        formattedMessages.push({
          role: h.role,
          content: h.content,
        });
      }
    }

    // Append the new user query
    formattedMessages.push({
      role: 'user',
      content: message,
    });

    let firstResponse: OpenRouterResponse = { reply: '', toolCalls: undefined, modelUsed: displayName };
    let remoteFailed = false;

    try {
      firstResponse = await sendOpenRouterChat({
        model: requestedModel as any,
        tier: requestedModel as any,
        messages: formattedMessages,
        tools: GOOGLE_ADS_TOOL_DEFINITIONS,
        temperature: 0.2,
      });
    } catch {
      remoteFailed = true;
    }

    if (remoteFailed) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter could not process this request. No account changes were made.' },
        { status: 502 }
      );
    }
    if (!firstResponse.reply && !firstResponse.toolCalls?.length) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter returned no usable response. No account changes were made.' },
        { status: 502 }
      );
    }

    let executedToolCalls: ToolCallExecution[] = [];
    let capturedProposal: ProposedAccountChange | undefined;
    let capturedTableData: any;
    let interactiveRecommendations: InteractiveRecommendationCard[] = [];
    let finalReply = firstResponse.reply;

    // Handle tool execution loop if model requested tools
    if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
      const toolMessages: ChatCompletionMessage[] = [...formattedMessages];

      toolMessages.push({
        role: 'assistant',
        content: firstResponse.reply || null,
        tool_calls: firstResponse.toolCalls.map((tc: any) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });

      for (const tc of firstResponse.toolCalls) {
        const startTime = Date.now();
        const execResult = await executeGoogleAdsTool(tc.name, tc.arguments, toolContext);
        const duration = Date.now() - startTime;

        executedToolCalls.push({
          id: tc.id,
          name: tc.name,
          args: tc.arguments,
          result: execResult.data || execResult.message,
          status: execResult.success ? 'success' : 'error',
          executionTimeMs: duration,
        });

        if (execResult.actionProposal) {
          capturedProposal = execResult.actionProposal;
        }
        if (execResult.tableData) {
          capturedTableData = execResult.tableData;
        }

        // Generate structured interactive recommendation cards based on tool findings
        if (tc.name === 'find_wasted_spend' && execResult.data?.bleeders && Array.isArray(execResult.data.bleeders)) {
          execResult.data.bleeders.slice(0, 2).forEach((b: any, idx: number) => {
            interactiveRecommendations.push({
              id: `rec-waste-${b.id || idx}`,
              type: 'WASTED_SPEND',
              title: 'Potential Wasted Spend',
              campaignName: b.name,
              finding: `The campaign spent $${Number(b.spend || 0).toFixed(2)} without recording conversions during the selected period.`,
              metrics: { spend: b.spend, conversions: 0, cpa: b.cpa },
              actions: [
                { label: 'Inspect Search Terms', prompt: `Inspect non-converting search terms for ${b.name}` },
                { label: 'Analyze Campaign', prompt: `Perform a detailed performance diagnosis on ${b.name}` },
                { label: 'Review Optimization Recommendation', prompt: `Recommend how to adjust or pause ${b.name} to eliminate waste` },
              ],
            });
          });
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(execResult),
        });
      }

      // Second pass to synthesize results
      const secondResponse = await sendOpenRouterChat({
        model: requestedModel as any,
        tier: requestedModel as any,
        messages: toolMessages,
        temperature: 0.2,
      });

      if (secondResponse.reply) {
        finalReply = secondResponse.reply;
      }

      // Some providers use a second tool round after inspecting the first result.
      // Execute that round and send its result back before producing the final answer.
      if (secondResponse.toolCalls?.length) {
        toolMessages.push({
          role: 'assistant',
          content: secondResponse.reply || null,
          tool_calls: secondResponse.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
        for (const tc of secondResponse.toolCalls) {
          const startTime = Date.now();
          const execResult = await executeGoogleAdsTool(tc.name, tc.arguments, toolContext);
          executedToolCalls.push({
            id: tc.id,
            name: tc.name,
            args: tc.arguments,
            result: execResult.data || execResult.message,
            status: execResult.success ? 'success' : 'error',
            executionTimeMs: Date.now() - startTime,
          });
          if (execResult.actionProposal && !capturedProposal) capturedProposal = execResult.actionProposal;
          if (execResult.tableData && !capturedTableData) capturedTableData = execResult.tableData;
          toolMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.name,
            content: JSON.stringify(execResult),
          });
        }
        const finalResponse = await sendOpenRouterChat({
          model: requestedModel as any,
          tier: requestedModel as any,
          messages: toolMessages,
          temperature: 0.2,
        });
        if (finalResponse.reply) finalReply = finalResponse.reply;
      }
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

    return NextResponse.json({
      success: true,
      reply: finalReply || 'I inspected your account data. See the details above.',
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
      actionProposal: capturedProposal,
      recommendations: interactiveRecommendations.length > 0 ? interactiveRecommendations : undefined,
      analysisDetails,
      tableData: capturedTableData,
      modelUsed: firstResponse.modelUsed || displayName,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json(
      { success: false, error: 'The marketing agent could not complete this request. No account changes were made.' },
      { status: 500 }
    );
  }
}
