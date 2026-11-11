import { ProposedAccountChange, InteractiveRecommendation, Campaign } from '@/types/adoptimize';

/**
 * Model Context Protocol (MCP) Standard JSON-RPC 2.0 Types
 * Protocol specification: 2024-11-05
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcSuccessResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result: T;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse<T = any> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

export interface McpServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: Record<string, any>;
  prompts?: Record<string, any>;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpServerCapabilities;
  serverInfo: McpServerInfo;
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
  }>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  category?: 'read' | 'proposal_write';
  requiresApproval?: boolean;
}

export interface McpToolContent {
  type: 'text';
  text: string;
}

export interface McpToolCallResult {
  content: McpToolContent[];
  isError?: boolean;
  structuredData?: any;
  actionProposal?: ProposedAccountChange;
  recommendations?: InteractiveRecommendation[];
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
  };
}

export interface McpStructuredError {
  errorType: 'invalid_params' | 'not_found' | 'unauthorized' | 'validation_failed' | 'execution_error' | 'unsupported';
  message: string;
  details?: string;
  retryable: boolean;
  nextStep: string;
}
