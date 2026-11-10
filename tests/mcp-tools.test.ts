import { beforeEach, describe, expect, it, vi } from 'vitest';

const adsMock = vi.hoisted(() => ({
  query: vi.fn(),
  settings: vi.fn(),
}));

vi.mock('@/lib/google-ads-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads-api')>('@/lib/google-ads-api');
  return {
    ...actual,
    queryLiveCampaigns: adsMock.query,
    fetchCampaignSettings: adsMock.settings,
  };
});

import {
  handleMcpPayload,
  handleMcpRequest,
  listMcpTools,
  type McpServerContext,
} from '@/lib/mcp/google-ads-server';
import { MCP_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@/lib/mcp/protocol';
import { OPERATION_CATALOG, validateOperationArgs } from '@/lib/google-ads/catalog';
import type { Campaign } from '@/types/adoptimize';

function campaign(id: string, name: string, overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: `camp-live-${id}`,
    accountId: '1234567890',
    name,
    type: 'SEARCH',
    status: 'ENABLED',
    budgetDaily: 50,
    spend: 100,
    impressions: 1000,
    clicks: 50,
    ctr: 5,
    cpc: 2,
    conversions: 5,
    cpa: 20,
    conversionValue: 400,
    roas: 4,
    conversionRate: 10,
    healthStatus: 'HEALTHY',
    healthScore: 80,
    trendPoints: [],
    historicalPoints: [],
    keywordsCount: 0,
    activeAdsCount: 0,
    ...overrides,
  };
}

const CAMPAIGNS = [
  campaign('111', 'Search - High Intent'),
  campaign('222', 'Display - Retargeting', { status: 'PAUSED', roas: 0.8, conversions: 0 }),
];

function context(overrides: Partial<McpServerContext> = {}): McpServerContext {
  return {
    customerId: '1234567890',
    accessToken: 'token',
    currency: 'USD',
    accountName: 'Test Account',
    snapshot: {
      campaigns: CAMPAIGNS,
      keywords: [],
      searchTerms: [],
      fetchedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  adsMock.query.mockResolvedValue({
    success: true,
    campaigns: CAMPAIGNS,
    keywords: [],
    searchTerms: [],
    fetchedAt: new Date().toISOString(),
  });
  adsMock.settings.mockResolvedValue({
    success: true,
    settings: {
      campaignId: '111',
      resourceName: 'customers/1234567890/campaigns/111',
      name: 'Search - High Intent',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      budgetResourceName: 'customers/1234567890/campaignBudgets/999',
      budgetDaily: 50,
      biddingStrategyType: 'TARGET_CPA',
      targetCpaMicros: 20_000_000,
    },
  });
});

describe('MCP protocol compliance', () => {
  it('rejects a payload that is not JSON-RPC 2.0', async () => {
    const response = await handleMcpPayload({ method: 'tools/list' }, context());
    expect('error' in response).toBe(true);
    if ('error' in response) expect(response.error.code).toBe(-32600);
  });

  it('negotiates a supported protocol version on initialize', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
      context()
    );
    expect('result' in response).toBe(true);
    if ('result' in response) {
      const result = response.result as {
        protocolVersion: string;
        capabilities: { tools: unknown };
        serverInfo: { name: string };
      };
      expect(result.protocolVersion).toBe('2025-03-26');
      expect(result.capabilities.tools).toBeDefined();
      expect(result.serverInfo.name).toBe('adoptimize-google-ads');
    }
  });

  it('falls back to the current version for an unknown protocol version', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      context()
    );
    if ('result' in response) {
      expect((response.result as { protocolVersion: string }).protocolVersion).toBe(
        MCP_PROTOCOL_VERSION
      );
    }
  });

  it('advertises every supported protocol version', () => {
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(MCP_PROTOCOL_VERSION);
  });

  it('echoes the request id on every response', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 'abc-123', method: 'tools/list' },
      context()
    );
    expect(response.id).toBe('abc-123');
    expect(response.jsonrpc).toBe('2.0');
  });

  it('returns method-not-found for an unsupported method', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 3, method: 'resources/list' },
      context()
    );
    expect('error' in response).toBe(true);
    if ('error' in response) expect(response.error.code).toBe(-32601);
  });

  it('accepts the initialized notification without error', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      context()
    );
    expect('result' in response).toBe(true);
  });

  it('responds to ping', async () => {
    const response = await handleMcpRequest({ jsonrpc: '2.0', id: 4, method: 'ping' }, context());
    expect('result' in response).toBe(true);
  });

  it('lists tools with valid JSON Schema input definitions', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 5, method: 'tools/list' },
      context()
    );
    const tools = (response as { result: { tools: Array<Record<string, any>> } }).result.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('rejects tools/call without a tool name', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: {} },
      context()
    );
    expect('error' in response).toBe(true);
    if ('error' in response) expect(response.error.code).toBe(-32602);
  });

  it('rejects an unknown tool name', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'delete_everything' } },
      context()
    );
    expect('error' in response).toBe(true);
    if ('error' in response) expect(response.error.code).toBe(-32602);
  });

  it('returns tool errors as isError results, not protocol errors', async () => {
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'get_campaign_performance', arguments: { campaignId: '999' } },
      },
      context()
    );
    expect('result' in response).toBe(true);
    if ('result' in response) {
      const result = response.result as { isError?: boolean; content: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.code).toBe('not_found');
    }
  });
});

describe('MCP read tools', () => {
  it('returns account overview from the live snapshot', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'get_account_overview' } },
      context()
    );
    const result = (response as { result: { structuredContent: { data: Record<string, any> } } })
      .result;
    expect(result.structuredContent.data.totalCampaigns).toBe(2);
    expect(result.structuredContent.data.enabledCampaigns).toBe(1);
  });

  it('returns canonical campaign IDs that can be reused for actions', async () => {
    const response = await handleMcpRequest(
      { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'get_campaigns' } },
      context()
    );
    const data = (response as { result: { structuredContent: { data: Array<{ campaignId: string }> } } })
      .result.structuredContent.data;
    expect(data.map((item) => item.campaignId)).toEqual(['111', '222']);
  });

  it('resolves a campaign by canonical ID', async () => {
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: { name: 'get_campaign_performance', arguments: { campaignId: '111' } },
      },
      context()
    );
    const result = response as { result: { isError?: boolean; structuredContent: { data: any } } };
    expect(result.result.isError).toBeUndefined();
    expect(result.result.structuredContent.data.name).toBe('Search - High Intent');
  });

  it('does not re-query Google Ads when a snapshot is supplied', async () => {
    await handleMcpRequest(
      { jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'get_campaigns' } },
      context()
    );
    expect(adsMock.query).not.toHaveBeenCalled();
  });

  it('fetches a snapshot once when none is supplied', async () => {
    const ctx = context({ snapshot: undefined });
    await handleMcpRequest(
      { jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'get_campaigns' } },
      ctx
    );
    await handleMcpRequest(
      { jsonrpc: '2.0', id: 15, method: 'tools/call', params: { name: 'get_account_overview' } },
      ctx
    );
    expect(adsMock.query).toHaveBeenCalledTimes(1);
  });
});

describe('MCP write tools never mutate', () => {
  it('returns proposal_required and persists a proposal instead of writing', async () => {
    const prepareProposal = vi.fn().mockResolvedValue({ proposalId: 'proposal-1', revision: 1 });
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'update_campaign_status',
          arguments: { campaignId: '111', status: 'PAUSED' },
        },
      },
      context(),
      { prepareProposal }
    );

    const result = response as { result: { structuredContent: Record<string, any> } };
    expect(result.result.structuredContent.code).toBe('proposal_required');
    expect(result.result.structuredContent.proposalId).toBe('proposal-1');
    expect(prepareProposal).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid arguments before creating a proposal', async () => {
    const prepareProposal = vi.fn();
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'update_campaign_status',
          arguments: { campaignId: '111', status: 'DELETED' },
        },
      },
      context(),
      { prepareProposal }
    );

    const result = response as { result: { isError?: boolean; content: Array<{ text: string }> } };
    expect(result.result.isError).toBe(true);
    expect(JSON.parse(result.result.content[0].text).code).toBe('invalid_argument');
    expect(prepareProposal).not.toHaveBeenCalled();
  });

  it('rejects unknown parameters instead of silently ignoring them', async () => {
    const prepareProposal = vi.fn();
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'update_campaign_budget',
          arguments: { campaignId: '111', newDailyBudget: 10, isConfirmed: true },
        },
      },
      context(),
      { prepareProposal }
    );

    const result = response as { result: { isError?: boolean; content: Array<{ text: string }> } };
    expect(result.result.isError).toBe(true);
    expect(JSON.parse(result.result.content[0].text).code).toBe('invalid_argument');
    expect(prepareProposal).not.toHaveBeenCalled();
  });

  it('fails safely when proposal storage is unavailable', async () => {
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 23,
        method: 'tools/call',
        params: {
          name: 'update_campaign_status',
          arguments: { campaignId: '111', status: 'PAUSED' },
        },
      },
      context()
    );
    const result = response as { result: { isError?: boolean; content: Array<{ text: string }> } };
    expect(result.result.isError).toBe(true);
    expect(JSON.parse(result.result.content[0].text).code).toBe('internal');
  });
});

describe('operation catalog', () => {
  it('exposes every write operation as an MCP tool', () => {
    const toolNames = listMcpTools().map((tool) => tool.name);
    for (const operation of OPERATION_CATALOG) {
      expect(toolNames).toContain(operation.name);
    }
  });

  it('never exposes isConfirmed to the model', () => {
    for (const operation of OPERATION_CATALOG) {
      expect(Object.keys(operation.schema.properties)).not.toContain('isConfirmed');
    }
  });

  it('rejects additional properties on every write operation', () => {
    for (const operation of OPERATION_CATALOG) {
      expect(operation.schema.additionalProperties).toBe(false);
    }
  });

  it('validates required fields', () => {
    const operation = OPERATION_CATALOG.find((item) => item.name === 'update_campaign_budget')!;
    expect(validateOperationArgs(operation, {}).valid).toBe(false);
    expect(validateOperationArgs(operation, { campaignId: '1', newDailyBudget: 5 }).valid).toBe(true);
  });

  it('rejects a non-positive budget', () => {
    const operation = OPERATION_CATALOG.find((item) => item.name === 'update_campaign_budget')!;
    expect(validateOperationArgs(operation, { campaignId: '1', newDailyBudget: 0 }).valid).toBe(false);
  });

  it('builds a budget mutate against the campaign budget resource', () => {
    const operation = OPERATION_CATALOG.find((item) => item.name === 'update_campaign_budget')!;
    const built = operation.buildOperations(
      { campaignId: '111', newDailyBudget: 75 },
      {
        customerId: '1234567890',
        campaign: {
          campaignId: '111',
          name: 'Search - High Intent',
          status: 'ENABLED',
          budgetDaily: 50,
          budgetResourceName: 'customers/1234567890/campaignBudgets/999',
        },
      }
    );
    expect(built[0].service).toBe('campaignBudgets');
    expect(built[0].operations[0].update?.resourceName).toBe(
      'customers/1234567890/campaignBudgets/999'
    );
    expect(built[0].operations[0].update?.amountMicros).toBe('75000000');
  });

  it('verifies a budget change within one cent', () => {
    const operation = OPERATION_CATALOG.find((item) => item.name === 'update_campaign_budget')!;
    const args = { campaignId: '111', newDailyBudget: 75 };
    expect(
      operation.verify(args, { campaignId: '111', name: 'x', status: 'ENABLED', budgetDaily: 75 })
    ).toBe(true);
    expect(
      operation.verify(args, { campaignId: '111', name: 'x', status: 'ENABLED', budgetDaily: 74 })
    ).toBe(false);
  });

  it('builds a status mutate with the correct update mask', () => {
    const operation = OPERATION_CATALOG.find((item) => item.name === 'update_campaign_status')!;
    const built = operation.buildOperations(
      { campaignId: '111', status: 'PAUSED' },
      { customerId: '1234567890', campaign: { campaignId: '111', name: 'x', status: 'ENABLED' } }
    );
    expect(built[0].service).toBe('campaigns');
    expect(built[0].operations[0].updateMask).toBe('status');
    expect(built[0].operations[0].update?.status).toBe('PAUSED');
  });

  it('builds a target CPA bidding mutate', () => {
    const operation = OPERATION_CATALOG.find(
      (item) => item.name === 'update_campaign_bidding_strategy'
    )!;
    const built = operation.buildOperations(
      { campaignId: '111', strategy: 'TARGET_CPA', targetCpa: 25 },
      { customerId: '1234567890', campaign: { campaignId: '111', name: 'x', status: 'ENABLED' } }
    );
    expect(built[0].operations[0].updateMask).toBe('targetCpa.targetCpaMicros');
    expect((built[0].operations[0].update?.targetCpa as { targetCpaMicros: string }).targetCpaMicros).toBe(
      '25000000'
    );
  });

  it('requires a target value for target-based bidding strategies', () => {
    const operation = OPERATION_CATALOG.find(
      (item) => item.name === 'update_campaign_bidding_strategy'
    )!;
    expect(() =>
      operation.buildOperations(
        { campaignId: '111', strategy: 'TARGET_CPA' },
        { customerId: '1234567890', campaign: { campaignId: '111', name: 'x', status: 'ENABLED' } }
      )
    ).toThrow(/targetCpa/);
  });
});
