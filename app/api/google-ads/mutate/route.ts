import { NextRequest, NextResponse } from 'next/server';
import { withSubscription } from '@/lib/billing/access';
import { BillingError } from '@/lib/billing/config';
import { billingFailure, billingIdentity, readJson } from '@/lib/billing/http';
import { extractBearerToken } from '@/lib/ai/identity';
import { resolveAccountBinding, resolveFreshAccessToken } from '@/lib/ai/account-binding';
import {
  validateAndFormatCustomerId,
  mutateGoogleAdsCampaignStatus,
  mutateGoogleAdsCampaignBudget,
  createGoogleAdsCampaign,
  clearGoogleAdsCache,
} from '@/lib/google-ads-api';

export const POST = withSubscription(handleMutation);
async function handleMutation(req: NextRequest) {
  try {
    const identity = await billingIdentity(req);
    const firebaseToken = extractBearerToken(req)!;
    const binding = await resolveAccountBinding(identity.uid, firebaseToken);
    if (!binding?.isConnected) throw new BillingError(409, 'Connect a Google Ads account first.');
    const fresh = await resolveFreshAccessToken(identity.uid, firebaseToken);
    if (!fresh.accessToken) throw new BillingError(401, 'Reconnect Google Ads to continue.');
    const accessToken = fresh.accessToken;
    const loginCustomerId = binding.loginCustomerId;
    const body = await readJson(req, 65536);
    const {
      action,
      customerId,
      campaignId,
      status,
      budgetDaily,
      campaignData,
    } = body;

    if (typeof customerId !== 'string') throw new BillingError(400, 'A Google Ads customer ID is required.');
    const validation = validateAndFormatCustomerId(customerId);
    const cleanCid = validation.isValid ? validation.clean : String(customerId || '').replace(/\D/g, '');
    if (cleanCid !== binding.customerId) throw new BillingError(403, 'The campaign must belong to your connected account.');

    if (!cleanCid || cleanCid.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Google Ads Customer ID: "${customerId}".`,
        },
        { status: 400 }
      );
    }

    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid Google Ads access token is required.' },
        { status: 401 }
      );
    }

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
        clearGoogleAdsCache(cleanCid);
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
      if (!campaignId || !Number.isFinite(budgetNum) || budgetNum <= 0) {
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
        clearGoogleAdsCache(cleanCid);
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
      if (!campaignData || typeof campaignData !== 'object' || Array.isArray(campaignData)) throw new BillingError(400, 'Campaign details are required.');
      const campaign = campaignData as Record<string, unknown>;
      const campName = typeof campaign.name === 'string' ? campaign.name.trim() : '';
      const campBudget = campaign.budgetDaily === undefined ? 50 : Number(campaign.budgetDaily);
      const channelType = campaign.channelType ?? 'SEARCH';
      const campaignStatus = campaign.status ?? 'ENABLED';
      if (!Number.isFinite(campBudget) || campBudget <= 0 ||
        typeof channelType !== 'string' || !['SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO', 'PERFORMANCE_MAX', 'MULTI_CHANNEL'].includes(channelType) ||
        (campaignStatus !== 'ENABLED' && campaignStatus !== 'PAUSED')) throw new BillingError(400, 'Invalid campaign budget, channel, or status.');

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
          channelType,
          status: campaignStatus,
        },
        accessToken,
        devToken,
        loginCustomerId
      );

      if (result.success) {
        clearGoogleAdsCache(cleanCid);
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
  } catch (err: unknown) {
    if (err instanceof BillingError) return billingFailure(err);
    console.error('[Google Ads mutation] Request failed.');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error processing Google Ads mutation.',
      },
      { status: 500 }
    );
  }
}
