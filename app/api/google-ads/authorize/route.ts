import { NextResponse } from 'next/server';
import { billingFailure, billingIdentity, checkOrigin } from '@/lib/billing/http';
import { hash, rateLimit } from '@/lib/billing/store';
import { beginAuthorization } from '@/lib/google-ads/vault';

export const dynamic = 'force-dynamic';

// Starts the incremental Google Ads consent flow. Only the Google URL reaches the browser.
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`ads-authorize:${hash(identity.uid)}`, 10, 600);
    return NextResponse.json({ url: await beginAuthorization(identity.uid) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}
