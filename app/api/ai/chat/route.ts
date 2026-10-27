import { NextRequest, NextResponse } from 'next/server';
import { sendOpenRouterChat, ChatCompletionMessage } from '@/lib/openrouter-service';
import { GOOGLE_ADS_TOOL_DEFINITIONS, executeGoogleAdsTool, ToolContext } from '@/lib/google-ads-tools';
import { ProposedAccountChange, ToolCallExecution, InteractiveRecommendationCard, AnalysisSummaryDetail } from '@/types/adoptimize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      model = 'gemini',
      modelTier,
      context = {},
    } = body;

    const selectedModel = (modelTier || model || 'gemini');

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

    const systemPrompt = `You are the Google Ads Optimization Specialist for AdOptimize.app.
You communicate directly like a senior, highly experienced Google Ads performance marketer.
You have direct access to tools that query the user's connected Google Ads account and suggest or perform optimizations.

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
4. When suggesting campaign changes (e.g. updating daily budget, pausing a campaign, or enabling a campaign), always call the corresponding action tool (e.g. update_campaign_budget, pause_campaign, enable_campaign). This generates an interactive confirmation card for the user's explicit approval.
5. NEVER mention internal function names (e.g. "get_account_performance", "find_wasted_spend").
6. NEVER mention API keys, JSON payloads, or developer terms. Speak strictly in business and PPC advertising terms.
7. Support natural conversational follow-ups (e.g. "Explain the first one", "Pause it", "Show me search terms for it") by referencing the campaigns and data discussed earlier in the conversation history.`;

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

    // First model pass with tool definitions
    const firstResponse = await sendOpenRouterChat({
      model: selectedModel as any,
      tier: selectedModel as any,
      messages: formattedMessages,
      tools: GOOGLE_ADS_TOOL_DEFINITIONS,
      temperature: 0.2,
    });

    let executedToolCalls: ToolCallExecution[] = [];
    let capturedProposal: ProposedAccountChange | undefined;
    let capturedTableData: any;
    let interactiveRecommendations: InteractiveRecommendationCard[] = [];
    let finalReply = firstResponse.reply;

    // Handle tool execution loop if model requested tools
    if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
      const toolMessages: ChatCompletionMessage[] = [...formattedMessages];

      // Add assistant tool calls message
      toolMessages.push({
        role: 'assistant',
        content: firstResponse.reply || null,
        tool_calls: firstResponse.toolCalls.map((tc) => ({
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
              metrics: {
                spend: b.spend,
                conversions: 0,
                cpa: b.cpa,
              },
              actions: [
                { label: 'Inspect Search Terms', prompt: `Inspect non-converting search terms for ${b.name}` },
                { label: 'Analyze Campaign', prompt: `Perform a detailed performance diagnosis on ${b.name}` },
                { label: 'Review Optimization Recommendation', prompt: `Recommend how to adjust or pause ${b.name} to eliminate waste` },
              ],
            });
          });
        } else if (tc.name === 'identify_underperforming_campaigns' && Array.isArray(execResult.data)) {
          execResult.data.slice(0, 2).forEach((c: any, idx: number) => {
            interactiveRecommendations.push({
              id: `rec-under-${c.id || idx}`,
              type: 'UNDERPERFORMING_CAMPAIGN',
              title: 'Underperforming Campaign',
              campaignName: c.name,
              finding: `CPA is elevated at $${Number(c.cpa || 0).toFixed(2)} with ${Number(c.conversions || 0)} conversions from $${Number(c.spend || 0).toFixed(2)} spend.`,
              metrics: {
                spend: c.spend,
                conversions: c.conversions,
                cpa: c.cpa,
                roas: c.roas,
              },
              actions: [
                { label: 'Inspect Search Terms', prompt: `Inspect search terms and negative keyword candidates for ${c.name}` },
                { label: 'Analyze Campaign', prompt: `Diagnose why CPA is elevated on ${c.name}` },
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

      // Second pass to synthesize results into structured, professional markdown
      const secondResponse = await sendOpenRouterChat({
        model: selectedModel as any,
        tier: selectedModel as any,
        messages: toolMessages,
        temperature: 0.2,
      });

      if (secondResponse.reply) {
        finalReply = secondResponse.reply;
      }
    }

    // Build user-friendly analysis details (No technical function names or credentials)
    let analysisDetails: AnalysisSummaryDetail | undefined;
    if (executedToolCalls.length > 0) {
      const toolNames = executedToolCalls.map((t) => t.name);
      const aspects: string[] = [];

      if (toolNames.some((n) => n.includes('campaign'))) {
        aspects.push('Audited active campaign budgets, pacing, and status');
      }
      if (toolNames.some((n) => n.includes('search_term') || n.includes('wasted_spend'))) {
        aspects.push('Analyzed search queries and negative keyword candidates');
      }
      if (toolNames.some((n) => n.includes('keyword'))) {
        aspects.push('Evaluated keyword match types and Quality Scores');
      }
      if (toolNames.some((n) => n.includes('budget') || n.includes('recommendation'))) {
        aspects.push('Evaluated marginal ROAS for budget reallocation');
      }
      if (toolNames.some((n) => n.includes('account') || n.includes('conversion'))) {
        aspects.push('Compared blended CPA against historical target benchmarks');
      }

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
      modelUsed: firstResponse.modelUsed,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json(
      { error: err.message || 'Chat service encountered an error' },
      { status: 500 }
    );
  }
}
