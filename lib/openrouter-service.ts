import { getGeminiClient } from './gemini-server';

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
    {
      id: process.env.MODEL_DEEPSEEK || 'deepseek/deepseek-chat',
      name: 'DeepSeek',
      model: 'deepseek',
      provider: 'DeepSeek',
      badge: 'Reasoning & Math',
      description: 'Deep mathematical reasoning, complex search term clustering, and cost-per-acquisition diagnostics.',
    },
    {
      id: process.env.MODEL_CHATGPT || 'openai/gpt-4o',
      name: 'ChatGPT',
      model: 'chatgpt',
      provider: 'OpenAI',
      badge: 'GPT-4o',
      description: 'OpenAI flagship model for PPC strategy, ad creative analysis, and conversion rate optimization.',
    },
    {
      id: process.env.MODEL_GEMINI || 'google/gemini-2.5-flash',
      name: 'Gemini',
      model: 'gemini',
      provider: 'Google',
      badge: 'Gemini 2.5',
      description: 'Ultra-fast search stream querying, campaign status checks, and instant Google Ads API execution.',
    },
  ];
}

export function resolveModelId(modelOrTier: string = 'gemini'): string {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'analysis') {
    return process.env.MODEL_DEEPSEEK || 'deepseek/deepseek-chat';
  }
  if (normalized === 'chatgpt' || normalized === 'advanced') {
    return process.env.MODEL_CHATGPT || 'openai/gpt-4o';
  }
  // Default to Gemini
  return process.env.MODEL_GEMINI || 'google/gemini-2.5-flash';
}

export function getModelDisplayName(modelOrTier: string = 'gemini'): string {
  const normalized = modelOrTier.toLowerCase();
  if (normalized === 'deepseek' || normalized === 'analysis') return 'DeepSeek';
  if (normalized === 'chatgpt' || normalized === 'advanced') return 'ChatGPT';
  return 'Gemini';
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
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
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  modelUsed: string;
  finishReason?: string;
}

/**
 * Dispatches chat completion to selected model (DeepSeek, ChatGPT, or Gemini).
 * Uses OpenRouter API when available, or direct Gemini client fallback.
 */
export async function sendOpenRouterChat(options: OpenRouterChatOptions): Promise<OpenRouterResponse> {
  const chosenKey = options.model || (options.tier as SupportedModel) || 'gemini';
  const targetModel = options.modelOverride || resolveModelId(chosenKey);
  const displayName = getModelDisplayName(chosenKey);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (apiKey) {
    try {
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
          tools: options.tools && options.tools.length > 0 ? options.tools : undefined,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OpenRouter API Error ${response.status}]:`, errorText);
        return await fallbackGeminiChat(options, displayName);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      let toolCalls: OpenRouterResponse['toolCalls'];
      if (message?.tool_calls && Array.isArray(message.tool_calls)) {
        toolCalls = message.tool_calls.map((tc: any) => {
          let parsedArgs = {};
          try {
            parsedArgs = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;
          } catch {
            parsedArgs = {};
          }
          return {
            id: tc.id || `tc-${Date.now()}`,
            name: tc.function.name,
            arguments: parsedArgs,
          };
        });
      }

      return {
        reply: message?.content || '',
        toolCalls,
        modelUsed: displayName,
        finishReason: choice?.finish_reason,
      };
    } catch (err: any) {
      console.warn('[OpenRouter Exception]:', err.message);
      return await fallbackGeminiChat(options, displayName);
    }
  }

  // When OPENROUTER_API_KEY is not present, use server Gemini
  return await fallbackGeminiChat(options, displayName);
}

/**
 * Fallback chat handler using Google GenAI SDK
 */
async function fallbackGeminiChat(options: OpenRouterChatOptions, requestedModelName: string): Promise<OpenRouterResponse> {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        reply: 'AI credentials are not configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY in the server environment.',
        modelUsed: `${requestedModelName} (Offline)`,
      };
    }

    const systemPrompt = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const conversation = options.messages.filter((m) => m.role !== 'system');

    const functionDeclarations = options.tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const contents = conversation.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents.length > 0 ? (contents as any) : [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: systemPrompt || undefined,
        temperature: options.temperature ?? 0.2,
        tools: functionDeclarations && functionDeclarations.length > 0 ? [{ functionDeclarations } as any] : undefined,
      },
    });

    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any, idx: number) => ({
      id: `call-${Date.now()}-${idx}`,
      name: p.functionCall.name,
      arguments: p.functionCall.args || {},
    }));

    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text || response.text || '';

    return {
      reply: textPart,
      toolCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined,
      modelUsed: requestedModelName === 'Gemini' ? 'Gemini' : `${requestedModelName} (via Gemini Engine)`,
    };
  } catch (err: any) {
    console.error('[Fallback Chat Error]:', err);
    return {
      reply: 'I am unable to complete this analysis right now. Please verify your connection or try again in a moment.',
      modelUsed: requestedModelName,
    };
  }
}
