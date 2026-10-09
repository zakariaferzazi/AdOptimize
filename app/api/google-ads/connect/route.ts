import { NextRequest, NextResponse } from 'next/server';
import { validateAndFormatCustomerId, listAccessibleCustomers, queryLiveCampaigns, verifyCustomerAccess } from '@/lib/google-ads-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, customerId, accessToken, userEmail, accountName, currency, monthlySpendCap } = body;

    // 1. Generate Google Ads OAuth 2.0 URL
    if (action === 'get_oauth_url') {
      const clientId =
        process.env.GOOGLE_ADS_CLIENT_ID ||
        '1019046039336-bi6a6loj5gtlhq2b9kno56j4h8nidapt.apps.googleusercontent.com';
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/google-ads/oauth-callback`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords email profile');
      const state = `oauth_state_${Date.now()}`;

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

      return NextResponse.json({
        url: oauthUrl,
        state,
        note: 'Google Ads OAuth endpoint configured for AdWords scope.',
      });
    }

    // 2. Verify Google OAuth token & discover linked accounts
    if (action === 'verify_oauth_token') {
      if (!accessToken) {
        return NextResponse.json({ error: 'OAuth Access Token is required.' }, { status: 400 });
      }

      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const apiResult = await listAccessibleCustomers(accessToken, developerToken);

      if (apiResult.success && apiResult.customers && apiResult.customers.length > 0) {
        return NextResponse.json({
          success: true,
          verified: true,
          customers: apiResult.customers,
          message: `Found ${apiResult.customers.length} accessible Google Ads accounts for ${userEmail || 'your login'}.`,
        });
      }

      let userFriendlyMessage = `No active Google Ads accounts discovered under ${userEmail || 'this Google login'}. Enter your 10-digit Customer ID manually.`;
      if (apiResult.error) {
        if (!developerToken || apiResult.error.toLowerCase().includes('developer-token') || apiResult.error.toLowerCase().includes('developer token')) {
          userFriendlyMessage = `Google account authenticated with AdWords permissions. Enter your 10-digit Customer ID (CID) to connect.`;
        } else {
          userFriendlyMessage = `Google account authenticated. Note: ${apiResult.error.slice(0, 150)}. Enter your 10-digit Customer ID to connect.`;
        }
      }

      return NextResponse.json({
        success: true,
        verified: false,
        customers: [],
        message: userFriendlyMessage,
      });
    }

    // 3. Connect Customer ID (Real Google Ads API only)
    if (action === 'connect_customer') {
      const validation = validateAndFormatCustomerId(customerId);

      // STRICT VALIDATION: Reject any fake or invalid customer IDs
      if (!validation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error || 'Invalid Customer ID format. Google Ads Customer IDs must be exactly 10 digits.',
          },
          { status: 400 }
        );
      }

      if (!accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google OAuth authorization is required. Please sign in with your Google account to connect Google Ads.',
          },
          { status: 401 }
        );
      }

      const formattedCid = validation.formatted;
      const cleanId = validation.clean;
      const loginCustomerId = body.loginCustomerId || undefined;
      const developerToken = body.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

      const verification = await verifyCustomerAccess(cleanId, accessToken, developerToken, loginCustomerId, userEmail);

      if (!verification.accessible) {
        const errorReason = verification.reason || `Google Ads Customer ID ${formattedCid} was not found or is inaccessible with this Google account.`;
        return NextResponse.json(
          {
            success: false,
            error: errorReason,
            details: verification.details,
            statusCode: verification.statusCode || 403,
            cid: formattedCid,
            accessibleCustomers: verification.accessibleCustomers,
            message: `Google Ads Verification Failed: ${errorReason}`,
          },
          { status: verification.statusCode && verification.statusCode >= 400 ? verification.statusCode : 403 }
        );
      }

      const realCampaigns = verification.campaigns || [];
      const accountObj = {
        id: `acc-${cleanId}`,
        clientCustomerId: formattedCid,
        accountName: accountName?.trim() || `Google Ads (${formattedCid})`,
        currency: currency || 'USD',
        timezone: 'America/New_York (UTC-5)',
        isConnected: true,
        connectionType: 'OAUTH_API',
        authenticatedEmail: userEmail || undefined,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'SYNCED',
        isDemo: false,
        totalCampaignsCount: realCampaigns.length,
        monthlySpendCap: Number(monthlySpendCap) || 25000,
        verifiedLive: true,
        verificationNote: `Verified real account with Google Ads API (${realCampaigns.length} campaigns found).`,
      };

      return NextResponse.json({
        success: true,
        account: accountObj,
        campaigns: realCampaigns,
        message: `Verified Google Ads CID ${formattedCid}. Synchronized ${realCampaigns.length} live campaigns from ads.google.com.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/google-ads/connect:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
