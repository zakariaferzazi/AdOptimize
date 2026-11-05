import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { code, codeVerifier } = await req.json().catch(() => ({}));
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Authorization code is required.' }, { status: 400 });
    }

    const clientId =
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
      '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const redirectUri = 'https://adoptimize.app/api/google-ads/oauth-callback';
    const params: Record<string, string> = {
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (typeof codeVerifier === 'string' && codeVerifier.trim()) {
      params.code_verifier = codeVerifier.trim();
    }
    if (clientSecret) params.client_secret = clientSecret;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) {
      return NextResponse.json(
        { success: false, error: data.error_description || data.error || 'Google token exchange failed.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in) || 3600,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Google token exchange failed.' },
      { status: 500 }
    );
  }
}
