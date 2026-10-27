import { NextRequest, NextResponse } from 'next/server';
import {
  validateAndFormatCustomerId,
  mutateGoogleAdsCampaignStatus,
  mutateGoogleAdsCampaignBudget,
  createGoogleAdsCampaign,
} from '@/lib/google-ads-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      customerId,
      accessToken,
      loginCustomerId,
      developerToken,
      campaignId,
      status,
      budgetDaily,
      campaignData,
    } = body;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google OAuth authorization is required. Please re-authenticate your connection.',
          isAuthExpired: true,
        },
        { status: 401 }
      );
    }

    const validation = validateAndFormatCustomerId(customerId || '');
    const cleanCid = validation.isValid ? validation.clean : String(customerId || '').replace(/\D/g, '');

    if (!cleanCid || cleanCid.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Google Ads Customer ID: "${customerId}".`,
        },
        { status: 400 }
      );
    }

    const devToken = developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    // 1. Action: Set Campaign Status (Pause or Enable)
    if (action === 'set_campaign_status') {
      if (!campaignId || !status || (status !== 'ENABLED' && status !== 'PAUSED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing or invalid parameters: campaignId and status (ENABLED | PAUSED) are required.',
          },
          { status: 400 }
        );
      }

      const result = await mutateGoogleAdsCampaignStatus(
        cleanCid,
        String(campaignId),
        status,
        accessToken,
        devToken,
        loginCustomerId
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          action: 'set_campaign_status',
          campaignId: result.campaignId,
          status: result.status,
          message: `Campaign status changed to ${result.status} in Google Ads.`,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update campaign status in Google Ads.',
          details: result.details,
          statusCode: result.statusCode || 400,
        },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 400 }
      );
    }

    // 2. Action: Update Campaign Daily Budget
    if (action === 'update_campaign_budget') {
      const budgetNum = Number(budgetDaily);
      if (!campaignId || isNaN(budgetNum) || budgetNum <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing or invalid parameters: campaignId and a positive budgetDaily are required.',
          },
          { status: 400 }
        );
      }

      const result = await mutateGoogleAdsCampaignBudget(
        cleanCid,
        String(campaignId),
        budgetNum,
        accessToken,
        devToken,
        loginCustomerId
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          action: 'update_campaign_budget',
          campaignId,
          newDailyBudget: result.newDailyBudget,
          message: `Daily budget updated to $${budgetNum.toFixed(2)}/day in Google Ads.`,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update daily budget in Google Ads.',
          details: result.details,
          statusCode: result.statusCode || 400,
        },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 400 }
      );
    }

    // 3. Action: Create Campaign
    if (action === 'create_campaign') {
      const campName = String(campaignData?.name || '').trim();
      const campBudget = Number(campaignData?.budgetDaily || 50);

      if (!campName) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campaign name is required.',
          },
          { status: 400 }
        );
      }

      const result = await createGoogleAdsCampaign(
        cleanCid,
        {
          name: campName,
          budgetDaily: campBudget,
          channelType: campaignData?.channelType || 'SEARCH',
          status: campaignData?.status || 'ENABLED',
        },
        accessToken,
        devToken,
        loginCustomerId
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          action: 'create_campaign',
          campaignId: result.campaignId,
          campaignResourceName: result.campaignResourceName,
          name: campName,
          budgetDaily: campBudget,
          message: `Successfully created campaign "${campName}" in Google Ads!`,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create campaign in Google Ads.',
          details: result.details,
          statusCode: result.statusCode || 400,
        },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unknown action: "${action}". Supported actions: set_campaign_status, update_campaign_budget, create_campaign.`,
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/google-ads/mutate:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal error processing Google Ads mutation.',
      },
      { status: 500 }
    );
  }
}
