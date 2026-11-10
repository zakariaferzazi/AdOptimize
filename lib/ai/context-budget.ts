/**
 * Context budget accounting.
 *
 * The budget covers everything actually sent to the model: system
 * instructions, tool definitions, the full chronological history, prior tool
 * results, and the reserved output window. History is never truncated; when the
 * budget is exhausted the caller must ask the user to start a new chat.
 */

export interface BudgetInput {
  systemPrompt: string;
  toolSchemas: unknown;
  messages: Array<{ role: string; content?: string | null; tool_calls?: unknown }>;
  reserveOutputTokens: number;
  contextLimit: number;
}

export interface BudgetBreakdown {
  systemTokens: number;
  toolTokens: number;
  historyTokens: number;
  reserveTokens: number;
  totalTokens: number;
  contextLimit: number;
  remainingTokens: number;
  fits: boolean;
}

/**
 * Conservative token estimate. English prose averages ~4 characters per token;
 * JSON and code are denser, so structured payloads are charged at ~3.
 */
export function estimateTokens(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return 0;
  const structural = (text.match(/[{}[\]":,]/g) || []).length;
  const density = structural > text.length * 0.08 ? 3 : 4;
  return Math.ceil(text.length / density);
}

export function computeBudget(input: BudgetInput): BudgetBreakdown {
  const systemTokens = estimateTokens(input.systemPrompt);
  const toolTokens = estimateTokens(input.toolSchemas);
  const historyTokens = input.messages.reduce((total, message) => {
    const content = estimateTokens(message.content || '');
    const calls = message.tool_calls ? estimateTokens(message.tool_calls) : 0;
    return total + content + calls + 4;
  }, 0);
  const reserveTokens = input.reserveOutputTokens;
  const totalTokens = systemTokens + toolTokens + historyTokens + reserveTokens;

  return {
    systemTokens,
    toolTokens,
    historyTokens,
    reserveTokens,
    totalTokens,
    contextLimit: input.contextLimit,
    remainingTokens: input.contextLimit - totalTokens,
    fits: totalTokens <= input.contextLimit,
  };
}

export const CONTEXT_FULL_MESSAGE =
  'This conversation has reached the context limit for the selected model. I have not removed or summarised any earlier messages. Please start a new chat to continue with full context.';
