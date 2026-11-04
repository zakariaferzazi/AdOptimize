import { NextRequest, NextResponse } from 'next/server';
import {
  validateAndFormatCustomerId,
  listAccessibleCustomers,
  queryLiveCampaigns,
  verifyCustomerAccess,
} from '@/lib/google-ads-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, customerId, accessToken, userEmail, accountName, currency, monthlySpendCap } = body;

    // 1. Generate Google Ads OAuth 2.0 URL
    if (action === 'get_oauth_url') {
      const clientId =
        process.env.GOOGLE_ADS_CLIENT_ID ||
        '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';
      const redirectUri = `${process.env.APP_URL || 'https://adoptimize.app'}/api/google-ads/oauth-callback`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords email profile');
      const state = `oauth_state_${Date.now()}`;

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${scope}&state=${state}&prompt=select_account`;

      return NextResponse.json({
        url: oauthUrl,
        state,
        note: 'Google Ads OAuth endpoint configured for AdWords scope.',
      });
    }

    // 2. Auto-Connect & Account Discovery (Adspirer 1-click model)
    // Connects Google Ads without requiring the user to look up or manually enter a 10-digit CID.
    if (action === 'auto_connect') {
      if (!accessToken) {
        return NextResponse.json({ error: 'OAuth Access Token is required.' }, { status: 401 });
      }

      const developerToken = body.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      let targetCid: string | null = customerId ? customerId.replace(/\D/g, '') : null;
      let accessibleCustomers: string[] = [];

      // If user did not provide a CID, automatically discover accessible Google Ads accounts
      if (!targetCid || targetCid.length !== 10) {
        const discovery = await listAccessibleCustomers(accessToken, developerToken);
        if (discovery.success && discovery.customers && discovery.customers.length > 0) {
          accessibleCustomers = discovery.customers;
          if (accessibleCustomers.length === 1) {
            targetCid = accessibleCustomers[0].replace(/\D/g, '');
          } else {
            // Multiple accounts: prompt user to pick their desired account with 1 click
            return NextResponse.json({
              success: true,
              requiresSelection: true,
              customers: accessibleCustomers,
              message: `Found ${accessibleCustomers.length} accessible Google Ads accounts. Select your account to complete connection.`,
            });
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              noAccountsFound: true,
              error: `No accessible Google Ads accounts found under ${userEmail || 'this Google login'}. Please make sure your Google account has access in ads.google.com.`,
              details: discovery.error,
            },
            { status: 404 }
          );
        }
      }

      // We have a target CID: verify permissions and pull live campaigns
      const formattedCid = `${targetCid.slice(0, 3)}-${targetCid.slice(3, 6)}-${targetCid.slice(6)}`;
      const verification = await verifyCustomerAccess(
        targetCid,
        accessToken,
        developerToken,
        body.loginCustomerId,
        userEmail
      );

      if (!verification.accessible) {
        const errorReason =
          verification.reason ||
          `Google Ads account ${formattedCid} could not be accessed with this Google account.`;
        return NextResponse.json(
          {
            success: false,
            error: errorReason,
            details: verification.details,
            statusCode: verification.statusCode || 403,
            cid: formattedCid,
            accessibleCustomers: verification.accessibleCustomers || accessibleCustomers,
          },
          { status: verification.statusCode && verification.statusCode >= 400 ? verification.statusCode : 403 }
        );
      }

      const realCampaigns = verification.campaigns || [];
      const realKeywords = verification.keywords || [];
      const realSearchTerms = verification.searchTerms || [];

      const accountObj: Record<string, any> = {
        id: `acc-${targetCid}`,
        clientCustomerId: formattedCid,
        accountName: accountName?.trim() || `Google Ads (${formattedCid})`,
        currency: verification.currency || currency || 'USD',
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
        verificationNote: `Verified real account with Google Ads (${realCampaigns.length} campaigns found).`,
      };

      const resolvedLoginCid = body.loginCustomerId || verification.loginCustomerIdUsed;
      if (resolvedLoginCid) {
        accountObj.loginCustomerId = resolvedLoginCid;
      }
      if (developerToken) {
        accountObj.developerToken = developerToken;
      }

      return NextResponse.json({
        success: true,
        autoConnected: true,
        account: accountObj,
        campaigns: realCampaigns,
        keywords: realKeywords,
        searchTerms: realSearchTerms,
        loginCustomerIdUsed: verification.loginCustomerIdUsed,
        message: `Connected Google Ads account ${formattedCid}! Successfully synchronized ${realCampaigns.length} live campaigns.`,
      });
    }

    // 3. Verify Google OAuth token & discover linked accounts
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

      return NextResponse.json({
        success: true,
        verified: false,
        customers: [],
        message: `Google account authenticated with AdWords permissions.`,
      });
    }

    // 4. Connect specific Customer ID
    if (action === 'connect_customer') {
      const validation = validateAndFormatCustomerId(customerId);

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
        const errorReason =
          verification.reason ||
          `Google Ads Customer ID ${formattedCid} was not found or is inaccessible with this Google account.`;
        return NextResponse.json(
          {
            success: false,
            error: errorReason,
            details: verification.details,
            statusCode: verification.statusCode || 403,
            isAuthExpired: verification.statusCode === 401 || verification.isAuthExpired,
            cid: formattedCid,
            accessibleCustomers: verification.accessibleCustomers,
            message: `Google Ads Verification Failed: ${errorReason}`,
          },
          { status: verification.statusCode && verification.statusCode >= 400 ? verification.statusCode : 403 }
        );
      }

      const realCampaigns = verification.campaigns || [];
      const realKeywords = verification.keywords || [];
      const realSearchTerms = verification.searchTerms || [];

      const accountObj: Record<string, any> = {
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
        verificationNote: `Verified real account with Google Ads (${realCampaigns.length} campaigns found).`,
      };

      const resolvedLoginCid = loginCustomerId || verification.loginCustomerIdUsed;
      if (resolvedLoginCid) {
        accountObj.loginCustomerId = resolvedLoginCid;
      }
      if (developerToken) {
        accountObj.developerToken = developerToken;
      }

      return NextResponse.json({
        success: true,
        account: accountObj,
        campaigns: realCampaigns,
        keywords: realKeywords,
        searchTerms: realSearchTerms,
        loginCustomerIdUsed: verification.loginCustomerIdUsed,
        message: `Verified Google Ads CID ${formattedCid}. Synchronized ${realCampaigns.length} live campaigns from ads.google.com.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/google-ads/connect:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
