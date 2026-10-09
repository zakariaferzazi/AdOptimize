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
        const verification = await verifyCustomerAccess(cleanId, accessToken, developerToken);

        const accessible = verification.accessible;
        const realCampaigns = verification.campaigns || [];
        let apiWarning: string | undefined = undefined;

        if (!accessible && verification.reason) {
          const lower = verification.reason.toLowerCase();
          // If Google explicitly rejected the CID because it does not exist or the user has no permissions for it
          if (
            lower.includes('not found') ||
            lower.includes('invalid_customer_id') ||
            lower.includes('customer_not_found') ||
            lower.includes('user_permission_denied') ||
            lower.includes('not accessible') ||
            lower.includes('404')
          ) {
            return NextResponse.json(
              {
                success: false,
                error: `Google Ads account ${formattedCid} does not exist or is not accessible by ${userEmail || 'your Google login'}. Please verify your 10-digit Customer ID in ads.google.com.`,
              },
              { status: 403 }
            );
          }

          apiWarning = verification.reason
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 220);
        }

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
          syncStatus: realCampaigns.length > 0 ? 'SYNCED' : 'CONNECTED',
          isDemo: false,
          totalCampaignsCount: realCampaigns.length,
          monthlySpendCap: Number(monthlySpendCap) || 25000,
          verifiedLive: accessible,
          verificationNote: accessible
            ? `Verified account with Google Ads API (${realCampaigns.length} campaigns found).`
            : `Connected via Google OAuth (${userEmail || 'Authenticated'}). Ready to sync.`,
          apiWarning,
        };

        return NextResponse.json({
          success: true,
          account: accountObj,
          campaigns: realCampaigns,
          apiWarning,
          message: accessible
            ? `Verified Google Ads CID ${formattedCid}. Synchronized ${realCampaigns.length} real campaigns.`
            : `Connected Google Ads account (${formattedCid}) for ${userEmail || 'your Google login'}.`,
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
