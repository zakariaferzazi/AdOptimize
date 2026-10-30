import { NextRequest, NextResponse } from 'next/server';

/**
 * Enterprise Google Ads OAuth 2.0 Server-Side Token Refresh Endpoint
 * (Architecture used by Optmyzr, Adspirer, WordStream)
 *
 * Exchanges a persistent long-lived OAuth Refresh Token for a fresh 3,600-second
 * Access Token via Google's token endpoint without requiring any browser popups or user intervention.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken, customerId, userEmail } = body;

    const clientId =
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
      '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

    // 1. If a refresh token and client_secret are provided: exchange directly with Google OAuth
    const activeRefreshToken =
      refreshToken ||
      process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (activeRefreshToken && clientSecret) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: activeRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenResponse.ok && tokenData.access_token) {
        return NextResponse.json({
          success: true,
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in || 3600,
          tokenType: tokenData.token_type || 'Bearer',
          refreshedAt: new Date().toISOString(),
          source: 'GOOGLE_OAUTH_SERVER_REFRESH',
          message: 'Access token refreshed automatically via server-side refresh token.',
        });
      }

      console.warn('Google OAuth token endpoint response:', tokenData);
    }

    // 2. If clientSecret is not yet set in environment: explain the requirement
    return NextResponse.json(
      {
        success: false,
        requiresInteractiveRefresh: true,
        reason: 'NO_SERVER_REFRESH_TOKEN',
        message:
          'Long-lived refresh token rotation requires GOOGLE_ADS_CLIENT_SECRET in server environment. Client-side GIS or 1-click re-authorization will be used.',
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
