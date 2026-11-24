import { NextResponse } from 'next/server';
import { BillingError } from '@/lib/billing/config';
import { billingFailure, billingIdentity, checkOrigin } from '@/lib/billing/http';
import { hash, rateLimit } from '@/lib/billing/store';
import { deleteStoredTokens, freshAccessToken } from '@/lib/google-ads/vault';

export const dynamic = 'force-dynamic';

// Mints a short-lived access token. The refresh token never leaves the server.
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`ads-token:${hash(identity.uid)}`, 30, 60);
    const result = await freshAccessToken(identity.uid);
    if (!result.accessToken) throw new BillingError(404, result.error || 'Google Ads is not connected.', 'ads_not_connected');
    return NextResponse.json({ accessToken: result.accessToken, expiresAt: result.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`ads-token:${hash(identity.uid)}`, 30, 60);
    await deleteStoredTokens(identity.uid);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}
