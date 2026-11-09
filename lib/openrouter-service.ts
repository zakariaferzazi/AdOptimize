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
    { id: process.env.MODEL_DEEPSEEK || '', name: 'DeepSeek', model: 'deepseek', provider: 'DeepSeek', badge: 'Reasoning & Math', description: 'Reasoning and campaign diagnostics.' },
    { id: process.env.MODEL_CHATGPT || '', name: 'ChatGPT', model: 'chatgpt', provider: 'OpenAI', badge: 'OpenAI', description: 'Campaign strategy and performance analysis.' },
    { id: process.env.MODEL_GEMINI || '', name: 'Gemini', model: 'gemini', provider: 'Google', badge: 'Google', description: 'Fast account analysis and campaign assistance.' },
  ];
}

export function resolveModelId(modelOrTier: string = 'gemini'): string {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'advanced' || normalized === 'analysis') return process.env.MODEL_DEEPSEEK || '';
  if (normalized === 'chatgpt' || normalized === 'balanced') return process.env.MODEL_CHATGPT || '';
  return process.env.MODEL_GEMINI || '';
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
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  reply: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, any> }>;
  modelUsed: string;
  finishReason?: string;
}

const MODEL_CONTEXT_LIMITS: Record<SupportedModel, number> = {
  deepseek: 32768,
  chatgpt: 128000,
  gemini: 1000000,
};

export function getModelContextLimit(modelOrTier: string = 'gemini'): number {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'advanced' || normalized === 'analysis') {
    return MODEL_CONTEXT_LIMITS.deepseek;
  }
  if (normalized === 'chatgpt' || normalized === 'balanced') {
    return MODEL_CONTEXT_LIMITS.chatgpt;
  }
  return MODEL_CONTEXT_LIMITS.gemini;
}

export function getOpenRouterApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY;
  return key?.trim() || undefined;
}

export async function sendOpenRouterChat(options: OpenRouterChatOptions): Promise<OpenRouterResponse> {
  const chosenModel = options.model || (options.tier as SupportedModel) || 'gemini';
  const targetModel = options.modelOverride || resolveModelId(chosenModel);
  const modelUsed = getModelDisplayName(chosenModel);
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured.');
  if (!targetModel) throw new Error(`No model is configured for ${modelUsed}. Set the matching MODEL_* Cloudflare variable.`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'https://adoptimize.app',
      'X-Title': 'AdOptimize Google Ads Suite',
    },
    body: JSON.stringify({
      model: targetModel,
      messages: options.messages,
      tools: options.tools?.length ? options.tools : undefined,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;
  const toolCalls = Array.isArray(message?.tool_calls)
    ? message.tool_calls.map((call: any, index: number) => ({
        id: call.id || `tool-${Date.now()}-${index}`,
        name: call.function?.name,
        arguments: typeof call.function?.arguments === 'string'
          ? JSON.parse(call.function.arguments || '{}')
          : call.function?.arguments || {},
      }))
    : undefined;

  return {
    reply: typeof message?.content === 'string' ? message.content : '',
    toolCalls,
    modelUsed,
    finishReason: choice?.finish_reason,
  };
}
