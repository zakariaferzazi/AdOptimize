import { NextRequest, NextResponse } from 'next/server';
import { executeGoogleAdsTokenRefresh } from '@/lib/google-token-refresh';

/**
 * Enterprise Google Ads OAuth 2.0 Server-Side Token Refresh Endpoint
 * (Architecture used by Optmyzr, Adspirer, WordStream)
 *
 * Automatically exchanges a stored long-lived OAuth Refresh Token for a fresh 3,600-second
 * Access Token via Google's token endpoint without requiring any browser popups or user intervention.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken, clientSecret, customerId, userEmail, userId } = body;

    const result = await executeGoogleAdsTokenRefresh({
      refreshToken,
      clientSecret,
    });

    if (result.success && result.accessToken) {
      return NextResponse.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn || 3600,
        tokenType: result.tokenType || 'Bearer',
        refreshedAt: new Date().toISOString(),
        source: result.source || 'GOOGLE_OAUTH_SERVER_REFRESH',
        message: 'Access token generated automatically using stored refresh token.',
      });
    }

    return NextResponse.json(
      {
        success: false,
        requiresInteractiveRefresh: result.requiresInteractive ?? true,
        reason: result.error || 'REFRESH_FAILED',
        message:
          result.error ||
          'Could not rotate access token using stored credentials. Interactive re-authorization required.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error refreshing Google Ads access token:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Token refresh failed' },
      { status: 500 }
    );
  }
}
