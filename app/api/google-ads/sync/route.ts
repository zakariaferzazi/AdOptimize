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

    // 1. If an OAuth access token is provided, pull LIVE campaigns from Google Ads API
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google OAuth authorization is required. Please authenticate to sync live Google Ads campaigns.',
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

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const liveResult = await queryLiveCampaigns(cleanCid, accessToken, developerToken);

    if (liveResult.success) {
      const realCampaigns = liveResult.campaigns || [];
      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'SYNCED',
        isLiveApi: true,
        freshness: '100% Live data from Google Ads SearchStream API v25',
        campaignsCount: realCampaigns.length,
        message: realCampaigns.length > 0
          ? `Successfully synchronized ${realCampaigns.length} live campaigns from Google Ads for CID ${formattedCid}.`
          : `Google Ads account ${formattedCid} is connected. No campaigns found in ads.google.com for this CID.`,
        campaigns: realCampaigns,
      });
    }

    // Google Ads API returned an error: pass it directly so it displays on the page
    const cleanErr = (liveResult.error || 'Google Ads API query failed')
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
        cid: formattedCid,
        message: `Google Ads API Error for CID ${formattedCid}: ${cleanErr}`,
        campaigns: [],
      },
      { status: liveResult.statusCode && liveResult.statusCode >= 400 ? liveResult.statusCode : 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/google-ads/sync:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
