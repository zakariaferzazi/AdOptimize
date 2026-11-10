import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { approveProposalRevision, ProposalError, toProposalView } from '@/lib/ai/proposals';

export const dynamic = 'force-dynamic';

/**
 * Approve one exact proposal revision.
 *
 * Approval is an explicit server-side action tied to the revision and payload
 * hash the user is looking at. Chat text can never reach this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const body = await req.json();

    const proposalId = String(body?.proposal_id || body?.proposalId || '');
    const revision = Number(body?.revision);
    const payloadHash = String(body?.payload_hash || body?.payloadHash || '');

    if (!proposalId || !Number.isInteger(revision) || !payloadHash) {
      return NextResponse.json(
        { error: 'proposal_id, revision and payload_hash are required.' },
        { status: 400 }
      );
    }

    const approved = await approveProposalRevision({
      userId: identity.uid,
      proposalId,
      revision,
      payloadHash,
    });

    return NextResponse.json({
      success: true,
      proposal: toProposalView(approved),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ProposalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AI Chat] Approval failed:', error);
    return NextResponse.json(
      { error: 'The proposal could not be approved. No Google Ads changes were made.' },
      { status: 500 }
    );
  }
}
