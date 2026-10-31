import { NextResponse } from 'next/server';
import { resetQuotaCooldown, clearGoogleAdsCache } from '@/lib/google-ads-api';

export async function POST() {
  resetQuotaCooldown();
  clearGoogleAdsCache();
  return NextResponse.json({
    success: true,
    message: 'Google Ads rate limit cooldown and memory cache have been reset.',
  });
}
