import type { OpenRouterChatOptions, OpenRouterResponse } from '@/lib/openrouter-service';

/**
 * Test doubles for the model. A scripted model returns pre-defined responses
 * (or computes them from the request) and records every payload so tests can
 * assert exactly what the backend sends: system prompt, history, tools.
 */

export interface ToolCallSpec {
  name: string;
  args: Record<string, unknown>;
  id?: string;
  rawArguments?: string;
}

let callCounter = 0;

export function textResponse(text: string): OpenRouterResponse {
  return {
    reply: text,
    modelUsed: 'Test Model',
    finishReason: 'stop',
    usage: { promptTokens: 1000, completionTokens: 100, totalTokens: 1100, cost: 0.001 },
    assistantMessage: { role: 'assistant', content: text },
  };
}

export function toolResponse(calls: ToolCallSpec[], text = ''): OpenRouterResponse {
  const withIds = calls.map((call) => ({ ...call, id: call.id || `call-${++callCounter}` }));
  return {
    reply: text,
    modelUsed: 'Test Model',
    finishReason: 'tool_calls',
    usage: { promptTokens: 1000, completionTokens: 50, totalTokens: 1050, cost: 0.001 },
    toolCalls: withIds.map((call) => ({
      id: call.id,
      name: call.name,
      arguments: call.rawArguments ? {} : call.args,
      ...(call.rawArguments ? { argumentError: 'Tool arguments were not valid JSON.' } : {}),
    })),
    assistantMessage: {
      role: 'assistant',
      content: text || null,
      tool_calls: withIds.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.rawArguments ?? JSON.stringify(call.args) },
      })),
    },
  };
}

export type Step = OpenRouterResponse | ((request: OpenRouterChatOptions) => OpenRouterResponse);

export class ScriptedModel {
  private steps: Step[] = [];
  requests: OpenRouterChatOptions[] = [];

  script(...steps: Step[]) {
    this.steps.push(...steps);
    return this;
  }

  get remaining() {
    return this.steps.length;
  }

  handler = async (options: OpenRouterChatOptions): Promise<OpenRouterResponse> => {
    this.requests.push(JSON.parse(JSON.stringify(options)));
    const step = this.steps.shift();
    if (!step) throw new Error('ScriptedModel: no scripted response left');
    if (typeof step !== 'function') return step;
    try {
      return step(options);
    } catch (error) {
      // Assertions inside a step must fail the test even if the agent recovers.
      if (error instanceof Error && error.name === 'AssertionError') this.assertionErrors.push(error);
      throw error;
    }
  };

  assertionErrors: Error[] = [];

  /** Throws the first assertion failure raised inside a scripted step. */
  verify() {
    if (this.assertionErrors.length) throw this.assertionErrors[0];
    if (this.steps.length) throw new Error(`ScriptedModel: ${this.steps.length} scripted response(s) were never used`);
  }

  /** Last tool message content returned to the model, parsed. */
  lastToolResult(request = this.requests[this.requests.length - 1]): any {
    const tool = [...(request?.messages || [])].reverse().find((message) => message.role === 'tool');
    return tool?.content ? JSON.parse(tool.content) : undefined;
  }

  toolResults(request = this.requests[this.requests.length - 1]): Array<{ name?: string; payload: any }> {
    return (request?.messages || [])
      .filter((message) => message.role === 'tool')
      .map((message) => ({ name: message.name, payload: message.content ? JSON.parse(message.content) : undefined }));
  }

  systemPrompt(index = this.requests.length - 1): string {
    return String(this.requests[index]?.messages?.[0]?.content || '');
  }
}

export function jsonRequest(url: string, body: Record<string, unknown>, method = 'POST') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  }) as never;
}

export function getRequest(url: string) {
  return new Request(url, { headers: { Authorization: 'Bearer test-token' } }) as never;
}
