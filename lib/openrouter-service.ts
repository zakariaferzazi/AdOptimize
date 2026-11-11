export type SupportedModel = 'deepseek' | 'chatgpt' | 'gemini';
export type ModelTier = SupportedModel | 'fast' | 'analysis' | 'advanced';

export interface ModelConfig {
  id: string;
  name: string;
  model: SupportedModel;
  description: string;
  provider: string;
  badge: string;
}

export function getAvailableModels(): ModelConfig[] {
  return [
    { id: process.env.MODEL_DEEPSEEK || 'deepseek/deepseek-chat', name: 'DeepSeek', model: 'deepseek', provider: 'DeepSeek', badge: 'Reasoning & Math', description: 'Reasoning and campaign diagnostics.' },
    { id: process.env.MODEL_CHATGPT || 'openai/gpt-4o-mini', name: 'ChatGPT', model: 'chatgpt', provider: 'OpenAI', badge: 'OpenAI', description: 'Campaign strategy and performance analysis.' },
    { id: process.env.MODEL_GEMINI || 'google/gemini-2.5-flash', name: 'Gemini', model: 'gemini', provider: 'Google', badge: 'Google', description: 'Fast account analysis and campaign assistance.' },
  ];
}

export function resolveModelId(modelOrTier: string = 'gemini'): string {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'advanced' || normalized === 'analysis') return process.env.MODEL_DEEPSEEK || 'deepseek/deepseek-chat';
  if (normalized === 'chatgpt' || normalized === 'balanced') return process.env.MODEL_CHATGPT || 'openai/gpt-4o-mini';
  return process.env.MODEL_GEMINI || 'google/gemini-2.5-flash';
}

export function getModelDisplayName(modelOrTier: string = 'gemini'): string {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'advanced' || normalized === 'analysis') return 'DeepSeek';
  if (normalized === 'chatgpt' || normalized === 'balanced') return 'ChatGPT';
  return 'Fast Model';
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, any> };
}

export interface OpenRouterChatOptions {
  model?: SupportedModel;
  tier?: ModelTier;
  modelOverride?: string;
  messages: ChatCompletionMessage[];
  tools?: ToolDefinition[];
  /** "none" forbids tool calls for this request (used for the closing summary). */
  toolChoice?: 'auto' | 'none';
  temperature?: number;
  maxTokens?: number;
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  /** Set when the model produced arguments that are not valid JSON. */
  argumentError?: string;
}

export interface OpenRouterUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Billed cost in USD as reported by OpenRouter. */
  cost?: number;
}

export interface OpenRouterResponse {
  reply: string;
  toolCalls?: ParsedToolCall[];
  modelUsed: string;
  finishReason?: string;
  usage?: OpenRouterUsage;
  /** Raw assistant message so tool calls can be echoed back verbatim. */
  assistantMessage?: ChatCompletionMessage;
}

export class OpenRouterError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.retryable = retryable;
  }
}

const MODEL_CONTEXT_LIMITS: Record<SupportedModel, number> = {
  deepseek: 32768,
  chatgpt: 128000,
  gemini: 1000000,
};

function normalizeTier(modelOrTier: string): SupportedModel {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'advanced' || normalized === 'analysis') return 'deepseek';
  if (normalized === 'chatgpt' || normalized === 'balanced') return 'chatgpt';
  return 'gemini';
}

/** Conservative fallback context window when the live model list is unavailable. */
export function getModelContextLimit(modelOrTier: string = 'gemini'): number {
  return MODEL_CONTEXT_LIMITS[normalizeTier(modelOrTier)];
}

export interface ModelLimits {
  contextLength: number;
  maxCompletionTokens?: number;
  source: 'openrouter' | 'fallback';
}

const limitsCache = new Map<string, { limits: ModelLimits; expiresAt: number }>();
const LIMITS_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Real context window of the configured model, from OpenRouter's model list.
 * Cached per isolate; falls back to a conservative table when unavailable.
 */
export async function getModelLimits(modelOrTier: string = 'gemini'): Promise<ModelLimits> {
  const modelId = resolveModelId(modelOrTier);
  const fallback: ModelLimits = { contextLength: getModelContextLimit(modelOrTier), source: 'fallback' };
  if (!modelId || !getOpenRouterApiKey()) return fallback;

  const cached = limitsCache.get(modelId);
  if (cached && cached.expiresAt > Date.now()) return cached.limits;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://openrouter.ai/api/v1/models', { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      data?: Array<{ id: string; context_length?: number; top_provider?: { context_length?: number; max_completion_tokens?: number } }>;
    };
    const entry = data.data?.find((model) => model.id === modelId);
    const contextLength = entry?.top_provider?.context_length || entry?.context_length;
    if (!contextLength) return fallback;
    const limits: ModelLimits = {
      contextLength,
      maxCompletionTokens: entry?.top_provider?.max_completion_tokens || undefined,
      source: 'openrouter',
    };
    limitsCache.set(modelId, { limits, expiresAt: Date.now() + LIMITS_TTL_MS });
    return limits;
  } catch {
    return fallback;
  }
}

export function getOpenRouterApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY;
  return key?.trim() || undefined;
}

function parseArguments(raw: unknown): { args: Record<string, any>; error?: string } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { args: raw as Record<string, any> };
  if (typeof raw !== 'string' || !raw.trim()) return { args: {} };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { args: parsed }
      : { args: {}, error: 'Tool arguments must be a JSON object.' };
  } catch {
    // Some providers wrap arguments in code fences; try once without them.
    const unwrapped = raw.replace(/^```(?:json)?\s*|\s*```$/g, '');
    try {
      const parsed = JSON.parse(unwrapped);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { args: parsed };
    } catch {
      // fall through
    }
    return { args: {}, error: 'Tool arguments were not valid JSON.' };
  }
}

async function postChat(body: Record<string, unknown>, apiKey: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://adoptimize.app',
        'X-Title': 'AdOptimize Google Ads Suite',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      const retryable = response.status === 429 || response.status >= 500;
      throw new OpenRouterError(`OpenRouter request failed (${response.status}): ${detail}`, response.status, retryable);
    }
    const data = await response.json();
    if (data?.error) {
      const status = Number(data.error.code) || 502;
      throw new OpenRouterError(
        `OpenRouter provider error: ${String(data.error.message || 'unknown').slice(0, 300)}`,
        status,
        status === 429 || status >= 500
      );
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new OpenRouterError(`The model did not respond within ${Math.round(timeoutMs / 1000)} seconds.`, 504, false);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendOpenRouterChat(options: OpenRouterChatOptions): Promise<OpenRouterResponse> {
  const chosenModel = options.model || (options.tier as SupportedModel) || 'gemini';
  const targetModel = options.modelOverride || resolveModelId(chosenModel);
  const modelUsed = getModelDisplayName(chosenModel);
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured.');
  if (!targetModel) throw new Error(`No model is configured for ${modelUsed}. Set the matching MODEL_* Cloudflare variable.`);

  const body: Record<string, unknown> = {
    model: targetModel,
    messages: options.messages,
    tools: options.tools?.length ? options.tools : undefined,
    tool_choice: options.tools?.length && options.toolChoice ? options.toolChoice : undefined,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 2048,
    usage: { include: true },
  };

  const timeoutMs = options.timeoutMs ?? 50_000;
  let data: any;
  try {
    data = await postChat(body, apiKey, timeoutMs);
  } catch (error) {
    if (!(error instanceof OpenRouterError) || !error.retryable || timeoutMs < 15_000) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    data = await postChat(body, apiKey, Math.max(5_000, timeoutMs - 10_000));
  }

  const choice = data.choices?.[0];
  const message = choice?.message;
  const rawCalls: any[] = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

  const toolCalls: ParsedToolCall[] = rawCalls.map((call: any, index: number) => {
    const parsed = parseArguments(call.function?.arguments);
    return {
      id: call.id || `tool-${Date.now()}-${index}`,
      name: call.function?.name,
      arguments: parsed.args,
      ...(parsed.error ? { argumentError: parsed.error } : {}),
    };
  });

  const assistantMessage: ChatCompletionMessage = {
    role: 'assistant',
    content: typeof message?.content === 'string' ? message.content : null,
    ...(rawCalls.length > 0
      ? {
          tool_calls: rawCalls.map((call: any, index: number) => ({
            id: toolCalls[index].id,
            type: 'function' as const,
            function: {
              name: call.function?.name,
              arguments:
                typeof call.function?.arguments === 'string'
                  ? call.function.arguments
                  : JSON.stringify(call.function?.arguments || {}),
            },
          })),
        }
      : {}),
  };

  return {
    reply: typeof message?.content === 'string' ? message.content : '',
    toolCalls: toolCalls.length ? toolCalls : undefined,
    modelUsed,
    finishReason: choice?.finish_reason,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          cost: typeof data.usage.cost === 'number' ? data.usage.cost : undefined,
        }
      : undefined,
    assistantMessage,
  };
}
