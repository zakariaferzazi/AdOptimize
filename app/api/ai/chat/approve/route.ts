import { NextRequest, NextResponse } from 'next/server';
import { withSubscription } from '@/lib/billing/access';
import { extractBearerToken, requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { approveProposalRevision, ProposalError, toProposalView } from '@/lib/ai/proposals';
import { getStore } from '@/lib/store';
import { hydrateProposalIntoStore, syncProposalToFirestore } from '@/lib/store/firestore-fallback';

export const dynamic = 'force-dynamic';

/**
 * Approve one exact proposal revision.
 *
 * Approval is an explicit server-side action tied to the revision and payload
 * hash the user is looking at. Chat text can never reach this endpoint.
 * Destructive changes also require `acknowledge_risk: true`, which the UI only
 * sends after the user confirms the impact.
 */
export const POST = withSubscription(handleApprove);
async function handleApprove(req: NextRequest) {
  let proposalId = '';
  let userId = '';
  let idToken: string | undefined;

  try {
    const identity = await requireIdentity(req);
    userId = identity.uid;
    idToken = extractBearerToken(req);
    const body = await req.json();

    proposalId = String(body?.proposal_id || body?.proposalId || '');
    const revision = Number(body?.revision);
    const payloadHash = String(body?.payload_hash || body?.payloadHash || '');
    const acknowledgeRisk = body?.acknowledge_risk === true || body?.acknowledgeRisk === true;

    if (!proposalId || !Number.isInteger(revision) || !payloadHash) {
      return NextResponse.json({ error: 'proposal_id, revision and payload_hash are required.' }, { status: 400 });
    }

    await hydrateProposalIntoStore(proposalId, identity.uid, idToken);

    const approved = await approveProposalRevision({
      userId: identity.uid,
      proposalId,
      revision,
      payloadHash,
      acknowledgeRisk,
    });

    await syncProposalToFirestore(approved, idToken);

    return NextResponse.json({ success: true, proposal: toProposalView(approved) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ProposalError) {
      if (proposalId && userId && idToken) {
        const store = await getStore();
        const latest = await store.proposals.get(proposalId, userId);
        if (latest) await syncProposalToFirestore(latest, idToken);
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[AI Chat] Approval failed:', error);
    return NextResponse.json(
      { error: 'The proposal could not be approved. No Google Ads changes were made.' },
      { status: 500 }
    );
  }
}
