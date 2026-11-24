import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAvailableModels, getModelDisplayName, resolveModelId, sendOpenRouterChat } from '@/lib/openrouter-service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('chat model selection', () => {
  it('uses Claude by default for the replacement and legacy model names', () => {
    vi.stubEnv('MODEL_CLAUDE', '');
    for (const model of ['claude', 'deepseek', 'advanced', 'analysis']) {
      expect(resolveModelId(model)).toBe('anthropic/claude-haiku-5.5');
      expect(getModelDisplayName(model)).toBe('Claude');
    }
    expect(getAvailableModels().map((model) => model.model)).toEqual(['claude', 'chatgpt', 'gemini']);
    expect(getModelDisplayName('gemini')).toBe('Gemini');
  });

  it('sends the configured Claude model ID to OpenRouter', async () => {
    vi.stubEnv('MODEL_CLAUDE', 'anthropic/custom-claude');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendOpenRouterChat({ model: 'claude', messages: [{ role: 'user', content: 'Hello' }] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('anthropic/custom-claude');
    expect(result.modelUsed).toBe('Claude');
  });
});
