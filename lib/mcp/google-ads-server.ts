import type { Campaign, Keyword, SearchTerm } from '@/types/adoptimize';
import { fetchCampaignConversionGoals, fetchCampaignSettings, queryLiveCampaigns } from '@/lib/google-ads-api';
import { OPERATION_CATALOG, getOperation, validateOperationArgs } from '@/lib/google-ads/catalog';
import type { CampaignSnapshot } from '@/lib/google-ads/catalog';
import {
  ambiguous,
  fromGoogleAdsFailure,
  invalidArgument,
  notFound,
  toolError,
  unsupported,
} from './errors';
import {
  JSON_RPC_ERRORS,
  MCP_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJsonRpcRequest,
  jsonRpcError,
  jsonRpcSuccess,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpInitializeResult,
  type McpToolDefinition,
  type McpToolResult,
} from './protocol';

/**
 * Google Ads MCP server.
 *
 * Read tools query the live account through the existing Google Ads client.
 * Write tools never mutate: they validate the request and return a
 * `proposal_required` result so the deterministic execution engine stays the
 * only path that can change an account.
 */

export interface McpServerContext {
  customerId: string;
  accessToken: string;
  developerToken?: string;
  loginCustomerId?: string;
  currency: string;
  accountName: string;
  /** Pre-fetched snapshot so one turn does not re-query Google Ads per tool. */
  snapshot?: {
    campaigns: Campaign[];
    keywords: Keyword[];
    searchTerms: SearchTerm[];
    fetchedAt: string;
  };
}

export interface PreparedProposal {
  operation: string;
  args: Record<string, unknown>;
  summary: string;
  beforeSnapshot: Record<string, unknown>;
  campaignId?: string;
  campaignName?: string;
}

export interface McpServerHooks {
  /** Called when a write tool validates successfully. Must persist a proposal. */
  prepareProposal?: (
    proposal: PreparedProposal,
    context: McpServerContext
  ) => Promise<{ proposalId: string; revision: number }>;
}

const READ_TOOLS: McpToolDefinition[] = [
  {
    name: 'get_account_overview',
    description:
      'Get account-level totals: spend, conversions, blended CPA, ROAS, and enabled campaign counts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_campaigns',
    description:
      'List campaigns with ID, name, status, daily budget, spend, conversions, CPA and ROAS. Use the returned ID for any follow-up action.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ALL', 'ENABLED', 'PAUSED'] },
        search: { type: 'string', description: 'Case-insensitive name filter.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_campaign_performance',
    description: 'Get detailed metrics for one campaign by canonical campaign ID.',
    inputSchema: {
      type: 'object',
      properties: { campaignId: { type: 'string' } },
      required: ['campaignId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_search_terms',
    description: 'Retrieve search queries with spend and conversions, optionally filtered by campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
        filter: { type: 'string', enum: ['ALL', 'NON_CONVERTING', 'HIGH_SPEND'] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_keywords',
    description: 'Retrieve keywords with match type, quality score, spend, conversions and CPA.',
    inputSchema: {
      type: 'object',
      properties: { campaignId: { type: 'string' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_campaign_settings',
    description:
      'Read the mutable settings of one campaign: status, budget, bidding strategy, dates, network settings and tracking.',
    inputSchema: {
      type: 'object',
      properties: { campaignId: { type: 'string' } },
      required: ['campaignId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_campaign_conversion_goals',
    description:
      'Read the conversion goals attached to a campaign, including which categories are included in bidding.',
    inputSchema: {
      type: 'object',
      properties: { campaignId: { type: 'string' } },
      required: ['campaignId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'find_wasted_spend',
    description:
      'Identify non-converting spend across campaigns and search terms, with the exact amounts involved.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'analyze_budget_allocation',
    description:
      'Compare campaign efficiency to suggest where budget is under- or over-allocated. Read-only analysis.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
];

function writeToolDefinitions(): McpToolDefinition[] {
  return OPERATION_CATALOG.map((operation) => ({
    name: operation.name,
    description: `${operation.description} This prepares a proposal; it never changes the account directly.`,
    inputSchema: operation.schema as unknown as Record<string, unknown>,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }));
}

export function listMcpTools(): McpToolDefinition[] {
  return [...READ_TOOLS, ...writeToolDefinitions()];
}

function normalizeId(value: unknown): string {
  return String(value || '').replace(/^camp-live-/, '').replace(/\D/g, '');
}

function findCampaignById(campaigns: Campaign[], campaignId: string): Campaign | undefined {
  const target = normalizeId(campaignId);
  if (!target) return undefined;
  return campaigns.find((campaign) => normalizeId(campaign.id) === target);
}

function resolveCampaign(
  campaigns: Campaign[],
  args: Record<string, unknown>
): Campaign {
  const rawId = args.campaignId;
  if (typeof rawId === 'string' && rawId.trim()) {
    const match = findCampaignById(campaigns, rawId);
    if (!match) throw notFound(`Campaign ${rawId}`);
    return match;
  }
  const rawName = args.campaignName;
  if (typeof rawName === 'string' && rawName.trim()) {
    const needle = rawName.trim().toLowerCase();
    const exact = campaigns.filter((campaign) => campaign.name.toLowerCase() === needle);
    if (exact.length === 1) return exact[0];
    const partial = campaigns.filter((campaign) => campaign.name.toLowerCase().includes(needle));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) {
      throw ambiguous(
        'campaign',
        partial.slice(0, 5).map((campaign) => ({ id: campaign.id, name: campaign.name }))
      );
    }
    throw notFound(`Campaign "${rawName}"`);
  }
  throw invalidArgument('A campaignId is required.');
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} ${currency}`;
  }
}

function textResult(payload: unknown, summary: string): McpToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: { data: payload },
  };
}

function errorResult(error: unknown): McpToolResult {
  const payload =
    error && typeof error === 'object' && 'payload' in error
      ? (error as { payload: unknown }).payload
      : {
          code: 'internal',
          message: error instanceof Error ? error.message : 'The tool failed.',
          next_step: 'Explain the failure and suggest retrying.',
        };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    isError: true,
    structuredContent: payload as Record<string, unknown>,
  };
}

async function ensureSnapshot(context: McpServerContext): Promise<McpServerContext['snapshot']> {
  if (context.snapshot) return context.snapshot;
  const result = await queryLiveCampaigns(
    context.customerId,
    context.accessToken,
    context.developerToken,
    context.loginCustomerId,
    { forceRefresh: true }
  );
  if (!result.success) throw fromGoogleAdsFailure(result);
  context.snapshot = {
    campaigns: (result.campaigns || []) as Campaign[],
    keywords: (result.keywords || []) as Keyword[],
    searchTerms: (result.searchTerms || []) as SearchTerm[],
    fetchedAt: result.fetchedAt || new Date().toISOString(),
  };
  return context.snapshot;
}

async function callReadTool(
  name: string,
  args: Record<string, unknown>,
  context: McpServerContext
): Promise<McpToolResult> {
  const snapshot = await ensureSnapshot(context);
  const campaigns = snapshot?.campaigns || [];
  const currency = context.currency || 'USD';

  switch (name) {
    case 'get_account_overview': {
      const spend = campaigns.reduce((total, campaign) => total + (campaign.spend || 0), 0);
      const conversions = campaigns.reduce((total, campaign) => total + (campaign.conversions || 0), 0);
      const value = campaigns.reduce((total, campaign) => total + (campaign.conversionValue || 0), 0);
      const data = {
        accountId: context.customerId,
        accountName: context.accountName,
        currency,
        spend,
        conversions,
        cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
        roas: spend > 0 ? Number((value / spend).toFixed(2)) : 0,
        enabledCampaigns: campaigns.filter((campaign) => campaign.status === 'ENABLED').length,
        totalCampaigns: campaigns.length,
        dataFetchedAt: snapshot?.fetchedAt,
      };
      return textResult(
        data,
        `${context.accountName}: ${money(spend, currency)} spend, ${conversions} conversions, ${data.roas}x ROAS across ${campaigns.length} campaigns.`
      );
    }

    case 'get_campaigns': {
      let filtered = [...campaigns];
      if (args.status && args.status !== 'ALL') {
        filtered = filtered.filter((campaign) => campaign.status === args.status);
      }
      if (typeof args.search === 'string' && args.search.trim()) {
        const needle = args.search.trim().toLowerCase();
        filtered = filtered.filter((campaign) => campaign.name.toLowerCase().includes(needle));
      }
      const data = filtered.map((campaign) => ({
        campaignId: normalizeId(campaign.id),
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        budgetDaily: campaign.budgetDaily,
        spend: campaign.spend,
        conversions: campaign.conversions,
        cpa: campaign.cpa,
        roas: campaign.roas,
      }));
      return textResult(data, `Found ${data.length} campaigns.`);
    }

    case 'get_campaign_performance': {
      const campaign = resolveCampaign(campaigns, args);
      const data = {
        campaignId: normalizeId(campaign.id),
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        budgetDaily: campaign.budgetDaily,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr: campaign.ctr,
        cpc: campaign.cpc,
        conversions: campaign.conversions,
        cpa: campaign.cpa,
        conversionValue: campaign.conversionValue,
        roas: campaign.roas,
        previousPeriod: campaign.previousPeriod,
      };
      return textResult(
        data,
        `${campaign.name}: ${money(campaign.spend, currency)} spend, ${campaign.conversions} conversions, ${campaign.roas}x ROAS.`
      );
    }

    case 'get_search_terms': {
      let terms = [...(snapshot?.searchTerms || [])];
      if (typeof args.campaignId === 'string' && args.campaignId.trim()) {
        const campaign = resolveCampaign(campaigns, args);
        terms = terms.filter(
          (term) => term.campaignId === campaign.id || term.campaignName === campaign.name
        );
      }
      if (args.filter === 'NON_CONVERTING') {
        terms = terms.filter((term) => term.conversions === 0 && term.spend > 0);
      } else if (args.filter === 'HIGH_SPEND') {
        terms = terms.filter((term) => term.spend >= 30);
      }
      const data = terms.slice(0, 50).map((term) => ({
        searchTerm: term.searchTerm,
        campaignName: term.campaignName,
        clicks: term.clicks,
        spend: term.spend,
        conversions: term.conversions,
        cpa: term.cpa,
      }));
      return textResult(data, `Retrieved ${data.length} search terms.`);
    }

    case 'get_keywords': {
      let keywords = [...(snapshot?.keywords || [])];
      if (typeof args.campaignId === 'string' && args.campaignId.trim()) {
        const campaign = resolveCampaign(campaigns, args);
        keywords = keywords.filter(
          (keyword) => keyword.campaignId === campaign.id || keyword.campaignName === campaign.name
        );
      }
      const data = keywords.slice(0, 50).map((keyword) => ({
        keyword: keyword.keyword,
        matchType: keyword.matchType,
        qualityScore: keyword.qualityScore,
        spend: keyword.spend,
        conversions: keyword.conversions,
        cpa: keyword.cpa,
        status: keyword.status,
      }));
      return textResult(data, `Retrieved ${data.length} keywords.`);
    }

    case 'get_campaign_settings': {
      const campaign = resolveCampaign(campaigns, args);
      const settings = await fetchCampaignSettings(
        context.customerId,
        normalizeId(campaign.id),
        context.accessToken,
        context.developerToken,
        context.loginCustomerId
      );
      if (!settings.success || !settings.settings) {
        throw fromGoogleAdsFailure(settings);
      }
      return textResult(settings.settings, `Read live settings for ${campaign.name}.`);
    }

    case 'get_campaign_conversion_goals': {
      const campaign = resolveCampaign(campaigns, args);
      const goals = await fetchCampaignConversionGoals(
        context.customerId,
        normalizeId(campaign.id),
        context.accessToken,
        context.developerToken,
        context.loginCustomerId
      );
      if (!goals.success) throw fromGoogleAdsFailure(goals);
      return textResult(
        { campaignId: normalizeId(campaign.id), goals: goals.goals || [] },
        `Read ${goals.goals?.length || 0} conversion goals for ${campaign.name}.`
      );
    }

    case 'find_wasted_spend': {
      const nonConverting = (snapshot?.searchTerms || []).filter(
        (term) => term.conversions === 0 && term.spend > 0
      );
      const bleeders = campaigns.filter(
        (campaign) => campaign.conversions === 0 && campaign.spend >= 40
      );
      const queryWaste = nonConverting.reduce((total, term) => total + term.spend, 0);
      const campaignWaste = bleeders.reduce((total, campaign) => total + campaign.spend, 0);
      const data = {
        totalWastedSpend: Number((queryWaste + campaignWaste).toFixed(2)),
        nonConvertingQuerySpend: Number(queryWaste.toFixed(2)),
        zeroConversionCampaignSpend: Number(campaignWaste.toFixed(2)),
        zeroConversionCampaigns: bleeders.map((campaign) => ({
          campaignId: normalizeId(campaign.id),
          name: campaign.name,
          spend: campaign.spend,
        })),
        topNonConvertingQueries: nonConverting
          .sort((left, right) => right.spend - left.spend)
          .slice(0, 10)
          .map((term) => ({ searchTerm: term.searchTerm, spend: term.spend })),
      };
      return textResult(
        data,
        `Identified ${money(data.totalWastedSpend, currency)} of non-converting spend.`
      );
    }

    case 'analyze_budget_allocation': {
      const withSpend = campaigns.filter((campaign) => campaign.spend > 0);
      const ranked = [...withSpend].sort((left, right) => right.roas - left.roas);
      const data = {
        best: ranked.slice(0, 3).map((campaign) => ({
          campaignId: normalizeId(campaign.id),
          name: campaign.name,
          roas: campaign.roas,
          cpa: campaign.cpa,
          budgetDaily: campaign.budgetDaily,
        })),
        worst: ranked
          .slice(-3)
          .reverse()
          .map((campaign) => ({
            campaignId: normalizeId(campaign.id),
            name: campaign.name,
            roas: campaign.roas,
            cpa: campaign.cpa,
            budgetDaily: campaign.budgetDaily,
          })),
      };
      return textResult(data, 'Compared campaign efficiency for budget allocation.');
    }

    default:
      throw unsupported(`Tool "${name}" is not available.`);
  }
}

async function callWriteTool(
  name: string,
  args: Record<string, unknown>,
  context: McpServerContext,
  hooks: McpServerHooks
): Promise<McpToolResult> {
  const operation = getOperation(name);
  if (!operation) throw unsupported(`Operation "${name}" is not available.`);

  const validation = validateOperationArgs(operation, args);
  if (!validation.valid) throw invalidArgument(validation.errors.join(' '));

  const snapshot = await ensureSnapshot(context);
  const campaigns = snapshot?.campaigns || [];

  // Creation operations have no existing campaign to resolve or snapshot.
  if (operation.createsResource) {
    const operationContext = { customerId: context.customerId, accountCurrency: context.currency };
    const summary = operation.summarize(args, operationContext);
    const beforeSnapshot = operation.beforeSnapshot(args, operationContext);
    operation.buildCombined?.(args, operationContext);

    if (!hooks.prepareProposal) {
      throw toolError(
        'internal',
        'Proposal storage is not available, so no change can be prepared.',
        'Tell the user no change was made and to retry shortly.'
      );
    }

    const prepared = await hooks.prepareProposal(
      { operation: name, args, summary, beforeSnapshot },
      context
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: 'proposal_required',
            proposalId: prepared.proposalId,
            revision: prepared.revision,
            summary,
            message:
              'A proposal was prepared. Nothing has been changed in Google Ads. The user must approve this exact revision.',
          }),
        },
      ],
      structuredContent: {
        code: 'proposal_required',
        proposalId: prepared.proposalId,
        revision: prepared.revision,
        summary,
      },
    };
  }

  const campaign = resolveCampaign(campaigns, args);
  const campaignId = normalizeId(campaign.id);

  const settings = await fetchCampaignSettings(
    context.customerId,
    campaignId,
    context.accessToken,
    context.developerToken,
    context.loginCustomerId
  );
  if (!settings.success || !settings.settings) throw fromGoogleAdsFailure(settings);

  const campaignSnapshot: CampaignSnapshot = {
    campaignId,
    name: settings.settings.name,
    status: settings.settings.status,
    budgetDaily: settings.settings.budgetDaily,
    biddingStrategyType: settings.settings.biddingStrategyType,
    targetCpaMicros: settings.settings.targetCpaMicros,
    targetRoas: settings.settings.targetRoas,
    startDate: settings.settings.startDate,
    endDate: settings.settings.endDate,
    trackingUrlTemplate: settings.settings.trackingUrlTemplate,
    finalUrlSuffix: settings.settings.finalUrlSuffix,
    targetGoogleSearch: settings.settings.targetGoogleSearch,
    targetSearchNetwork: settings.settings.targetSearchNetwork,
    targetContentNetwork: settings.settings.targetContentNetwork,
    targetPartnerSearchNetwork: settings.settings.targetPartnerSearchNetwork,
    budgetResourceName: settings.settings.budgetResourceName,
    resourceName: settings.settings.resourceName,
  };

  const operationContext = { customerId: context.customerId, campaign: campaignSnapshot };
  const summary = operation.summarize(args, operationContext);
  const beforeSnapshot = operation.beforeSnapshot(args, operationContext);

  // Build the operations now so an invalid request fails before a proposal exists.
  operation.buildOperations(args, operationContext);

  if (!hooks.prepareProposal) {
    throw toolError(
      'internal',
      'Proposal storage is not available, so no change can be prepared.',
      'Tell the user no change was made and to retry shortly.'
    );
  }

  const prepared = await hooks.prepareProposal(
    {
      operation: name,
      args,
      summary,
      beforeSnapshot,
      campaignId,
      campaignName: campaignSnapshot.name,
    },
    context
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          code: 'proposal_required',
          proposalId: prepared.proposalId,
          revision: prepared.revision,
          summary,
          message:
            'A proposal was prepared. Nothing has been changed in Google Ads. The user must approve this exact revision.',
        }),
      },
    ],
    structuredContent: {
      code: 'proposal_required',
      proposalId: prepared.proposalId,
      revision: prepared.revision,
      summary,
    },
  };
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
  context: McpServerContext,
  hooks: McpServerHooks = {}
): Promise<McpToolResult> {
  try {
    const isRead = READ_TOOLS.some((tool) => tool.name === name);
    if (isRead) return await callReadTool(name, args, context);
    return await callWriteTool(name, args, context, hooks);
  } catch (error) {
    return errorResult(error);
  }
}

export async function handleMcpRequest(
  request: JsonRpcRequest,
  context: McpServerContext,
  hooks: McpServerHooks = {}
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize': {
      const requested = String(
        (request.params as { protocolVersion?: string } | undefined)?.protocolVersion || ''
      );
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : MCP_PROTOCOL_VERSION;
      const result: McpInitializeResult = {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'adoptimize-google-ads', version: '1.0.0' },
      };
      return jsonRpcSuccess(id, result);
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return jsonRpcSuccess(id, {});

    case 'ping':
      return jsonRpcSuccess(id, {});

    case 'tools/list':
      return jsonRpcSuccess(id, { tools: listMcpTools() });

    case 'tools/call': {
      const params = request.params as
        | { name?: string; arguments?: Record<string, unknown> }
        | undefined;
      const name = params?.name;
      if (!name) {
        return jsonRpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, 'Tool name is required.');
      }
      const known = listMcpTools().some((tool) => tool.name === name);
      if (!known) {
        return jsonRpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, `Unknown tool "${name}".`);
      }
      const result = await callMcpTool(name, params?.arguments || {}, context, hooks);
      return jsonRpcSuccess(id, result);
    }

    default:
      return jsonRpcError(
        id,
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        `Method "${request.method}" is not supported.`
      );
  }
}

/** Parse and dispatch a raw JSON-RPC payload. */
export async function handleMcpPayload(
  payload: unknown,
  context: McpServerContext,
  hooks: McpServerHooks = {}
): Promise<JsonRpcResponse> {
  if (!isJsonRpcRequest(payload)) {
    return jsonRpcError(null, JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid JSON-RPC request.');
  }
  return handleMcpRequest(payload, context, hooks);
}
