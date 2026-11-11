import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds } from './helpers/fake-google-ads';
import { callMcpTool, handleMcpPayload, listMcpTools, type McpServerContext } from '@/lib/mcp/google-ads-server';
import { invalidateGaqlCache, newRequestStats } from '@/lib/google-ads/gaql';

let fake: FakeGoogleAds;
let context: McpServerContext;

beforeEach(() => {
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
  context = {
    customerId: '1234567890',
    accessToken: 'token',
    currency: 'USD',
    accountName: 'Acme Outdoors',
    stats: newRequestStats(),
  };
});

afterEach(() => vi.unstubAllGlobals());

describe('MCP protocol', () => {
  it('initialises with a supported protocol version', async () => {
    const response = await handleMcpPayload({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, context);
    expect(response).toMatchObject({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: { listChanged: false } } } });
  });

  it('lists the same capabilities the agent uses, with read-only hints', async () => {
    const tools = listMcpTools();
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['list_campaigns', 'get_performance', 'update_task', 'create_campaign']));
    expect(tools.find((tool) => tool.name === 'list_campaigns')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === 'create_campaign')?.annotations?.readOnlyHint).toBe(false);
    for (const tool of tools) expect(tool.inputSchema).toMatchObject({ type: 'object' });
  });

  it('rejects unknown tools and methods with JSON-RPC errors', async () => {
    const unknown = await handleMcpPayload({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'mutate_everything', arguments: {} } }, context);
    expect(unknown).toMatchObject({ error: { code: -32602 } });
    const method = await handleMcpPayload({ jsonrpc: '2.0', id: 3, method: 'resources/list' }, context);
    expect(method).toMatchObject({ error: { code: -32601 } });
    const invalid = await handleMcpPayload({ nope: true }, context);
    expect(invalid).toMatchObject({ error: { code: -32600 } });
  });

  it('returns structured read results', async () => {
    const response = await handleMcpPayload({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_campaigns', arguments: {} } }, context);
    const result = (response as any).result;
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.campaigns).toHaveLength(4);
    expect(JSON.parse(result.content[0].text).currency).toBe('USD');
  });

  it('returns structured errors instead of throwing', async () => {
    const result = await callMcpTool('get_campaign_details', { campaignId: '999' }, context);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ error: { code: 'not_found' } });
  });

  it('prepares a proposal through the hook and never mutates', async () => {
    const saved: any[] = [];
    const result = await callMcpTool(
      'update_campaign_budget',
      { campaignId: '111', dailyBudget: 75 },
      context,
      {
        saveProposal: async (draft) => {
          saved.push(draft);
          return { proposalId: 'mcp-1', revision: 1, supersededIds: [] };
        },
      }
    );
    expect(result.structuredContent).toMatchObject({ status: 'proposal_prepared', proposalId: 'mcp-1' });
    expect(saved[0].args).toEqual({ campaignId: '111', dailyBudget: 75 });
    expect(fake.mutates()).toHaveLength(0);
  });

  it('fails closed when no proposal storage is available', async () => {
    const result = await callMcpTool('update_campaign_budget', { campaignId: '111', dailyBudget: 75 }, context);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ error: { code: 'internal' } });
    expect(fake.mutates()).toHaveLength(0);
  });

  it('keeps task memory inside the MCP session context', async () => {
    await callMcpTool('update_task', { objective: 'Pause brand', parameters: { campaignId: '111' } }, context);
    expect(context.state?.tasks[0]).toMatchObject({ objective: 'Pause brand', parameters: { campaignId: '111' } });
  });
});
