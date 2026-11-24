import { NextRequest, NextResponse } from 'next/server';
import { clearGoogleAdsCache } from '@/lib/google-ads-api';
import { billingFailure, billingIdentity, checkOrigin } from '@/lib/billing/http';
import { hash, rateLimit } from '@/lib/billing/store';
import { deleteStoredTokens } from '@/lib/google-ads/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const identity = await billingIdentity(req);
    await rateLimit(`ads-disconnect:${hash(identity.uid)}`, 10, 600);
    const body = await req.json().catch(() => ({}));
    if (typeof body.customerId === 'string' && /^[0-9-]{1,20}$/.test(body.customerId)) {
      clearGoogleAdsCache(body.customerId);
    }
    // Revoking is limited to the verified caller's own stored credentials.
    await deleteStoredTokens(identity.uid);

    return NextResponse.json({
      success: true,
      message: 'Google Ads account disconnected and cached data cleared.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return billingFailure(error);
  }
}
