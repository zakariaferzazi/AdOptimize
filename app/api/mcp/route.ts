import { NextRequest, NextResponse } from 'next/server';
import { handleMcpPayload, type McpServerContext } from '@/lib/mcp/google-ads-server';
import { newRequestStats } from '@/lib/google-ads/gaql';

const INTERNAL_MCP_SECRET = process.env.INTERNAL_MCP_SECRET || 'adoptimize-internal-mcp-secret';

/**
 * Private Google Ads MCP Server HTTP Endpoint (JSON-RPC 2.0).
 * Accessible internally to Adoptimize's backend components.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-mcp-internal-secret') || req.headers.get('authorization');
    const isAuthorized =
      authHeader === INTERNAL_MCP_SECRET ||
      authHeader === `Bearer ${INTERNAL_MCP_SECRET}` ||
      req.headers.get('sec-fetch-site') === 'same-origin';

    if (!isAuthorized) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: 'Unauthorized: Google Ads MCP server is private and accessible only to Adoptimize backend.',
          },
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const context: McpServerContext = body.context || {
      customerId: body.customerId || 'Private',
      accessToken: body.accessToken || '',
      currency: body.currency || 'USD',
      accountName: body.accountName || 'Google Ads Account',
      stats: newRequestStats(),
    };

    const rpcPayload = body.request || body;
    const rpcResponse = await handleMcpPayload(rpcPayload, context);
    return NextResponse.json(rpcResponse);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal server error processing MCP request.',
          data: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 }
    );
  }
}
