import { beforeEach, describe, expect, it, vi } from 'vitest';

const adsMock = vi.hoisted(() => ({
  settings: vi.fn(),
  goals: vi.fn(),
}));

const mutateMock = vi.hoisted(() => ({
  resources: vi.fn(),
  combined: vi.fn(),
}));

vi.mock('@/lib/google-ads-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads-api')>('@/lib/google-ads-api');
  return {
    ...actual,
    fetchCampaignSettings: adsMock.settings,
    fetchCampaignConversionGoals: adsMock.goals,
  };
});

vi.mock('@/lib/google-ads/mutate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/google-ads/mutate')>('@/lib/google-ads/mutate');
  return {
    ...actual,
    mutateGoogleAdsResources: mutateMock.resources,
    mutateGoogleAdsCombined: mutateMock.combined,
  };
});

import { executeProposal } from '@/lib/ai/execution';
import { createProposal, approveProposalRevision, hashPayload } from '@/lib/ai/proposals';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import type { ProposalRecord } from '@/lib/store/types';

const CUSTOMER = '1234567890';

function settings(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    settings: {
      campaignId: '111',
      resourceName: `customers/${CUSTOMER}/campaigns/111`,
      name: 'Search - High Intent',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      budgetResourceName: `customers/${CUSTOMER}/campaignBudgets/999`,
      budgetDaily: 50,
      biddingStrategyType: 'TARGET_CPA',
      targetCpaMicros: 20_000_000,
      ...overrides,
    },
  };
}

async function seedProposal(
  operation: string,
  args: Record<string, unknown>,
  beforeSnapshot: Record<string, unknown>,
  overrides: Partial<ProposalRecord> = {}
): Promise<ProposalRecord> {
  const now = new Date().toISOString();
  const record: ProposalRecord = {
    id: `proposal-${Math.random().toString(36).slice(2)}`,
    user_id: 'user-1',
    conversation_id: 'conversation-1',
    account_id: CUSTOMER,
    revision: 1,
    status: 'approved',
    operation,
    payload: JSON.stringify(args),
    payload_hash: hashPayload(args),
    before_snapshot: JSON.stringify(beforeSnapshot),
    supersedes_id: null,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    result: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  await memoryStore.proposals.create(record);
  return record;
}

function executeInput(record: ProposalRecord, overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    proposalId: record.id,
    revision: record.revision,
    payloadHash: record.payload_hash,
    customerId: CUSTOMER,
    accessToken: 'token',
    ...overrides,
  };
}

beforeEach(() => {
  resetMemoryStore();
  vi.clearAllMocks();
  adsMock.settings.mockResolvedValue(settings());
  adsMock.goals.mockResolvedValue({ success: true, goals: [] });
  mutateMock.resources.mockResolvedValue({ success: true, results: [] });
  mutateMock.combined.mockResolvedValue({ success: true, responses: [] });
});

describe('execution authorization', () => {
  it('refuses a proposal that was never approved', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' },
      { status: 'pending_approval' }
    );

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('conflict');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('refuses a stale revision', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );

    const outcome = await executeProposal(executeInput(record, { revision: 2 }));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('conflict');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('refuses a mismatched payload hash', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );

    const outcome = await executeProposal(executeInput(record, { payloadHash: 'tampered' }));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('conflict');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('refuses a proposal bound to a different Google Ads account', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );

    const outcome = await executeProposal(executeInput(record, { customerId: '9999999999' }));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('permission');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('refuses a proposal owned by another user', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );

    const outcome = await executeProposal(executeInput(record, { userId: 'user-2' }));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('not_found');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('executes an approved proposal exactly once', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );
    adsMock.settings
      .mockResolvedValueOnce(settings())
      .mockResolvedValueOnce(settings({ status: 'PAUSED' }));

    const first = await executeProposal(executeInput(record));
    const second = await executeProposal(executeInput(record));

    expect(first.status).toBe('succeeded');
    expect(second.status).toBe('succeeded');
    // The mutate ran once; the second call returned the stored outcome.
    expect(mutateMock.resources).toHaveBeenCalledTimes(2); // validateOnly + real
  });
});

describe('execution safety', () => {
  it('stops on drift before mutating', async () => {
    const record = await seedProposal(
      'update_campaign_budget',
      { campaignId: '111', newDailyBudget: 75 },
      { campaignId: '111', budgetDaily: 50 }
    );
    adsMock.settings.mockResolvedValue(settings({ budgetDaily: 60 }));

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('drift');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('re-validates the payload immediately before execution', async () => {
    const record = await seedProposal(
      'update_campaign_budget',
      { campaignId: '111', newDailyBudget: -5 },
      { campaignId: '111', budgetDaily: 50 }
    );

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('invalid_argument');
    expect(mutateMock.resources).not.toHaveBeenCalled();
  });

  it('runs validateOnly before the real mutate', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );
    adsMock.settings
      .mockResolvedValueOnce(settings())
      .mockResolvedValueOnce(settings({ status: 'PAUSED' }));

    await executeProposal(executeInput(record));

    expect(mutateMock.resources).toHaveBeenCalledTimes(2);
    expect(mutateMock.resources.mock.calls[0][3]).toEqual({ validateOnly: true });
    expect(mutateMock.resources.mock.calls[1][3]).toBeUndefined();
  });

  it('does not mutate when validateOnly fails', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );
    mutateMock.resources.mockResolvedValueOnce({
      success: false,
      statusCode: 400,
      error: 'Invalid status',
    });

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('invalid_argument');
    expect(mutateMock.resources).toHaveBeenCalledTimes(1);
  });

  it('reports executed_unverified when the read-back does not match', async () => {
    const record = await seedProposal(
      'update_campaign_budget',
      { campaignId: '111', newDailyBudget: 75 },
      { campaignId: '111', budgetDaily: 50 }
    );
    adsMock.settings
      .mockResolvedValueOnce(settings())
      .mockResolvedValue(settings({ budgetDaily: 60 }));

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('executed_unverified');
    expect(outcome.user_message.toLowerCase()).not.toContain('verified from the live account');
  });

  it('reports succeeded only when the read-back matches', async () => {
    const record = await seedProposal(
      'update_campaign_budget',
      { campaignId: '111', newDailyBudget: 75 },
      { campaignId: '111', budgetDaily: 50 }
    );
    adsMock.settings
      .mockResolvedValueOnce(settings())
      .mockResolvedValue(settings({ budgetDaily: 75 }));

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('succeeded');
    expect(outcome.after?.budgetDaily).toBe(75);
  });

  it('writes an audit record for a verified execution', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' }
    );
    adsMock.settings
      .mockResolvedValueOnce(settings())
      .mockResolvedValueOnce(settings({ status: 'PAUSED' }));

    await executeProposal(executeInput(record));

    const events = await memoryStore.audit.list('user-1');
    expect(events.some((event) => event.event === 'execution_verified')).toBe(true);
  });
});

describe('campaign creation execution', () => {
  it('creates a campaign and verifies it from a fresh read', async () => {
    const record = await seedProposal(
      'create_campaign',
      { name: 'New Search Campaign', budgetDaily: 40, channelType: 'SEARCH' },
      { exists: false, name: 'New Search Campaign' }
    );
    mutateMock.combined.mockResolvedValue({
      success: true,
      responses: [{ campaignResult: { resourceName: `customers/${CUSTOMER}/campaigns/555` } }],
    });
    adsMock.settings.mockResolvedValue(
      settings({ campaignId: '555', name: 'New Search Campaign', status: 'PAUSED', budgetDaily: 40 })
    );

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('succeeded');
    expect(outcome.realIds?.campaignId).toBe('555');
  });

  it('validates the creation before applying it', async () => {
    const record = await seedProposal(
      'create_campaign',
      { name: 'New Search Campaign', budgetDaily: 40, channelType: 'SEARCH' },
      { exists: false, name: 'New Search Campaign' }
    );
    mutateMock.combined.mockResolvedValue({
      success: true,
      responses: [{ campaignResult: { resourceName: `customers/${CUSTOMER}/campaigns/555` } }],
    });
    adsMock.settings.mockResolvedValue(
      settings({ campaignId: '555', name: 'New Search Campaign', status: 'PAUSED', budgetDaily: 40 })
    );

    await executeProposal(executeInput(record));
    expect(mutateMock.combined.mock.calls[0][2]).toEqual({ validateOnly: true });
  });

  it('rejects an app campaign without an app ID', async () => {
    const record = await seedProposal(
      'create_campaign',
      { name: 'App Campaign', budgetDaily: 40, channelType: 'MULTI_CHANNEL' },
      { exists: false, name: 'App Campaign' }
    );

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.type).toBe('invalid_argument');
    expect(mutateMock.combined).not.toHaveBeenCalled();
  });

  it('builds an app campaign with the APP_CAMPAIGN sub-type', async () => {
    const record = await seedProposal(
      'create_campaign',
      {
        name: 'App Campaign',
        budgetDaily: 40,
        channelType: 'MULTI_CHANNEL',
        appId: 'com.example.app',
        appStore: 'GOOGLE_APP_STORE',
      },
      { exists: false, name: 'App Campaign' }
    );
    mutateMock.combined.mockResolvedValue({
      success: true,
      responses: [{ campaignResult: { resourceName: `customers/${CUSTOMER}/campaigns/777` } }],
    });
    adsMock.settings.mockResolvedValue(
      settings({ campaignId: '777', name: 'App Campaign', status: 'PAUSED', budgetDaily: 40 })
    );

    const outcome = await executeProposal(executeInput(record));
    expect(outcome.status).toBe('succeeded');

    const operations = mutateMock.combined.mock.calls[0][0] as Array<Record<string, any>>;
    const campaignCreate = operations.find((operation) => operation.campaignOperation);
    expect(campaignCreate?.campaignOperation.create.advertisingChannelSubType).toBe('APP_CAMPAIGN');
    expect(campaignCreate?.campaignOperation.create.appCampaignSetting.appId).toBe('com.example.app');
    expect(campaignCreate?.campaignOperation.create.appCampaignSetting.biddingStrategyGoalType).toBe(
      'OPTIMIZE_FOR_INSTALLS'
    );
  });
});

describe('proposal approval', () => {
  it('approves only the exact revision and hash', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' },
      { status: 'pending_approval' }
    );

    await expect(
      approveProposalRevision({
        userId: 'user-1',
        proposalId: record.id,
        revision: 2,
        payloadHash: record.payload_hash,
      })
    ).rejects.toThrow(/revised/i);

    const approved = await approveProposalRevision({
      userId: 'user-1',
      proposalId: record.id,
      revision: 1,
      payloadHash: record.payload_hash,
    });
    expect(approved.status).toBe('approved');
  });

  it('refuses to approve an expired proposal', async () => {
    const record = await seedProposal(
      'update_campaign_status',
      { campaignId: '111', status: 'PAUSED' },
      { campaignId: '111', status: 'ENABLED' },
      { status: 'pending_approval', expires_at: new Date(Date.now() - 1000).toISOString() }
    );

    await expect(
      approveProposalRevision({
        userId: 'user-1',
        proposalId: record.id,
        revision: 1,
        payloadHash: record.payload_hash,
      })
    ).rejects.toThrow(/expired/i);
  });

  it('supersedes the previous pending proposal when a new one is created', async () => {
    const first = await createProposal({
      userId: 'user-1',
      conversationId: 'conversation-1',
      accountId: CUSTOMER,
      prepared: {
        operation: 'update_campaign_budget',
        args: { campaignId: '111', newDailyBudget: 10 },
        summary: 'Set budget to 10',
        beforeSnapshot: { campaignId: '111', budgetDaily: 50 },
      },
    });

    const second = await createProposal({
      userId: 'user-1',
      conversationId: 'conversation-1',
      accountId: CUSTOMER,
      prepared: {
        operation: 'update_campaign_budget',
        args: { campaignId: '111', newDailyBudget: 7 },
        summary: 'Set budget to 7',
        beforeSnapshot: { campaignId: '111', budgetDaily: 50 },
      },
    });

    const previous = await memoryStore.proposals.get(first.id, 'user-1');
    expect(previous?.status).toBe('superseded');
    expect(second.revision).toBe(2);
  });
});
