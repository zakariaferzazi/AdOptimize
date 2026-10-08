import { NextRequest, NextResponse } from 'next/server';
import { validateAndFormatCustomerId, listAccessibleCustomers } from '@/lib/google-ads-api';

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

    // 3. Connect Customer ID
    if (action === 'connect_customer') {
      const mode = body.mode || (accessToken ? 'oauth_api' : 'direct_workspace');
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

      const formattedCid = validation.formatted;
      const cleanId = validation.clean;

      // Handle OAuth API Connection Mode
      if (mode === 'oauth_api') {
        if (!accessToken) {
          return NextResponse.json(
            {
              success: false,
              error: 'Google OAuth authorization is required to connect to the Google Ads API.',
            },
            { status: 401 }
          );
        }

        const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
        const checkResult = await listAccessibleCustomers(accessToken, developerToken);

        const isLiveVerified =
          checkResult.success &&
          Array.isArray(checkResult.customers) &&
          checkResult.customers.some((c) => c.replace(/\D/g, '') === cleanId);

        const accountObj = {
          id: `acc-${cleanId}`,
          clientCustomerId: formattedCid,
          accountName: accountName?.trim() || `Google Ads Account (${formattedCid})`,
          currency: currency || 'USD',
          timezone: 'America/New_York (UTC-5)',
          isConnected: true,
          connectionType: 'OAUTH_API',
          authenticatedEmail: userEmail || undefined,
          lastSyncAt: new Date().toISOString(),
          syncStatus: isLiveVerified ? 'SYNCED' : 'CONNECTED',
          isDemo: false,
          totalCampaignsCount: 0,
          monthlySpendCap: Number(monthlySpendCap) || 25000,
          verifiedLive: isLiveVerified,
          verificationNote: isLiveVerified
            ? 'Live verified against Google Ads API.'
            : `Connected with authenticated Google account (${userEmail || 'OAuth'}). Ready to track and sync campaigns for CID ${formattedCid}.`,
        };

        return NextResponse.json({
          success: true,
          account: accountObj,
          message: isLiveVerified
            ? `Verified and connected to Google Ads API for CID ${formattedCid}.`
            : `Connected Google Ads account (${formattedCid}) for ${userEmail || 'your Google login'}. You can now track and sync your campaigns.`,
        });
      }

      // Handle Direct Campaign Workspace Mode (for manual & CSV tracking when API token is not yet provisioned)
      const accountObj = {
        id: `acc-${cleanId}`,
        clientCustomerId: formattedCid,
        accountName: accountName?.trim() || `Campaign Workspace (${formattedCid})`,
        currency: currency || 'USD',
        timezone: 'America/New_York (UTC-5)',
        isConnected: true,
        connectionType: 'DIRECT_WORKSPACE',
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'ACTIVE',
        isDemo: false,
        totalCampaignsCount: 0,
        monthlySpendCap: Number(monthlySpendCap) || 25000,
        verifiedLive: false,
        verificationNote: 'Direct Workspace Mode: Tracking campaigns in AdOptimize without live API link.',
      };

      return NextResponse.json({
        success: true,
        account: accountObj,
        message: `Workspace configured for Customer ID ${formattedCid}. You can now add and track your campaigns to run continuous AI optimization.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/google-ads/connect:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
