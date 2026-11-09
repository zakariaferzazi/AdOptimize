import { NextRequest, NextResponse } from 'next/server';
import {
  approveProposal,
  proposalExpiresAt,
  getProposalRecord,
  findProposalRecord,
  getLatestProposal,
  updateProposalStatus,
} from '@/lib/chat-proposal-store';

const EXPIRATION_MINUTES = Number(process.env.AI_PROPOSAL_EXPIRATION_MINUTES || 60);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conversationId = String(body.conversation_id || '');
    const proposalId = String(body.proposal_id || '');
    const revision = Number(body.revision);
    const payloadHash = String(body.payload_hash || '');

    if (!conversationId || !proposalId || !Number.isInteger(revision) || !payloadHash) {
      return NextResponse.json({ error: 'conversation_id, proposal_id, revision, and payload_hash are required.' }, { status: 400 });
    }

    const record =
      (await getProposalRecord(conversationId, proposalId)) ||
      (await findProposalRecord(proposalId));
    if (!record) return NextResponse.json({ error: 'Proposal was not found.' }, { status: 404 });
    const canonicalConversationId = record.conversation_id;
    const latest = await getLatestProposal(canonicalConversationId);
    if (!latest || latest.id !== record.id || latest.revision !== record.revision) {
      return NextResponse.json({ error: 'This proposal is not the latest revision.' }, { status: 409 });
    }
    if (Date.now() >= proposalExpiresAt(record, EXPIRATION_MINUTES)) {
      await updateProposalStatus(canonicalConversationId, proposalId, 'expired');
      return NextResponse.json({ error: 'This proposal has expired and cannot be approved.' }, { status: 409 });
    }

    const result = await approveProposal(
      canonicalConversationId,
      proposalId,
      revision,
      payloadHash,
      EXPIRATION_MINUTES
    );
    return NextResponse.json({
      success: true,
      alreadyApproved: result.status === 'already_approved',
      proposal: result.proposal,
    });
  } catch (error: any) {
    console.error('[AI Chat] Proposal approval failed:', error);
    return NextResponse.json({ error: error.message || 'Proposal approval failed.' }, { status: 409 });
  }
}
