import {
  sendOpenRouterChat,
  getModelContextLimit,
  getModelDisplayName,
  type ChatCompletionMessage,
  type ToolDefinition,
} from '@/lib/openrouter-service';
import { handleMcpRequest, listMcpTools, type McpServerContext, type McpServerHooks } from '@/lib/mcp/google-ads-server';
import { computeBudget, CONTEXT_FULL_MESSAGE } from './context-budget';
import { buildSystemPrompt, RESERVE_OUTPUT_TOKENS, TOOL_LOOP_LIMIT } from './prompts';
import type { TaskPatch, TaskState } from './task-state';

/**
 * Model-driven tool orchestration.
 *
 * One model call per step. The model decides whether to answer or call a tool;
 * tool results are appended as real `tool` messages so the model sees exactly
 * what happened. History is never truncated.
 */

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

export interface AgentToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  isError: boolean;
  durationMs: number;
}

export interface AgentRunOptions {
  model: string;
  history: AgentMessage[];
  mcpContext: McpServerContext;
  mcpHooks?: McpServerHooks;
  onToolCall?: (record: AgentToolCallRecord) => void;
  /** Durable task state for this conversation, injected into the system prompt. */
  taskState?: TaskState;
  /** Persist a task-state patch. Called when the model uses update_task_state. */
  onTaskUpdate?: (patch: TaskPatch) => Promise<TaskState>;
}

export interface AgentRunResult {
  reply: string;
  toolCalls: AgentToolCallRecord[];
  modelUsed: string;
  contextFull: boolean;
  steps: number;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  /** Messages produced by this turn, in order, for durable persistence. */
  producedMessages: AgentMessage[];
}

function toToolDefinitions(): ToolDefinition[] {
  const mcpTools = listMcpTools().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  // Task memory is an agent capability, not a Google Ads operation, so it lives
  // here rather than in the MCP server.
  const taskTool: ToolDefinition = {
    type: 'function',
    function: {
      name: 'update_task_state',
      description:
        'Record what you have learned about the user\'s current task so it survives to the next message. ' +
        'Call this whenever you learn a campaign, a parameter value, a decision, or a new requirement. ' +
        'Send only what changed; everything else is preserved. ' +
        'Set "missing" to the requirements that are still unresolved (empty array when nothing is missing). ' +
        'Set "unsupported" for constraints the user asked for that Google Ads cannot express.',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['create_campaign', 'update_campaign', 'conversion_goals', 'analysis', 'question'],
            description: 'The kind of task in progress.',
          },
          objective: {
            type: 'string',
            description: 'One sentence describing what the user is trying to achieve.',
          },
          campaignId: {
            type: 'string',
            description: 'Canonical Google Ads campaign ID once the target campaign is known.',
          },
          campaignName: { type: 'string', description: 'Name of the target campaign.' },
          parameters: {
            type: 'object',
            description:
              'Values collected for this task, for example {"name":"Q3 search","budgetDaily":5,"currency":"GBP","channelType":"SEARCH","status":"PAUSED"}.',
          },
          decisions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Decisions the user has explicitly confirmed.',
          },
          missing: {
            type: 'array',
            items: { type: 'string' },
            description: 'Requirements still unresolved. Empty when the task is ready.',
          },
          unsupported: {
            type: 'array',
            items: { type: 'string' },
            description: 'Constraints the user asked for that the API cannot express.',
          },
          clearProposal: {
            type: 'boolean',
            description: 'True when the pending proposal is no longer relevant.',
          },
        },
        additionalProperties: false,
      },
    },
  };

  return [...mcpTools, taskTool];
}

function taskPatchFromArgs(
  args: Record<string, unknown>,
  current: TaskState | undefined
): TaskPatch {
  const patch: TaskPatch = {};

  if (typeof args.kind === 'string') patch.kind = args.kind as TaskPatch['kind'];
  if (typeof args.objective === 'string') patch.objective = args.objective;

  const campaignId = typeof args.campaignId === 'string' ? args.campaignId.replace(/\D/g, '') : '';
  const campaignName = typeof args.campaignName === 'string' ? args.campaignName : '';
  if (campaignId) {
    patch.campaign = {
      campaignId,
      name: campaignName || current?.campaign?.name || '',
      customerId: current?.campaign?.customerId || '',
    };
  } else if (campaignName && current?.campaign) {
    patch.campaign = { ...current.campaign, name: campaignName };
  }

  if (args.parameters && typeof args.parameters === 'object' && !Array.isArray(args.parameters)) {
    patch.parameters = args.parameters as Record<string, unknown>;
  }
  if (Array.isArray(args.decisions)) {
    patch.decisions = args.decisions.filter((item): item is string => typeof item === 'string');
  }
  if (Array.isArray(args.missing)) {
    patch.missing = args.missing.filter((item): item is string => typeof item === 'string');
  }
  if (Array.isArray(args.unsupported)) {
    patch.unsupported = args.unsupported.filter((item): item is string => typeof item === 'string');
  }
  if (args.clearProposal === true) patch.clearProposal = true;

  return patch;
}

function parseToolResult(result: unknown): { payload: unknown; isError: boolean } {
  const typed = result as
    | { content?: Array<{ text?: string }>; isError?: boolean; structuredContent?: unknown }
    | undefined;
  const text = typed?.content?.[0]?.text;
  let payload: unknown = typed?.structuredContent;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // The text is a human-readable summary; keep the structured payload.
      if (payload === undefined) payload = text;
    }
  }

  return { payload, isError: Boolean(typed?.isError) };
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const tools = toToolDefinitions();
  const modelName = getModelDisplayName(options.model);
  const contextLimit = getModelContextLimit(options.model);

  const systemPrompt = buildSystemPrompt({
    accountName: options.mcpContext.accountName,
    customerId: options.mcpContext.customerId,
    currency: options.mcpContext.currency,
    modelName,
    campaignIndex: (options.mcpContext.snapshot?.campaigns || []).map((campaign) => ({
      campaignId: String(campaign.id).replace(/^camp-live-/, ''),
      name: campaign.name,
      status: campaign.status,
      budgetDaily: campaign.budgetDaily,
    })),
    dataFetchedAt: options.mcpContext.snapshot?.fetchedAt,
    taskState: options.taskState,
  });

  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
    ...options.history,
  ];

  const budget = computeBudget({
    systemPrompt,
    toolSchemas: tools,
    messages,
    reserveOutputTokens: RESERVE_OUTPUT_TOKENS,
    contextLimit,
  });

  if (!budget.fits) {
    return {
      reply: CONTEXT_FULL_MESSAGE,
      toolCalls: [],
      modelUsed: modelName,
      contextFull: true,
      steps: 0,
      producedMessages: [],
    };
  }

  const toolCalls: AgentToolCallRecord[] = [];
  const producedMessages: AgentMessage[] = [];
  let usage: AgentRunResult['usage'];
  let steps = 0;

  for (let step = 0; step < TOOL_LOOP_LIMIT; step += 1) {
    steps = step + 1;

    const response = await sendOpenRouterChat({
      model: options.model as never,
      tier: options.model as never,
      messages: messages as ChatCompletionMessage[],
      tools,
      temperature: 0.2,
      maxTokens: RESERVE_OUTPUT_TOKENS,
    });

    if (response.usage) usage = response.usage;

    const assistantMessage: AgentMessage = response.assistantMessage
      ? {
          role: 'assistant',
          content: response.assistantMessage.content ?? null,
          ...(response.assistantMessage.tool_calls
            ? { tool_calls: response.assistantMessage.tool_calls }
            : {}),
        }
      : { role: 'assistant', content: response.reply || '' };

    messages.push(assistantMessage);
    producedMessages.push(assistantMessage);

    const requestedCalls = response.toolCalls || [];
    if (requestedCalls.length === 0) {
      return {
        reply: response.reply || '',
        toolCalls,
        modelUsed: response.modelUsed || modelName,
        contextFull: false,
        steps,
        usage,
        producedMessages,
      };
    }

    for (const call of requestedCalls) {
      const startedAt = Date.now();

      // Task memory is handled by the agent, not the MCP server.
      if (call.name === 'update_task_state') {
        let payload: unknown;
        let isError = false;
        try {
          if (!options.onTaskUpdate) {
            throw new Error('Task state storage is not available.');
          }
          const next = await options.onTaskUpdate(
            taskPatchFromArgs(call.arguments, options.taskState)
          );
          payload = {
            ok: true,
            task: {
              kind: next.kind,
              objective: next.objective,
              campaign: next.campaign || null,
              parameters: next.parameters,
              decisions: next.decisions,
              missing: next.missing,
              unsupported: next.unsupported,
            },
          };
        } catch (error) {
          isError = true;
          payload = {
            code: 'internal',
            message: error instanceof Error ? error.message : 'Task state could not be saved.',
            next_step: 'Continue the conversation without relying on saved task state.',
          };
        }

        const record: AgentToolCallRecord = {
          id: call.id,
          name: call.name,
          arguments: call.arguments,
          result: payload,
          isError,
          durationMs: Date.now() - startedAt,
        };
        toolCalls.push(record);
        options.onToolCall?.(record);

        const toolMessage: AgentMessage = {
          role: 'tool',
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(payload),
        };
        messages.push(toolMessage);
        producedMessages.push(toolMessage);
        continue;
      }

      const rpc = await handleMcpRequest(
        {
          jsonrpc: '2.0',
          id: call.id,
          method: 'tools/call',
          params: { name: call.name, arguments: call.arguments },
        },
        options.mcpContext,
        options.mcpHooks
      );

      const rpcResult =
        'result' in rpc
          ? rpc.result
          : {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    code: 'internal',
                    message: rpc.error.message,
                    next_step: 'Explain the failure and suggest retrying.',
                  }),
                },
              ],
              isError: true,
            };

      const parsed = parseToolResult(rpcResult);
      const record: AgentToolCallRecord = {
        id: call.id,
        name: call.name,
        arguments: call.arguments,
        result: parsed.payload,
        isError: parsed.isError,
        durationMs: Date.now() - startedAt,
      };
      toolCalls.push(record);
      options.onToolCall?.(record);

      const toolMessage: AgentMessage = {
        role: 'tool',
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(parsed.payload),
      };
      messages.push(toolMessage);
      producedMessages.push(toolMessage);
    }
  }

  // The model kept calling tools without answering. Ask it to summarise what it
  // has, without allowing further tool calls.
  const closing = await sendOpenRouterChat({
    model: options.model as never,
    tier: options.model as never,
    messages: [
      ...(messages as ChatCompletionMessage[]),
      {
        role: 'user',
        content:
          'Summarise what you found for the user now, in plain language. Do not call any more tools.',
      },
    ],
    temperature: 0.2,
    maxTokens: RESERVE_OUTPUT_TOKENS,
  });

  const closingMessage: AgentMessage = { role: 'assistant', content: closing.reply || '' };
  producedMessages.push(closingMessage);

  return {
    reply: closing.reply || '',
    toolCalls,
    modelUsed: closing.modelUsed || modelName,
    contextFull: false,
    steps: steps + 1,
    usage,
    producedMessages,
  };
}
