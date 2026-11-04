/**
 * Server-side Google Ads OAuth 2.0 Token Refresh Engine
 * Exchanges stored long-lived refresh tokens for fresh 3,600s access tokens
 * via Google's official OAuth token endpoint (https://oauth2.googleapis.com/token).
 *
 * Used across token refresh, background sync, and live campaign mutations
 * to ensure active user sessions are completely uninterrupted.
 */

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  source?: string;
  error?: string;
  requiresInteractive?: boolean;
}

export async function executeGoogleAdsTokenRefresh(options?: {
  refreshToken?: string;
  clientSecret?: string;
  clientId?: string;
}): Promise<TokenRefreshResult> {
  const activeRefreshToken =
    options?.refreshToken?.trim() ||
    process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() ||
    process.env.GOOGLE_REFRESH_TOKEN?.trim() ||
    process.env.REFRESH_TOKEN?.trim();

  if (!activeRefreshToken) {
    return {
      success: false,
      requiresInteractive: true,
      error: 'No Google Ads OAuth refresh token found. Save a refresh token or connect your account.',
    };
  }

  const activeClientId =
    options?.clientId?.trim() ||
    process.env.GOOGLE_ADS_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID?.trim() ||
    '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';

  const activeClientSecret =
    options?.clientSecret?.trim() ||
    process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.CLIENT_SECRET?.trim();

  const params: Record<string, string> = {
    client_id: activeClientId,
    grant_type: 'refresh_token',
    refresh_token: activeRefreshToken,
  };

  if (activeClientSecret) {
    params.client_secret = activeClientSecret;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || activeRefreshToken,
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'Bearer',
        source: 'GOOGLE_OAUTH_SERVER_REFRESH',
      };
    }

    const errorMsg = data.error_description || data.error || 'Google OAuth token refresh rejected';
    return {
      success: false,
      error: errorMsg,
      requiresInteractive: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network failure communicating with Google OAuth endpoint',
      requiresInteractive: false,
    };
  }
}
