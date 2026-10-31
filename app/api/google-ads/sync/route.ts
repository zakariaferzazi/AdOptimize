import { NextRequest, NextResponse } from 'next/server';
import { Campaign } from '@/types/adoptimize';
import { validateAndFormatCustomerId, queryLiveCampaigns } from '@/lib/google-ads-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      accountId = 'acc-primary',
      customerId = '',
      accountName = 'Google Ads Account',
      accessToken,
      manualCampaigns = [],
      customCampaignNames = [],
    } = body;

    const validation = validateAndFormatCustomerId(customerId);
    const cleanCid = validation.isValid ? validation.clean : customerId.replace(/\D/g, '');
    const formattedCid = validation.isValid ? validation.formatted : customerId;
    const syncTimestamp = new Date().toISOString();

    // 1. If an OAuth access token is not available, return unauthenticated state so client refreshes
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          syncStatus: 'UNAUTHENTICATED',
          isAuthExpired: true,
          statusCode: 401,
          error: 'Google Ads OAuth authorization token is required to synchronize live campaigns.',
          message: 'Google Ads authorization session expired. Please refresh your Google connection to sync live campaigns.',
          campaigns: [],
        },
        { status: 401 }
      );
    }

    if (!cleanCid || cleanCid.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Customer ID: "${customerId}". Google Ads Customer IDs must be exactly 10 digits.`,
        },
        { status: 400 }
      );
    }

    const loginCustomerId = body.loginCustomerId || undefined;
    const developerToken = body.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const liveResult = await queryLiveCampaigns(cleanCid, accessToken, developerToken, loginCustomerId);

    if (liveResult.success) {
      const realCampaigns = liveResult.campaigns || [];
      const realKeywords = liveResult.keywords || [];
      const realSearchTerms = liveResult.searchTerms || [];
      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'SYNCED',
        isLiveApi: true,
        freshness: 'Live data from Google Ads',
        campaignsCount: realCampaigns.length,
        loginCustomerIdUsed: liveResult.loginCustomerIdUsed,
        currency: liveResult.currency,
        message: realCampaigns.length > 0
          ? `Successfully synchronized ${realCampaigns.length} live campaigns from Google Ads for account ${formattedCid}.`
          : `Google Ads account ${formattedCid} is connected. No campaigns found in this account.`,
        campaigns: realCampaigns,
        keywords: realKeywords,
        searchTerms: realSearchTerms,
      });
    }

    // If Google Ads returns 401 (token expired): explicitly notify caller to trigger token refresh
    if (liveResult.statusCode === 401 || liveResult.isAuthExpired) {
      return NextResponse.json(
        {
          success: false,
          lastSyncAt: syncTimestamp,
          syncStatus: 'AUTH_EXPIRED',
          isAuthExpired: true,
          statusCode: 401,
          error: liveResult.error || 'Google Ads authorization session expired. Please re-authenticate your Google account to refresh your connection.',
          message: 'Google Ads session expired. Please refresh your Google connection to synchronize live campaigns.',
          campaigns: [],
        },
        { status: 401 }
      );
    }

    // Google Ads returned an error: pass it directly so it displays on the page
    const cleanErr = (liveResult.error || 'Google Ads query failed')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    return NextResponse.json(
      {
        success: false,
        lastSyncAt: syncTimestamp,
        syncStatus: 'ERROR',
        isLiveApi: false,
        apiError: cleanErr,
        error: cleanErr,
        details: liveResult.details,
        statusCode: liveResult.statusCode || 400,
        isAuthExpired: false,
        cid: formattedCid,
        accessibleCustomers: liveResult.accessibleCustomers || [],
        message: `Google Ads notice for account ${formattedCid}: ${cleanErr}`,
        campaigns: [],
      },
      { status: liveResult.statusCode && liveResult.statusCode >= 400 ? liveResult.statusCode : 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/google-ads/sync:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
