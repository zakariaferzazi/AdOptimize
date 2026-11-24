import { NextRequest, NextResponse } from 'next/server';
import { withSubscription } from '@/lib/billing/access';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { AccountBindingError, resolveAccountBinding, resolveFreshAccessToken } from '@/lib/ai/account-binding';
import { runAdsAudit, validateAuditOptions } from '@/lib/google-ads/audit';
import { GoogleAdsRequestError } from '@/lib/google-ads/gaql';
import { ToolError } from '@/lib/mcp/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withSubscription(handleAudit);
async function handleAudit(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'A JSON audit request is required.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Audit options must be a JSON object.' }, { status: 400 });
    }
    const options = validateAuditOptions(body as Record<string, unknown>);
    const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const binding = await resolveAccountBinding(identity.uid, idToken);
    if (!binding?.isConnected) {
      return NextResponse.json({ error: 'Connect a Google Ads account to run an audit.' }, { status: 409 });
    }
    const { accessToken, error } = await resolveFreshAccessToken(identity.uid, idToken);
    if (!accessToken) return NextResponse.json({ error: error || 'Reconnect Google Ads to continue.' }, { status: 401 });
    const report = await runAdsAudit({
      customerId: binding.customerId, loginCustomerId: binding.loginCustomerId,
      accountName: binding.accountName, currency: binding.currency, accessToken,
    }, { ...options });
    return NextResponse.json({ report }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AccountBindingError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof ToolError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('[Ads Audit] Request failed:', error);
    if (error instanceof GoogleAdsRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.info.statusCode || 502 });
    }
    return NextResponse.json({ error: 'The audit could not be completed. Please try again.' }, { status: 500 });
  }
}
