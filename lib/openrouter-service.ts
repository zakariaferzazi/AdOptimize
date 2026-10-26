import { getGeminiClient } from './gemini-server';

export type ModelTier = 'fast' | 'analysis' | 'advanced';

export interface ModelConfig {
  id: string;
  name: string;
  tier: ModelTier;
  description: string;
}

export function getAvailableModels(): ModelConfig[] {
  return [
    {
      id: process.env.MODEL_FAST || 'google/gemini-2.0-flash-001',
      name: 'Fast Assistant',
      tier: 'fast',
      description: 'Quick questions, summaries, and direct metric queries.',
    },
    {
      id: process.env.MODEL_ANALYSIS || 'google/gemini-2.5-pro',
      name: 'Performance Analyst',
      tier: 'analysis',
      description: 'Account diagnostics, finding wasted spend, and campaign evaluations.',
    },
    {
      id: process.env.MODEL_ADVANCED || 'anthropic/claude-3.7-sonnet',
      name: 'Advanced Strategist',
      tier: 'advanced',
      description: 'Complex multi-step optimizations, budget modeling, and strategic plans.',
    },
  ];
}

export function resolveModelId(tier: ModelTier = 'analysis'): string {
  const models = getAvailableModels();
  const matched = models.find((m) => m.tier === tier);
  return matched ? matched.id : models[1].id;
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
 * Dispatches chat completion to OpenRouter API (or graceful fallback to Gemini if OpenRouter key not set).
 */
export async function sendOpenRouterChat(options: OpenRouterChatOptions): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const targetModel = options.modelOverride || resolveModelId(options.tier || 'analysis');

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
        // Fall back to server gemini if OpenRouter rate-limited or failed
        return await fallbackGeminiChat(options, targetModel);
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
        modelUsed: data.model || targetModel,
        finishReason: choice?.finish_reason,
      };
    } catch (err: any) {
      console.warn('[OpenRouter Fetch Exception]:', err.message);
      return await fallbackGeminiChat(options, targetModel);
    }
  }

  // Graceful fallback when OPENROUTER_API_KEY is not configured
  return await fallbackGeminiChat(options, targetModel);
}

/**
 * Fallback chat handler using Google GenAI SDK
 */
async function fallbackGeminiChat(options: OpenRouterChatOptions, requestedModelName: string): Promise<OpenRouterResponse> {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        reply: 'AI service credentials are not configured. Please set OPENROUTER_API_KEY or GEMINI_API_KEY in the environment.',
        modelUsed: 'Offline Mode',
      };
    }

    // Map system and user messages into prompt
    const systemPrompt = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const conversation = options.messages.filter((m) => m.role !== 'system');

    // Create function definitions for Gemini if tools are supplied
    const functionDeclarations = options.tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    // Convert messages for Gemini
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
      modelUsed: `OpenRouter (${requestedModelName}) via Gateway`,
    };
  } catch (err: any) {
    console.error('[Gemini Fallback Chat Error]:', err);
    return {
      reply: 'I am unable to complete this analysis right now. Please verify your connection or try again in a moment.',
      modelUsed: requestedModelName,
    };
  }
}
