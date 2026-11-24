import { NextRequest, NextResponse } from 'next/server';
import { handleMcpPayload, type McpServerContext } from '@/lib/mcp/google-ads-server';
import { newRequestStats } from '@/lib/google-ads/gaql';
import { withSubscription } from '@/lib/billing/access';
import { BillingError } from '@/lib/billing/config';
import { billingFailure, billingIdentity, readJson } from '@/lib/billing/http';
import { extractBearerToken } from '@/lib/ai/identity';
import { resolveAccountBinding, resolveFreshAccessToken } from '@/lib/ai/account-binding';

/**
 * Private Google Ads MCP Server HTTP Endpoint (JSON-RPC 2.0).
 * Requires the account owner's Firebase identity and an active Pro subscription.
 */
export const POST = withSubscription(handleMcp);
async function handleMcp(req: NextRequest) {
  try {
    const identity = await billingIdentity(req);
    const firebaseToken = extractBearerToken(req)!;
    const binding = await resolveAccountBinding(identity.uid, firebaseToken);
    if (!binding?.isConnected) throw new BillingError(409, 'Connect a Google Ads account first.');
    const fresh = await resolveFreshAccessToken(identity.uid, firebaseToken);
    if (!fresh.accessToken) throw new BillingError(401, 'Reconnect Google Ads to continue.');
    const body = await readJson(req, 65536);
    if (body.context || body.customerId || body.accessToken) throw new BillingError(400, 'MCP account credentials must not be supplied by the client.');
    const context: McpServerContext = {
      customerId: binding.customerId,
      loginCustomerId: binding.loginCustomerId,
      accessToken: fresh.accessToken,
      currency: binding.currency,
      accountName: binding.accountName,
      stats: newRequestStats(),
    };

    const rpcPayload = body.request || body;
    const rpcResponse = await handleMcpPayload(rpcPayload, context);
    return NextResponse.json(rpcResponse);
  } catch (err: unknown) {
    if (err instanceof BillingError) return billingFailure(err);
    console.error('[MCP] Request failed.');
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal server error processing MCP request.',
        },
      },
      { status: 500 }
    );
  }
}
