import { NextRequest, NextResponse } from 'next/server';
import { sendOpenRouterChat, ChatCompletionMessage, ModelTier } from '@/lib/openrouter-service';
import { GOOGLE_ADS_TOOL_DEFINITIONS, executeGoogleAdsTool, ToolContext } from '@/lib/google-ads-tools';
import { ProposedAccountChange, ToolCallExecution } from '@/types/adoptimize';

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

    const selectedModel = (model || modelTier || 'gemini');

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

    const systemPrompt = `You are the Google Ads AI Assistant for AdOptimize.app.
You communicate directly like a knowledgeable, senior Google Ads optimization specialist.
You have access to real tools that query the user's connected Google Ads account and suggest or perform optimizations.

RULES:
1. Always ground your answers strictly in the account's actual data returned by the tools.
2. Select and call the appropriate tool whenever the user asks for account data, analysis, or campaign adjustments.
3. Keep answers concise, actionable, and focused on business value (ROAS, CPA, conversions, wasted spend).
4. When suggesting campaign changes or when the user asks to modify budgets, pause campaigns, or reallocate spend, call the corresponding action tool. The tool will generate a confirmation proposal. Explain the proposed change clearly to the user.
5. Never promise guaranteed results.
6. Avoid technical developer language, SDK terms, or internal IDs. Speak in plain advertising and business terms.`;

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
      model: selectedModel,
      tier: selectedModel as any,
      messages: formattedMessages,
      tools: GOOGLE_ADS_TOOL_DEFINITIONS,
      temperature: 0.2,
    });

    let executedToolCalls: ToolCallExecution[] = [];
    let capturedProposal: ProposedAccountChange | undefined;
    let capturedTableData: any;
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

        toolMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(execResult),
        });
      }

      // Second pass to synthesize results into natural response
      const secondResponse = await sendOpenRouterChat({
        model: selectedModel,
        tier: selectedModel as any,
        messages: toolMessages,
        temperature: 0.2,
      });

      if (secondResponse.reply) {
        finalReply = secondResponse.reply;
      }
    }

    return NextResponse.json({
      success: true,
      reply: finalReply || 'I inspected your account data. See the details above.',
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
      actionProposal: capturedProposal,
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
