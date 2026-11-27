import { NextRequest, NextResponse } from 'next/server';
import { BillingError } from '@/lib/billing/config';
import { billingFailure, billingIdentity } from '@/lib/billing/http';
import { hash, rateLimit } from '@/lib/billing/store';
import { completeAudit, getAuditUsage, releaseAudit, reserveAudit } from '@/lib/billing/audit-access';
import { AccountBindingError, resolveAccountBinding, resolveFreshAccessToken } from '@/lib/ai/account-binding';
import { runAdsAudit, validateAuditOptions } from '@/lib/google-ads/audit';
import { GoogleAdsRequestError } from '@/lib/google-ads/gaql';
import { ToolError } from '@/lib/mcp/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const identity = await billingIdentity(req);
    await rateLimit(`audit-usage:${hash(identity.uid)}`, 60, 60);
    return NextResponse.json({ usage: await getAuditUsage(identity.uid) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await billingIdentity(req);
    await rateLimit(`audit:${hash(identity.uid)}`, 120, 60);
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
    const reservation = await reserveAudit(identity.uid);
    let finished = false;
    try {
      const report = await runAdsAudit({
        customerId: binding.customerId, loginCustomerId: binding.loginCustomerId,
        accountName: binding.accountName, currency: binding.currency, accessToken,
      }, { ...options });
      const usage = reservation ? await completeAudit(reservation, identity.uid) : await getAuditUsage(identity.uid);
      const response = NextResponse.json({ report, usage }, { headers: { 'Cache-Control': 'no-store' } });
      finished = true;
      return response;
    } finally {
      if (reservation && !finished) await releaseAudit(reservation);
    }
  } catch (error) {
    if (error instanceof BillingError) return billingFailure(error);
    if (error instanceof AccountBindingError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof ToolError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('[Ads Audit] Request failed:', error);
    if (error instanceof GoogleAdsRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.info.statusCode || 502 });
    }
    return NextResponse.json({ error: 'The audit could not be completed. Please try again.' }, { status: 500 });
  }
}
