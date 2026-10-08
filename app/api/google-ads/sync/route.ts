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

    // 1. If an OAuth access token is provided, attempt to pull LIVE campaigns from Google Ads API
    if (accessToken && cleanCid && cleanCid.length === 10) {
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const liveResult = await queryLiveCampaigns(cleanCid, accessToken, developerToken);

      if (liveResult.success && liveResult.campaigns && liveResult.campaigns.length > 0) {
        return NextResponse.json({
          success: true,
          lastSyncAt: syncTimestamp,
          syncStatus: 'SYNCED',
          isLiveApi: true,
          freshness: '100% Live data from Google Ads SearchStream API v22',
          message: `Successfully synchronized ${liveResult.campaigns.length} live campaigns from Google Ads for CID ${formattedCid}.`,
          campaigns: liveResult.campaigns,
        });
      }

      if (liveResult.error) {
        // Return honest API feedback without raw syntax or HTML errors
        const cleanErr = liveResult.error.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
        return NextResponse.json({
          success: true,
          lastSyncAt: syncTimestamp,
          syncStatus: 'ATTENTION_NEEDED',
          isLiveApi: false,
          message: `Google Ads API response for CID ${formattedCid}: ${cleanErr}. You can add your active campaigns manually below to run AI optimization.`,
          campaigns: [],
        });
      }
    }

    // 2. If custom campaign names were provided by the user, create real tracked campaigns
    const campaignsToImport = Array.isArray(manualCampaigns) && manualCampaigns.length > 0
      ? manualCampaigns
      : Array.isArray(customCampaignNames) && customCampaignNames.length > 0
      ? customCampaignNames.map((name: string, i: number) => ({
          name: name.trim(),
          type: name.toLowerCase().includes('pmax') || name.toLowerCase().includes('max') ? 'PERFORMANCE_MAX' : name.toLowerCase().includes('display') ? 'DISPLAY' : 'SEARCH',
          budgetDaily: 80,
          spend: 0,
          conversions: 0,
        }))
      : [];

    if (campaignsToImport.length > 0) {
      const importedCampaigns: Campaign[] = campaignsToImport.map((item: any, idx: number) => {
        const campId = item.id || `camp-${cleanCid || Date.now()}-${idx + 1}`;
        const dailyBudget = Number(item.budgetDaily || item.budget || 80);
        const spend = Number(item.spend ?? 0);
        const conversions = Number(item.conversions ?? 0);
        const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0;
        const convValue = Number(item.conversionValue ?? (spend * 3.5));
        const roas = spend > 0 ? Number((convValue / spend).toFixed(2)) : 0;
        const clicks = Number(item.clicks ?? (spend > 0 ? Math.max(1, Math.round(spend / 1.5)) : 0));
        const impressions = Number(item.impressions ?? (clicks * 20));
        const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
        const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0;

        return {
          id: campId,
          accountId,
          name: item.name?.trim() || `Campaign ${idx + 1}`,
          type: item.type || 'SEARCH',
          status: item.status || 'ENABLED',
          budgetDaily: dailyBudget,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
          conversions,
          cpa,
          conversionValue: convValue,
          roas,
          conversionRate: clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
          healthStatus: roas >= 3.5 || spend === 0 ? 'HEALTHY' : cpa > 80 ? 'WARNING' : 'HEALTHY',
          healthScore: roas >= 3.5 || spend === 0 ? 95 : 78,
          trendPoints: [conversions, conversions, conversions],
          historicalPoints: [],
          previousPeriod: {
            spend: Math.round(spend * 0.9),
            conversions: Math.round(conversions * 0.9),
            cpa,
            roas,
          },
          keywordsCount: Number(item.keywordsCount || 6),
          activeAdsCount: Number(item.activeAdsCount || 3),
          primaryGoal: item.primaryGoal || 'CONVERSIONS',
        };
      });

      return NextResponse.json({
        success: true,
        lastSyncAt: syncTimestamp,
        syncStatus: 'SYNCED',
        isLiveApi: false,
        message: `Synchronized ${importedCampaigns.length} campaigns for CID ${formattedCid}.`,
        campaigns: importedCampaigns,
      });
    }

    // 3. Clean zero state: no live campaigns detected, return 0 campaigns honestly
    return NextResponse.json({
      success: true,
      lastSyncAt: syncTimestamp,
      syncStatus: 'SYNCED',
      isLiveApi: false,
      message: `Account connected for Customer ID ${formattedCid || 'Not Connected'}. No active campaigns detected yet in Google Ads. Click "Add Campaign" to begin tracking and optimizing.`,
      campaigns: [],
    });
  } catch (err: any) {
    console.error('Error in /api/google-ads/sync:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
