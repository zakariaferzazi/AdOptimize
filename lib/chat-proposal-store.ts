import { ProposedAccountChange } from '@/types/adoptimize';

interface StoredProposal {
  proposal: ProposedAccountChange;
  approvalToken: string;
  consumed: boolean;
}

const proposals = new Map<string, StoredProposal>();

export function registerChatProposal(proposal: ProposedAccountChange): ProposedAccountChange {
  const approvalToken = crypto.randomUUID();
  const proposalId = proposals.has(proposal.id)
    ? `${proposal.id}-${crypto.randomUUID()}`
    : proposal.id;
  const registered: ProposedAccountChange = {
    ...proposal,
    id: proposalId,
    revision: proposal.revision || 1,
    approvalToken,
    status: 'PENDING_APPROVAL',
  };
  proposals.set(registered.id, { proposal: registered, approvalToken, consumed: false });
  return registered;
}

export function supersedeChatProposal(proposalId: string): void {
  const stored = proposals.get(proposalId);
  if (!stored || stored.consumed) return;
  stored.proposal = { ...stored.proposal, status: 'SUPERSEDED' };
  stored.consumed = true;
}

export function consumeChatProposalAuthorization(
  proposal: ProposedAccountChange,
  approvalToken: string | undefined
): { valid: true; proposal: ProposedAccountChange } | { valid: false; error: string } {
  if (!approvalToken) {
    return { valid: false, error: 'This action requires an explicit approval button click.' };
  }
  const stored = proposals.get(proposal.id);
  if (!stored || stored.approvalToken !== approvalToken) {
    return { valid: false, error: 'This approval is no longer valid. Review the latest proposal and approve that version.' };
  }
  if (stored.consumed || stored.proposal.status !== 'PENDING_APPROVAL') {
    return { valid: false, error: 'This proposal is no longer pending and cannot be executed.' };
  }
  if ((proposal.revision || 1) !== (stored.proposal.revision || 1)) {
    return { valid: false, error: 'This proposal is stale. Review the latest proposal before approving.' };
  }
  stored.consumed = true;
  stored.proposal = { ...stored.proposal, status: 'APPROVED' };
  return { valid: true, proposal: stored.proposal };
}

export function restoreChatProposalAfterFailure(proposalId: string): void {
  const stored = proposals.get(proposalId);
  if (!stored) return;
  stored.consumed = false;
  stored.proposal = { ...stored.proposal, status: 'PENDING_APPROVAL' };
}
