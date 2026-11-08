import { NextRequest, NextResponse } from 'next/server';
import { executeProposal } from '@/lib/proposal-executor';
import { GoogleAdsAccount, ProposedAccountChange } from '@/types/adoptimize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawProposal = body?.proposal as ProposedAccountChange | undefined;
    const context = body?.context || {};
    const conversationId = String(context.conversationId || rawProposal?.conversationId || '');
    const proposalId = String(rawProposal?.proposalId || rawProposal?.id || '');
    const revision = Number(rawProposal?.revision);
    const payloadHash = String(rawProposal?.payloadHash || '');
    const accessToken = String(context.accessToken || '');
    const account = context.account as GoogleAdsAccount | undefined;

    if (!conversationId || !proposalId || !Number.isInteger(revision) || !payloadHash) {
      return NextResponse.json(
        { error: 'A proposal ID, revision, payload hash, and conversation ID are required.' },
        { status: 400 }
      );
    }
    if (!account || !accessToken) {
      return NextResponse.json(
        {
          error: 'A connected Google Ads account with a valid access token is required. Reconnect the account and try again.',
        },
        { status: 401 }
      );
    }

    const execution = await executeProposal(proposalId, {
      conversationId,
      revision,
      payloadHash,
      account,
      accessToken,
      userId: context.userId ? String(context.userId) : undefined,
    });

    const status =
      execution.result.status === 'succeeded'
        ? 200
        : execution.result.status === 'executed_unverified'
        ? 502
        : 409;

    return NextResponse.json(
      {
        success: execution.result.status === 'succeeded',
        status: execution.result.status,
        message: execution.message,
        result: execution.result,
        proposalId,
      },
      { status }
    );
  } catch (error) {
    console.error('Error in /api/ai/chat/execute:', error);
    return NextResponse.json(
      {
        error: 'The proposal execution endpoint could not complete safely. Retry the approval from the current proposal card.',
      },
      { status: 500 }
    );
  }
}
