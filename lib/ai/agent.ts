import {
  getModelDisplayName,
  getModelLimits,
  sendOpenRouterChat,
  type ChatCompletionMessage,
  type OpenRouterResponse,
} from '@/lib/openrouter-service';
import { newRequestStats, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { stableSerialize } from './proposals';
import { computeBudget, CONTEXT_FULL_MESSAGE, estimateTokens, type BudgetBreakdown } from './context-budget';
import { buildSystemPrompt } from './prompts';
import { noteResources, type AgentState } from './agent-state';
import { executeTool, getToolDefinitions, getToolKind, type ToolKind, type ToolRuntime } from './tools';

/**
 * Model-driven agent loop.
 *
 * The selected model is the reasoning engine: each step it either answers or
 * requests tools through native function calling. The backend executes tools,
 * returns structured results as real `tool` messages, and enforces the limits
 * that keep cost and latency predictable: a bounded number of model calls and
 * tool calls, a wall-clock deadline, a full-context budget, and suppression of
 * identical repeated calls within a turn. History is never truncated or
 * summarised; if it no longer fits, the user is asked to start a new chat.
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
  kind: ToolKind | 'unknown';
  arguments: Record<string, unknown>;
  result: unknown;
  isError: boolean;
  durationMs: number;
  duplicate?: boolean;
}

export interface AgentLimits {
  maxModelCalls: number;
  maxToolCalls: number;
  maxProposalsPerTurn: number;
  deadlineMs: number;
  outputReserveTokens: number;
}

export const DEFAULT_LIMITS: AgentLimits = {
  maxModelCalls: 6,
  maxToolCalls: 14,
  maxProposalsPerTurn: 6,
  deadlineMs: 52_000,
  outputReserveTokens: 2048,
};

export type StopReason =
  | 'answered'
  | 'context_full'
  | 'context_exhausted'
  | 'step_limit'
  | 'tool_limit'
  | 'deadline'
  | 'model_error';

export interface AgentUsage {
  modelCalls: number;
  toolCalls: number;
  duplicateCallsAvoided: number;
  googleAdsRequests: number;
  googleAdsCacheHits: number;
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
}

export interface AgentRunOptions {
  model: string;
  history: AgentMessage[];
  ads: GoogleAdsContext;
  state: AgentState;
  saveProposal?: ToolRuntime['saveProposal'];
  onToolCall?: (record: AgentToolCallRecord) => void;
  limits?: Partial<AgentLimits>;
  now?: Date;
}

export interface AgentRunResult {
  reply: string;
  toolCalls: AgentToolCallRecord[];
  modelUsed: string;
  contextFull: boolean;
  stopReason: StopReason;
  steps: number;
  usage: AgentUsage;
  budget: BudgetBreakdown;
  state: AgentState;
  /** Messages produced by this turn, in order, for durable persistence. */
  producedMessages: AgentMessage[];
}

const CLOSING_INSTRUCTIONS: Record<string, string> = {
  step_limit: 'You have reached the analysis step limit for this message.',
  tool_limit: 'You have reached the data-retrieval limit for this message.',
  deadline: 'You are running out of time for this message.',
  empty: 'Your previous response was empty.',
};

function toolMessage(id: string, name: string, payload: unknown): AgentMessage {
  return { role: 'tool', tool_call_id: id, name, content: JSON.stringify(payload) };
}

function limitError(code: 'limit_reached' | 'repeated_call', message: string, nextStep: string) {
  return { error: { code, message, next_step: nextStep } };
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const limits: AgentLimits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const startedAt = Date.now();
  const tools = getToolDefinitions();
  const modelName = getModelDisplayName(options.model);
  const modelLimits = await getModelLimits(options.model);
  const outputReserve = Math.min(limits.outputReserveTokens, modelLimits.maxCompletionTokens || limits.outputReserveTokens);

  options.ads.stats = options.ads.stats || newRequestStats();
  let state = options.state;

  const runtime: ToolRuntime = {
    ads: options.ads,
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    saveProposal: options.saveProposal,
  };

  const today = (options.now || new Date()).toISOString().slice(0, 10);
  const systemPrompt = buildSystemPrompt({
    accountName: options.ads.accountName,
    customerId: options.ads.customerId,
    currency: options.ads.currency,
    today,
    state,
  });

  const messages: AgentMessage[] = [{ role: 'system', content: systemPrompt }, ...options.history];
  const budgetFor = (list: AgentMessage[]) =>
    computeBudget({
      systemPrompt: '',
      toolSchemas: tools,
      messages: list,
      reserveOutputTokens: outputReserve,
      contextLimit: modelLimits.contextLength,
    });

  const usage: AgentUsage = {
    modelCalls: 0,
    toolCalls: 0,
    duplicateCallsAvoided: 0,
    googleAdsRequests: 0,
    googleAdsCacheHits: 0,
    promptTokens: 0,
    completionTokens: 0,
  };
  const toolCalls: AgentToolCallRecord[] = [];
  const producedMessages: AgentMessage[] = [];
  const callCache = new Map<string, { payload: unknown; isError: boolean }>();
  let proposalsThisTurn = 0;
  let budget = budgetFor(messages);
  let modelUsed = modelName;

  const finish = (reply: string, stopReason: StopReason, contextFull = false): AgentRunResult => {
    usage.googleAdsRequests = options.ads.stats?.requests || 0;
    usage.googleAdsCacheHits = options.ads.stats?.cacheHits || 0;
    return {
      reply,
      toolCalls,
      modelUsed,
      contextFull,
      stopReason,
      steps: usage.modelCalls,
      usage,
      budget,
      state,
      producedMessages,
    };
  };

  if (!budget.fits) return finish(CONTEXT_FULL_MESSAGE, 'context_full', true);

  const remaining = () => limits.deadlineMs - (Date.now() - startedAt);

  const callModel = async (extra: AgentMessage[] = [], toolChoice?: 'none'): Promise<OpenRouterResponse> => {
    const response = await sendOpenRouterChat({
      model: options.model as never,
      tier: options.model as never,
      messages: [...messages, ...extra] as ChatCompletionMessage[],
      tools,
      toolChoice,
      temperature: 0.2,
      maxTokens: outputReserve,
      timeoutMs: Math.max(5_000, Math.min(45_000, remaining() - 2_000)),
    });
    usage.modelCalls += 1;
    usage.promptTokens += response.usage?.promptTokens || 0;
    usage.completionTokens += response.usage?.completionTokens || 0;
    if (typeof response.usage?.cost === 'number') usage.costUsd = (usage.costUsd || 0) + response.usage.cost;
    if (response.modelUsed) modelUsed = response.modelUsed;
    return response;
  };

  const closing = async (reason: keyof typeof CLOSING_INSTRUCTIONS, stopReason: StopReason): Promise<AgentRunResult> => {
    const proposals = toolCalls.filter((call) => call.kind === 'write' && !call.isError).length;
    if (remaining() < 6_000 || !budgetFor(messages).fits) {
      const reply = proposals
        ? 'I prepared the change shown on the approval card, but ran out of time to finish the rest of the analysis. Ask me to continue and I will pick up from here.'
        : 'I ran out of time before finishing this analysis. Nothing in your account was changed. Ask me to continue, or narrow the question, and I will pick up from here.';
      producedMessages.push({ role: 'assistant', content: reply });
      return finish(reply, stopReason);
    }
    const instruction: AgentMessage = {
      role: 'user',
      content: `[System note, not from the user] ${CLOSING_INSTRUCTIONS[reason]} Do not call tools. Reply to the user now using only what you already know: give the answer or findings so far, state clearly what is still unverified or remaining, and offer to continue.`,
    };
    try {
      const response = await callModel([instruction], 'none');
      const reply = response.reply?.trim() || 'I could not finish this analysis. Nothing in your account was changed; ask me to continue.';
      producedMessages.push({ role: 'assistant', content: reply });
      return finish(reply, stopReason);
    } catch {
      const reply = 'I could not finish this analysis. Nothing in your account was changed; ask me to continue.';
      producedMessages.push({ role: 'assistant', content: reply });
      return finish(reply, 'model_error');
    }
  };

  for (let step = 0; step < limits.maxModelCalls; step += 1) {
    if (remaining() < 8_000) return closing('deadline', 'deadline');

    budget = budgetFor(messages);
    if (!budget.fits) {
      const reply =
        'The data gathered for this question no longer fits in this conversation\'s context window. Nothing has been removed from the conversation and nothing in your account was changed. Please start a new chat (or ask a narrower question) to continue.';
      producedMessages.push({ role: 'assistant', content: reply });
      return finish(reply, 'context_exhausted', true);
    }

    let response: OpenRouterResponse;
    try {
      response = await callModel();
    } catch (error) {
      if (usage.modelCalls === 0 && toolCalls.length === 0) throw error;
      const proposals = toolCalls.filter((call) => call.kind === 'write' && !call.isError).length;
      const reply = proposals
        ? 'The AI model stopped responding partway through. A proposal was prepared and is waiting on its approval card; nothing has been applied. Ask me to continue for the rest.'
        : 'The AI model stopped responding partway through this request. Nothing in your account was changed. Please try again.';
      producedMessages.push({ role: 'assistant', content: reply });
      return finish(reply, 'model_error');
    }

    const requested = response.toolCalls || [];
    const assistant: AgentMessage = {
      role: 'assistant',
      content: response.assistantMessage?.content ?? (response.reply || null),
      ...(response.assistantMessage?.tool_calls?.length ? { tool_calls: response.assistantMessage.tool_calls } : {}),
    };

    if (requested.length === 0) {
      const reply = (response.reply || '').trim();
      if (!reply) return closing('empty', 'answered');
      messages.push(assistant);
      producedMessages.push(assistant);
      return finish(reply, 'answered');
    }

    messages.push(assistant);
    producedMessages.push(assistant);

    // Read tools in the same step are independent; run them concurrently.
    const outcomes = new Map<string, { payload: unknown; isError: boolean; kind: ToolKind | 'unknown'; duplicate?: boolean; durationMs: number }>();
    const reads: Array<Promise<void>> = [];

    const handle = async (call: (typeof requested)[number]) => {
      const started = Date.now();
      const kind = getToolKind(call.name) || 'unknown';
      const record = (payload: unknown, isError: boolean, duplicate?: boolean) =>
        outcomes.set(call.id, { payload, isError, kind, duplicate, durationMs: Date.now() - started });

      if (call.argumentError) {
        record(
          { error: { code: 'invalid_argument', message: call.argumentError, next_step: 'Call the tool again with a valid JSON object.' } },
          true
        );
        return;
      }
      if (usage.toolCalls >= limits.maxToolCalls) {
        record(limitError('limit_reached', 'The tool-call limit for this message was reached.', 'Answer with what you have and offer to continue.'), true);
        return;
      }
      const signature = `${call.name}:${stableSerialize(call.arguments || {})}`;
      const previous = kind === 'memory' ? undefined : callCache.get(signature);
      if (previous) {
        usage.duplicateCallsAvoided += 1;
        record(
          previous.isError
            ? limitError('repeated_call', 'This exact call already failed earlier in this message.', 'Do not repeat it unchanged: correct the input, try a different approach, or explain the failure.')
            : { duplicate: true, note: 'Identical to an earlier call in this message; use that result.' },
          previous.isError,
          true
        );
        return;
      }
      if (kind === 'write' && proposalsThisTurn >= limits.maxProposalsPerTurn) {
        record(limitError('limit_reached', 'Too many changes were prepared in one message.', 'Ask the user to review the prepared proposals first.'), true);
        return;
      }

      usage.toolCalls += 1;
      if (kind === 'write') proposalsThisTurn += 1;
      const outcome = await executeTool(call.name, call.arguments || {}, runtime);
      if (outcome.resources?.length) state = noteResources(state, outcome.resources);
      if (kind !== 'memory') callCache.set(signature, { payload: outcome.payload, isError: outcome.isError });
      record(outcome.payload, outcome.isError);
    };

    for (const call of requested) {
      if (getToolKind(call.name) === 'read') reads.push(handle(call));
    }
    await Promise.all(reads);
    for (const call of requested) {
      if (getToolKind(call.name) !== 'read') await handle(call);
    }

    for (const call of requested) {
      const outcome = outcomes.get(call.id)!;
      const record: AgentToolCallRecord = {
        id: call.id,
        name: call.name,
        kind: outcome.kind,
        arguments: call.arguments || {},
        result: outcome.payload,
        isError: outcome.isError,
        durationMs: outcome.durationMs,
        ...(outcome.duplicate ? { duplicate: true } : {}),
      };
      toolCalls.push(record);
      options.onToolCall?.(record);
      const message = toolMessage(call.id, call.name, outcome.payload);
      messages.push(message);
      producedMessages.push(message);
    }

    // Saving memory alongside a finished reply needs no further model call.
    const memoryOnly = requested.every((call) => getToolKind(call.name) === 'memory');
    const text = (response.reply || '').trim();
    if (memoryOnly && text && requested.every((call) => !outcomes.get(call.id)?.isError)) {
      return finish(text, 'answered');
    }

    if (usage.toolCalls >= limits.maxToolCalls) return closing('tool_limit', 'tool_limit');
  }

  return closing('step_limit', 'step_limit');
}

/** Approximate size of a payload in tokens, used for observability. */
export function payloadTokens(payload: unknown): number {
  return estimateTokens(payload);
}
