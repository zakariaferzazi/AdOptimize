import { NextRequest, NextResponse } from 'next/server';
import { clearGoogleAdsCache } from '@/lib/google-ads-api';
import { clearTokenData } from '@/lib/token-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { customerId, userId, userEmail } = body;

    clearGoogleAdsCache(customerId);
    await clearTokenData({ customerId, userId, userEmail });

    return NextResponse.json({
      success: true,
      message: 'Google Ads account disconnected and cached data cleared.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error disconnecting account' },
      { status: 500 }
    );
  }
}
