import { NextRequest, NextResponse } from 'next/server';
import { ToolContext } from '@/lib/google-ads-tools';
import {
  clearGoogleAdsCache,
  mutateGoogleAdsCampaignBudget,
  mutateGoogleAdsCampaignStatus,
  createGoogleAdsCampaign,
  queryLiveCampaigns,
} from '@/lib/google-ads-api';
import { AuditLog, ProposedAccountChange } from '@/types/adoptimize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposal: rawProposal, context = {} } = body as {
      proposal: ProposedAccountChange;
      context?: any;
    };

    if (!rawProposal || !rawProposal.actionType) {
      return NextResponse.json(
        { error: 'Invalid proposal: actionType is required' },
        { status: 400 }
      );
    }
    const requiresCampaignId = rawProposal.actionType !== 'CREATE_CAMPAIGN';
    if (requiresCampaignId && !rawProposal.campaignId) {
      return NextResponse.json(
        { error: `Invalid proposal: campaignId is required for ${rawProposal.actionType}` },
        { status: 400 }
      );
    }
    if (rawProposal.actionType === 'CREATE_CAMPAIGN') {
      const payload = rawProposal.payload || {};
      if (!String(payload.name || rawProposal.campaignName || '').trim()) {
        return NextResponse.json(
          { error: 'Invalid proposal: campaign name is required to create a campaign' },
          { status: 400 }
        );
      }
      if (!Number.isFinite(Number(payload.budgetDaily)) || Number(payload.budgetDaily) <= 0) {
        return NextResponse.json(
          { error: 'Invalid proposal: a positive daily budget is required to create a campaign' },
          { status: 400 }
        );
      }
    }
    const proposal: ProposedAccountChange = {
      ...rawProposal,
      reason: rawProposal.reason || 'User confirmed this Google Ads action.',
      evidence: rawProposal.evidence || 'Confirmed by the user from the action card.',
      potentialRisks: rawProposal.potentialRisks || 'This change may affect campaign delivery or spend.',
      currentSettings: rawProposal.currentSettings || 'Current campaign settings',
      proposedChanges: rawProposal.proposedChanges || 'Apply the requested campaign change',
    };

    const toolContext: ToolContext = {
      userId: context.userId,
      account: context.account || { accountName: 'Google Ads Account', clientCustomerId: 'Connected', isConnected: true },
      campaigns: context.campaigns || [],
      keywords: context.keywords || [],
      searchTerms: context.searchTerms || [],
      auditLogs: context.auditLogs || [],
      anomalies: context.anomalies || [],
      insights: context.insights || [],
      recommendations: context.recommendations || [],
      rules: context.rules || [],
      accessToken: context.accessToken,
    };

    let result: {
      success: boolean;
      error?: string;
      message?: string;
      data?: Record<string, any>;
    };
    const customerId = String(toolContext.account.clientCustomerId || '').replace(/\D/g, '');
    const activeToken = toolContext.accessToken;
    if (!activeToken || customerId.length !== 10) {
      return NextResponse.json(
        { error: 'A connected Google Ads account with a valid access token is required.' },
        { status: 401 }
      );
    }

    const verifyCampaign = async (
      campaignId: string,
      expected?: { status?: 'ENABLED' | 'PAUSED'; budgetDaily?: number }
    ) => {
      let lastObservedStatus: string | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        clearGoogleAdsCache(customerId);
        const verified = await queryLiveCampaigns(
          customerId,
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId,
          { forceRefresh: true }
        );
        if (!verified.success) {
          throw new Error(verified.error || 'Google Ads change could not be verified.');
        }
        const campaign = (verified.campaigns || []).find((item: any) => String(item.id) === String(campaignId));
        if (!campaign) {
          throw new Error('Google Ads change succeeded but the campaign was not returned during verification.');
        }
        lastObservedStatus = campaign.status;
        const statusMatches = !expected?.status || campaign.status === expected.status;
        const budgetMatches =
          expected?.budgetDaily === undefined ||
          Math.abs(Number(campaign.budgetDaily || 0) - expected.budgetDaily) <= 0.01;
        if (statusMatches && budgetMatches) return campaign;

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      if (expected?.status) {
        throw new Error(
          `Google Ads still reports campaign status ${lastObservedStatus || 'UNKNOWN'}, not ${expected.status}. No success was reported.`
        );
      }
      throw new Error('Google Ads did not return the requested campaign settings after the mutation. No success was reported.');
    };

    const createAuditLog = (
      campaignId: string,
      campaignName: string,
      previousValue: string,
      newValue: string,
      reason: string,
      actionType: AuditLog['actionType']
    ): AuditLog => ({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId,
      campaignName,
      actionType,
      previousValue,
      newValue,
      reason,
      source: 'USER',
      userOrSystem: 'Authorized User via AI Marketing Agent',
      status: 'EXECUTED',
      canRevert: true,
    });

    switch (proposal.actionType) {
      case 'CREATE_CAMPAIGN': {
        const draft = proposal.payload || {};
        const creation = await createGoogleAdsCampaign(
          customerId,
          {
            name: String(draft.name || proposal.campaignName),
            budgetDaily: Number(draft.budgetDaily),
            channelType: String(draft.channelType || 'SEARCH'),
            status: 'PAUSED',
          },
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!creation.success) throw new Error(creation.error || 'Google Ads rejected the campaign draft.');
        result = {
          success: true,
          message: `Paused campaign draft "${draft.name || proposal.campaignName}" was created in Google Ads. It will not serve ads until enabled.`,
          data: { campaignId: creation.campaignId, campaignResourceName: creation.campaignResourceName },
        };
        break;
      }

      case 'UPDATE_BUDGET': {
        const newDailyBudget = proposal.payload?.newDailyBudget;
        const mutation = await mutateGoogleAdsCampaignBudget(
          customerId,
          proposal.campaignId,
          Number(newDailyBudget),
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!mutation.success) throw new Error(mutation.error || 'Google Ads rejected the budget update.');
        const verifiedCampaign = await verifyCampaign(proposal.campaignId, { budgetDaily: Number(newDailyBudget) });
        result = {
          success: true,
          data: {
            updatedCampaign: verifiedCampaign,
            verifiedCampaign,
            auditLog: createAuditLog(
              proposal.campaignId,
              verifiedCampaign.name,
              proposal.currentSettings,
              proposal.proposedChanges,
              proposal.reason,
              'BUDGET_CHANGE'
            ),
          },
          message: `Daily budget updated and verified in Google Ads for "${verifiedCampaign.name}".`,
        };
        break;
      }

      case 'PAUSE_CAMPAIGN': {
        const mutation = await mutateGoogleAdsCampaignStatus(
          customerId,
          proposal.campaignId,
          'PAUSED',
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!mutation.success) throw new Error(mutation.error || 'Google Ads rejected the campaign pause.');
        const verifiedCampaign = await verifyCampaign(proposal.campaignId, { status: 'PAUSED' });
        result = {
          success: true,
          data: {
            updatedCampaign: verifiedCampaign,
            verifiedCampaign,
            auditLog: createAuditLog(
              proposal.campaignId,
              verifiedCampaign.name,
              proposal.currentSettings,
              proposal.proposedChanges,
              proposal.reason,
              'CAMPAIGN_STATUS_CHANGE'
            ),
          },
          message: `Campaign "${verifiedCampaign.name}" was paused and verified in Google Ads.`,
        };
        break;
      }

      case 'ENABLE_CAMPAIGN': {
        const mutation = await mutateGoogleAdsCampaignStatus(
          customerId,
          proposal.campaignId,
          'ENABLED',
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!mutation.success) throw new Error(mutation.error || 'Google Ads rejected the campaign enable action.');
        const verifiedCampaign = await verifyCampaign(proposal.campaignId, { status: 'ENABLED' });
        result = {
          success: true,
          data: {
            updatedCampaign: verifiedCampaign,
            verifiedCampaign,
            auditLog: createAuditLog(
              proposal.campaignId,
              verifiedCampaign.name,
              proposal.currentSettings,
              proposal.proposedChanges,
              proposal.reason,
              'CAMPAIGN_STATUS_CHANGE'
            ),
          },
          message: `Campaign "${verifiedCampaign.name}" was enabled and verified in Google Ads.`,
        };
        break;
      }

      case 'REALLOCATE_BUDGET': {
        const { fromCampaignId, toCampaignId, fromNewBudget, toNewBudget } = proposal.payload || {};
        const fromMutation = await mutateGoogleAdsCampaignBudget(
          customerId,
          String(fromCampaignId),
          Number(fromNewBudget),
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!fromMutation.success) throw new Error(fromMutation.error || 'Google Ads rejected the source budget update.');
        const toMutation = await mutateGoogleAdsCampaignBudget(
          customerId,
          String(toCampaignId),
          Number(toNewBudget),
          activeToken,
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          toolContext.account.loginCustomerId
        );
        if (!toMutation.success) throw new Error(toMutation.error || 'Google Ads rejected the destination budget update.');
        const verifiedFrom = await verifyCampaign(String(fromCampaignId), { budgetDaily: Number(fromNewBudget) });
        const verifiedTo = await verifyCampaign(String(toCampaignId), { budgetDaily: Number(toNewBudget) });
        result = {
          success: true,
          message: `Budget reallocation was applied and verified in Google Ads: ${fromCampaignId} to $${fromNewBudget}/day and ${toCampaignId} to $${toNewBudget}/day.`,
          data: { from: verifiedFrom, to: verifiedTo },
        };
        break;
      }

      default: {
        return NextResponse.json(
          { error: `Unsupported proposal action: ${proposal.actionType}` },
          { status: 400 }
        );
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to execute proposed change in Google Ads.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
      proposalId: proposal.id,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat/execute:', err);
    return NextResponse.json(
      { error: err.message || 'Execution failed due to an unexpected error.' },
      { status: 502 }
    );
  }
}
