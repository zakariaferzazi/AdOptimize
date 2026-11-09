import { describe, expect, it } from 'vitest';
import {
  approveProposal,
  getProposalRecord,
  registerChatProposal,
} from '@/lib/chat-proposal-store';
import { executeGoogleAdsTool } from '@/lib/google-ads-tools';
import type { ProposedAccountChange } from '@/types/adoptimize';

const appUrl = 'https://play.google.com/store/apps/details?id=com.speaker.watereject';

function createProposal(budgetDaily: number): ProposedAccountChange {
  return {
    id: `draft-${budgetDaily}`,
    actionType: 'CREATE_CAMPAIGN',
    campaignId: `draft-${budgetDaily}`,
    campaignName: 'Speaker App Campaign',
    currentSettings: 'Campaign does not exist yet',
    proposedChanges: `Create a PAUSED MULTI_CHANNEL campaign with a daily budget of USD ${budgetDaily.toFixed(2)}`,
    reason: 'Test campaign creation.',
    evidence: 'App installs requested.',
    potentialRisks: 'The campaign will remain paused.',
    status: 'PENDING_APPROVAL',
    payload: {
      name: 'Speaker App Campaign',
      budgetDaily,
      channelType: 'MULTI_CHANNEL',
      objective: 'APP_INSTALLS',
      appUrl,
      appId: 'com.speaker.watereject',
      appStore: 'GOOGLE_APP_STORE',
      status: 'PAUSED',
    },
  };
}

describe('proposal lifecycle', () => {
  it('revises the authoritative proposal in place and rejects the old revision', async () => {
    const conversationId = `proposal-revision-${Date.now()}`;
    const first = await registerChatProposal(createProposal(6), conversationId, undefined, {
      accountId: '1234567890',
    });
    const firstRevision = first.revision;
    const revised = await registerChatProposal(
      { ...createProposal(7), revision: firstRevision! + 1 },
      conversationId,
      first.proposalId,
      { accountId: '1234567890' }
    );

    expect(revised.proposalId).toBe(first.proposalId);
    expect(revised.revision).toBe(firstRevision! + 1);
    expect(revised.payload?.budgetDaily).toBe(7);

    await expect(
      approveProposal(
        conversationId,
        first.proposalId!,
        firstRevision!,
        first.payloadHash!
      )
    ).rejects.toThrow('stale');

    const record = await getProposalRecord(conversationId, first.proposalId!);
    expect(record?.status).toBe('pending_approval');
    expect(record?.revision).toBe(firstRevision! + 1);
    expect(record?.payload.budgetDaily).toBe(7);
  });

  it('keeps the app identifier in an app-install proposal payload', async () => {
    const result = await executeGoogleAdsTool(
      'create_campaign',
      {
        name: 'Speaker App Campaign',
        budgetDaily: 6,
        channelType: 'MULTI_CHANNEL',
        objective: 'APP_INSTALLS',
        appUrl,
      },
      {
        account: {
          clientCustomerId: '1234567890',
          accountName: 'Test',
          currency: 'USD',
          isConnected: true,
        } as any,
        campaigns: [],
        keywords: [],
        searchTerms: [],
        auditLogs: [],
        anomalies: [],
        insights: [],
        recommendations: [],
        rules: [],
      }
    );

    expect(result.success).toBe(true);
    expect(result.actionProposal?.payload?.appId).toBe('com.speaker.watereject');
    expect(result.actionProposal?.payload?.appStore).toBe('GOOGLE_APP_STORE');
  });
});
