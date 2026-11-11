import { newRequestStats, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { emptyState, type AgentState } from '@/lib/ai/agent-state';
import { executeTool, getToolKind, listToolSpecs, type ToolRuntime } from '@/lib/ai/tools';
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
 * A protocol adapter over the agent's capability registry: the same read
 * tools, the same proposal-only write operations and the same structured
 * errors are exposed over MCP JSON-RPC. Write tools never mutate; the
 * deterministic execution engine remains the only path that changes an account.
 */

export interface McpServerContext extends GoogleAdsContext {
  /** Conversation state for `update_task`; an empty in-memory state when absent. */
  state?: AgentState;
}

export interface McpServerHooks {
  saveProposal?: ToolRuntime['saveProposal'];
}

export function listMcpTools(): McpToolDefinition[] {
  return listToolSpecs().map((spec) => ({
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema as unknown as Record<string, unknown>,
    annotations:
      spec.kind === 'read'
        ? { readOnlyHint: true, openWorldHint: true }
        : spec.kind === 'memory'
        ? { readOnlyHint: false, idempotentHint: true }
        : { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }));
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
  context: McpServerContext,
  hooks: McpServerHooks = {}
): Promise<McpToolResult> {
  context.stats = context.stats || newRequestStats();
  let state = context.state || emptyState();
  const outcome = await executeTool(name, args || {}, {
    ads: context,
    getState: () => state,
    setState: (next) => {
      state = next;
      context.state = next;
    },
    saveProposal: hooks.saveProposal,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(outcome.payload) }],
    structuredContent: outcome.payload as Record<string, unknown>,
    ...(outcome.isError ? { isError: true } : {}),
  };
}

export async function handleMcpRequest(
  request: JsonRpcRequest,
  context: McpServerContext,
  hooks: McpServerHooks = {}
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize': {
      const requested = String((request.params as { protocolVersion?: string } | undefined)?.protocolVersion || '');
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : MCP_PROTOCOL_VERSION;
      const result: McpInitializeResult = {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'adoptimize-google-ads', version: '2.0.0' },
      };
      return jsonRpcSuccess(id, result);
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
    case 'ping':
      return jsonRpcSuccess(id, {});

    case 'tools/list':
      return jsonRpcSuccess(id, { tools: listMcpTools() });

    case 'tools/call': {
      const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      const name = params?.name;
      if (!name) return jsonRpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, 'Tool name is required.');
      if (!getToolKind(name)) return jsonRpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, `Unknown tool "${name}".`);
      return jsonRpcSuccess(id, await callMcpTool(name, params?.arguments || {}, context, hooks));
    }

    default:
      return jsonRpcError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method "${request.method}" is not supported.`);
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
