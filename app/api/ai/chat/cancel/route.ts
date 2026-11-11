import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { cancelProposalRevision, ProposalError } from '@/lib/ai/proposals';
import { recordProposalEvent } from '@/lib/ai/conversations';

export const dynamic = 'force-dynamic';

/**
 * Decline a proposal. The decision is stored server-side and recorded in the
 * conversation so the agent knows the user rejected it.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const body = await req.json();
    const proposalId = String(body?.proposal_id || body?.proposalId || '');
    if (!proposalId) return NextResponse.json({ error: 'proposal_id is required.' }, { status: 400 });

    const cancelled = await cancelProposalRevision({ userId: identity.uid, proposalId });
    try {
      await recordProposalEvent(cancelled, 'cancelled', { message: 'Declined by the user.' });
    } catch (error) {
      console.warn('[AI Chat] Could not record cancellation in conversation state:', error);
    }
    return NextResponse.json({ success: true, proposalId, status: 'cancelled' });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ProposalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AI Chat] Cancel failed:', error);
    return NextResponse.json({ error: 'The proposal could not be declined.' }, { status: 500 });
  }
}
