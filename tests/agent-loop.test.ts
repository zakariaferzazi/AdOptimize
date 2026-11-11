import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptedModel, textResponse, toolResponse } from './helpers/model';
import { FakeGoogleAds } from './helpers/fake-google-ads';

const model = vi.hoisted(() => ({ current: undefined as any, contextLength: 128000 }));

vi.mock('@/lib/openrouter-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openrouter-service')>('@/lib/openrouter-service');
  return {
    ...actual,
    sendOpenRouterChat: (options: any) => model.current.handler(options),
    getModelLimits: async () => ({ contextLength: model.contextLength, source: 'fallback' }),
  };
});

import { runAgent, type AgentRunOptions } from '@/lib/ai/agent';
import { emptyState } from '@/lib/ai/agent-state';
import { invalidateGaqlCache, newRequestStats } from '@/lib/google-ads/gaql';

let scripted: ScriptedModel;
let fake: FakeGoogleAds;

function options(overrides: Partial<AgentRunOptions> = {}): AgentRunOptions {
  return {
    model: 'chatgpt',
    history: [{ role: 'user', content: 'How are my campaigns doing?' }],
    ads: { customerId: '1234567890', accessToken: 'token', currency: 'USD', accountName: 'Acme Outdoors', stats: newRequestStats() },
    state: emptyState(),
    saveProposal: async () => ({ proposalId: 'p-1', revision: 1, supersededIds: [] }),
    ...overrides,
  };
}

beforeEach(() => {
  scripted = new ScriptedModel();
  model.current = scripted;
  model.contextLength = 128000;
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  scripted.verify();
});

describe('agent loop', () => {
  it('answers a general question with one model call and no Google Ads requests', async () => {
    scripted.script(textResponse('ROAS is conversion value divided by cost.'));
    const result = await runAgent(options({ history: [{ role: 'user', content: 'What does ROAS mean?' }] }));
    expect(result.reply).toMatch(/conversion value/);
    expect(result.usage).toMatchObject({ modelCalls: 1, toolCalls: 0, googleAdsRequests: 0 });
    expect(result.stopReason).toBe('answered');
    expect(fake.requests).toHaveLength(0);
  });

  it('executes requested tools and feeds structured results back as tool messages', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: { dateRange: 'LAST_7_DAYS' } }]), textResponse('Brand is your best campaign.'));
    const result = await runAgent(options());
    expect(result.usage.modelCalls).toBe(2);
    const toolResult = scripted.lastToolResult();
    expect(toolResult.campaigns.map((campaign: any) => campaign.id)).toContain('111');
    expect(toolResult.dateRange.label).toBe('last 7 days');
    expect(result.producedMessages.map((message) => message.role)).toEqual(['assistant', 'tool', 'assistant']);
  });

  it('runs independent reads in one step', async () => {
    scripted.script(
      toolResponse([
        { name: 'get_campaign_details', args: { campaignId: '111' } },
        { name: 'get_search_terms', args: { campaignId: '222', filter: 'NON_CONVERTING' } },
      ]),
      textResponse('Done.')
    );
    const result = await runAgent(options());
    expect(result.toolCalls.map((call) => call.isError)).toEqual([false, false]);
    expect(result.usage.modelCalls).toBe(2);
  });

  it('saves task memory alongside a finished reply without another model call', async () => {
    scripted.script(
      toolResponse(
        [{ name: 'update_task', args: { objective: 'Create a search campaign', parameters: { name: 'Spring Sale', dailyBudget: 20 }, openQuestions: ['keywords'] } }],
        'Got it — Spring Sale at $20/day. Which keywords should it target?'
      )
    );
    const result = await runAgent(options({ history: [{ role: 'user', content: 'Create a search campaign called Spring Sale with $20/day' }] }));
    expect(result.usage.modelCalls).toBe(1);
    expect(result.reply).toMatch(/Which keywords/);
    const task = result.state.tasks[0];
    expect(task).toMatchObject({ objective: 'Create a search campaign', parameters: { name: 'Spring Sale', dailyBudget: 20 }, openQuestions: ['keywords'] });
  });

  it('serves an identical repeated call without a second API request', async () => {
    scripted.script(
      toolResponse([{ name: 'list_campaigns', args: {} }]),
      toolResponse([{ name: 'list_campaigns', args: {} }]),
      textResponse('Here they are.')
    );
    const result = await runAgent(options());
    expect(result.usage.duplicateCallsAvoided).toBe(1);
    expect(result.toolCalls[1].duplicate).toBe(true);
    expect(fake.queries('campaign')).toHaveLength(2);
  });

  it('refuses to repeat an identical failed call unchanged', async () => {
    scripted.script(
      toolResponse([{ name: 'get_campaign_details', args: { campaignId: '999' } }]),
      toolResponse([{ name: 'get_campaign_details', args: { campaignId: '999' } }]),
      textResponse('I could not find that campaign.')
    );
    const result = await runAgent(options());
    expect(result.toolCalls[0].result).toMatchObject({ error: { code: 'not_found' } });
    expect(result.toolCalls[1].result).toMatchObject({ error: { code: 'repeated_call' } });
  });

  it('returns malformed tool arguments to the model as a correctable error', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {}, rawArguments: '{"status": ' }]), textResponse('Retrying differently.'));
    const result = await runAgent(options());
    expect(result.toolCalls[0].result).toMatchObject({ error: { code: 'invalid_argument' } });
    expect(fake.requests).toHaveLength(0);
  });

  it('stops at the step limit and asks for a tool-free summary', async () => {
    for (let index = 0; index < 3; index += 1) {
      scripted.script(toolResponse([{ name: 'list_keywords', args: { campaignId: '222', limit: index + 1 } }]));
    }
    scripted.script(textResponse('Summary so far: hiking boots keyword is wasteful. I can continue.'));
    const result = await runAgent(options({ limits: { maxModelCalls: 3 } }));
    expect(result.stopReason).toBe('step_limit');
    const closing = scripted.requests[scripted.requests.length - 1];
    expect(closing.toolChoice).toBe('none');
    expect(closing.messages[closing.messages.length - 1].content).toMatch(/Do not call tools/);
    expect(result.reply).toMatch(/continue/);
  });

  it('enforces the tool-call limit', async () => {
    scripted.script(
      toolResponse([
        { name: 'list_campaigns', args: { limit: 1 } },
        { name: 'list_campaigns', args: { limit: 2 } },
        { name: 'list_campaigns', args: { limit: 3 } },
      ]),
      textResponse('Partial answer.')
    );
    const result = await runAgent(options({ limits: { maxToolCalls: 2 } }));
    expect(result.toolCalls.filter((call) => (call.result as any)?.error?.code === 'limit_reached')).toHaveLength(1);
    expect(result.stopReason).toBe('tool_limit');
  });

  it('never calls the model when the full context does not fit', async () => {
    model.contextLength = 4000;
    const history = Array.from({ length: 40 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: 'x'.repeat(400) })) as any;
    const result = await runAgent(options({ history }));
    expect(result.contextFull).toBe(true);
    expect(result.reply).toMatch(/start a new chat/);
    expect(scripted.requests).toHaveLength(0);
  });

  it('returns a safe reply when the model fails after work was done', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), () => {
      throw new Error('OpenRouter request failed (503)');
    });
    const result = await runAgent(options());
    expect(result.stopReason).toBe('model_error');
    expect(result.reply).toMatch(/Nothing in your account was changed/);
  });

  it('propagates a failure of the very first model call', async () => {
    scripted.script(() => {
      throw new Error('OpenRouter request failed (401)');
    });
    await expect(runAgent(options())).rejects.toThrow(/OpenRouter/);
  });

  it('sums usage across every model call', async () => {
    scripted.script(toolResponse([{ name: 'list_campaigns', args: {} }]), textResponse('ok'));
    const result = await runAgent(options());
    expect(result.usage.promptTokens).toBe(2000);
    expect(result.usage.completionTokens).toBe(150);
    expect(result.usage.costUsd).toBeCloseTo(0.002);
    expect(result.usage.googleAdsRequests).toBeGreaterThan(0);
  });

  it('turns a write tool into a proposal tied to the active task without mutating', async () => {
    const saved: any[] = [];
    scripted.script(toolResponse([{ name: 'update_campaign_budget', args: { campaignId: '111', dailyBudget: 70 } }]), textResponse('Prepared.'));
    const result = await runAgent(
      options({
        saveProposal: async (draft) => {
          saved.push(draft);
          return { proposalId: 'p-9', revision: 1, supersededIds: [] };
        },
      })
    );
    expect(saved[0]).toMatchObject({ operation: 'update_campaign_budget', args: { campaignId: '111', dailyBudget: 70 }, taskId: 't1' });
    expect(result.toolCalls[0].result).toMatchObject({ status: 'proposal_prepared', proposalId: 'p-9', validatedByGoogleAds: true });
    expect(result.state.tasks[0]).toMatchObject({ status: 'awaiting_approval', proposals: [expect.objectContaining({ proposalId: 'p-9' })] });
    expect(result.state.resources[0]).toMatchObject({ type: 'campaign', id: '111', name: 'Brand - Search' });
    expect(fake.mutates()).toHaveLength(0);
    expect(fake.mutates(true)).toHaveLength(1);
  });
});
