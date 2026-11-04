import { NextRequest, NextResponse } from 'next/server';
import { executeGoogleAdsTool, ToolContext } from '@/lib/google-ads-tools';
import { ProposedAccountChange } from '@/types/adoptimize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposal, context = {} } = body as {
      proposal: ProposedAccountChange;
      context?: any;
    };

    if (!proposal || !proposal.actionType || !proposal.campaignId) {
      return NextResponse.json(
        { error: 'Invalid proposal: actionType and campaignId are required' },
        { status: 400 }
      );
    }

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

    let result;

    switch (proposal.actionType) {
      case 'UPDATE_BUDGET': {
        const newDailyBudget = proposal.payload?.newDailyBudget;
        result = await executeGoogleAdsTool(
          'update_campaign_budget',
          {
            campaignNameOrId: proposal.campaignId,
            newDailyBudget,
            reason: proposal.reason,
            isConfirmed: true,
          },
          toolContext
        );
        break;
      }

      case 'PAUSE_CAMPAIGN': {
        result = await executeGoogleAdsTool(
          'pause_campaign',
          {
            campaignNameOrId: proposal.campaignId,
            reason: proposal.reason,
            isConfirmed: true,
          },
          toolContext
        );
        break;
      }

      case 'ENABLE_CAMPAIGN': {
        result = await executeGoogleAdsTool(
          'enable_campaign',
          {
            campaignNameOrId: proposal.campaignId,
            reason: proposal.reason,
            isConfirmed: true,
          },
          toolContext
        );
        break;
      }

      case 'REALLOCATE_BUDGET': {
        const { fromCampaignId, toCampaignId, fromNewBudget, toNewBudget } = proposal.payload || {};
        const resFrom = await executeGoogleAdsTool(
          'update_campaign_budget',
          { campaignNameOrId: fromCampaignId, newDailyBudget: fromNewBudget, isConfirmed: true, reason: 'Budget reallocation' },
          toolContext
        );
        const resTo = await executeGoogleAdsTool(
          'update_campaign_budget',
          { campaignNameOrId: toCampaignId, newDailyBudget: toNewBudget, isConfirmed: true, reason: 'Budget reallocation' },
          toolContext
        );
        result = {
          success: resFrom.success && resTo.success,
          message: `Successfully reallocated daily budget: updated ${fromCampaignId} to $${fromNewBudget}/d and ${toCampaignId} to $${toNewBudget}/d.`,
          data: { from: resFrom.data, to: resTo.data },
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
      { status: 500 }
    );
  }
}
