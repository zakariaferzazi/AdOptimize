import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeGoogleAds, metrics } from './helpers/fake-google-ads';
import { getRequest, jsonRequest } from './helpers/model';
import { invalidateGaqlCache, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { runPerformanceReport } from '@/lib/google-ads/performance-report';
import { buildPerformanceCsv } from '@/lib/google-ads/report-csv';
import { appLogEntry } from '@/lib/activity';
import { memoryStore, resetMemoryStore } from '@/lib/store/memory';
import type { AuditEventRecord, ProposalRecord } from '@/lib/store/types';

const mocks = vi.hoisted(() => ({ unauthorized: false, connected: true }));
vi.mock('@/lib/ai/identity', () => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    requireIdentity: async () => {
      if (mocks.unauthorized) throw new UnauthorizedError('Sign in required.');
      return { uid: 'report-user' };
    },
  };
});
vi.mock('@/lib/ai/account-binding', () => ({
  resolveAccountBinding: async () => ({
    customerId: '1234567890', accountName: 'Acme', currency: 'USD', isConnected: mocks.connected,
  }),
  resolveFreshAccessToken: async () => ({ accessToken: 'token' }),
  AccountBindingError: class AccountBindingError extends Error {},
}));
vi.mock('@/lib/store', () => ({
  getStore: async () => memoryStore,
  isDurableStore: () => true,
}));
import { POST as reportPost } from '@/app/api/google-ads/report/route';
import { GET as activityGet } from '@/app/api/activity/route';

let fake: FakeGoogleAds;
let context: GoogleAdsContext;
const dates = { startDate: '2026-10-10', endDate: '2026-10-16' };

beforeEach(() => {
  mocks.unauthorized = false;
  mocks.connected = true;
  fake = new FakeGoogleAds();
  vi.stubGlobal('fetch', fake.fetch);
  invalidateGaqlCache();
  resetMemoryStore();
  context = { customerId: '1234567890', accessToken: 'token', accountName: 'Acme', currency: 'USD' };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('live performance reports', () => {
  it('uses exact selected and previous dates and ignores browser account claims', async () => {
    const response = await reportPost(jsonRequest('http://localhost/api/google-ads/report', {
      ...dates, customerId: '9999999999',
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const { report } = await response.json();
    expect(report.dateRange).toMatchObject(dates);
    expect(report.previousRange).toMatchObject({ startDate: '2026-10-03', endDate: '2026-10-09' });
    expect(report.totals).toMatchObject({ cost: 3000, conversions: 190 });
    const queries = fake.queries().filter((request) => request.query?.includes('segments.date'));
    expect(queries).toHaveLength(2);
    expect(queries.some((request) => request.query?.includes("BETWEEN '2026-10-10' AND '2026-10-16'"))).toBe(true);
    expect(queries.some((request) => request.query?.includes("BETWEEN '2026-10-03' AND '2026-10-09'"))).toBe(true);
    expect(fake.requests.every((request) => request.url.includes('/customers/1234567890/'))).toBe(true);
    expect(fake.mutates()).toEqual([]);
  });

  it('keeps unavailable ratios empty in a single clean CSV table and preserves safe campaign names', async () => {
    fake.account.campaigns[0].name = '=1+1';
    fake.account.campaigns[0].metrics = metrics(100, 0, 0, 0);
    const report = await runPerformanceReport(context, dates);
    const campaign = report.campaigns.find((row) => row.id === '111')!;
    expect(campaign.metrics).toMatchObject({ cpa: null, roas: null });
    const csv = buildPerformanceCsv([campaign], 'USD');
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('"Spend (USD)"');
    expect(csv.split('\r\n')[1]).toBe(`"'=1+1","111","ENABLED","SEARCH","100.00","0","0","0","0.00","",""`);
  });

  it('keeps account totals complete when campaign details are capped', async () => {
    const template = fake.account.campaigns[0];
    fake.account.campaigns = Array.from({ length: 201 }, (_, index) => ({
      ...template, id: String(10000 + index), metrics: metrics(10, 1),
    }));
    const report = await runPerformanceReport(context, dates);
    expect(report.campaigns).toHaveLength(200);
    expect(report.totals.cost).toBe(2010);
    expect(report.warnings.join(' ')).toContain('1 additional campaigns');
  });

  it('rejects invalid and future dates rather than relabelling a cached report', async () => {
    const invalid = await reportPost(jsonRequest('http://localhost/api/google-ads/report', {
      startDate: dates.endDate, endDate: dates.startDate,
    }));
    expect(invalid.status).toBe(400);
    expect(fake.requests).toEqual([]);
    await expect(runPerformanceReport(context, { startDate: '2099-01-01', endDate: '2099-01-02' })).rejects.toThrow('future');
    expect(fake.queries('campaign')).toHaveLength(0);
  });

  it('does not present a failed live read as an empty successful report', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.failNext((request) => request.from === 'campaign', 'USER_PERMISSION_DENIED', 'authorizationError');
    const response = await reportPost(jsonRequest('http://localhost/api/google-ads/report', dates));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.json()).not.toHaveProperty('report');
  });

  it('requires an authenticated connected account', async () => {
    mocks.connected = false;
    expect((await reportPost(jsonRequest('http://localhost/api/google-ads/report', dates))).status).toBe(409);
    mocks.unauthorized = true;
    expect((await reportPost(jsonRequest('http://localhost/api/google-ads/report', dates))).status).toBe(401);
    expect(fake.requests).toEqual([]);
  });
});

function event(id: string, overrides: Partial<AuditEventRecord> = {}): AuditEventRecord {
  return {
    id, user_id: 'report-user', account_id: '1234567890', event: 'proposal_approved',
    proposal_id: null, conversation_id: null, timestamp: '2026-10-16T12:00:00.000Z',
    details: '{}', ...overrides,
  };
}

describe('durable account activity', () => {
  it('scopes by user and account before stable pagination, including equal timestamps', async () => {
    for (let index = 0; index < 65; index += 1) {
      await memoryStore.audit.append(event(`event-${String(index).padStart(3, '0')}`));
      await memoryStore.audit.append(event(`other-account-${index}`, { account_id: '9999999999' }));
      await memoryStore.audit.append(event(`other-user-${index}`, { user_id: 'different-user' }));
    }
    const first = await activityGet(getRequest('http://localhost/api/activity?customerId=9999999999'));
    const page = await first.json();
    expect(first.headers.get('Cache-Control')).toBe('no-store');
    expect(page.entries).toHaveLength(50);
    expect(page.entries.every((entry: { id: string }) => entry.id.startsWith('event-'))).toBe(true);
    const second = await activityGet(getRequest(`http://localhost/api/activity?cursor=${encodeURIComponent(page.nextCursor)}`));
    const older = await second.json();
    expect(older.entries).toHaveLength(15);
    expect(older.nextCursor).toBeNull();
    expect(new Set([...page.entries, ...older.entries].map((entry) => entry.id)).size).toBe(65);
  });

  it('preserves verified, failed and unverified execution outcomes and snapshots after conversation deletion', async () => {
    const proposal: ProposalRecord = {
      id: 'proposal-1', user_id: 'report-user', account_id: '1234567890', conversation_id: 'deleted-conversation',
      operation: 'update_campaign_budget', revision: 1, status: 'executed_unverified',
      payload: '{}', payload_hash: 'hash', before_snapshot: '{"budget":50}', supersedes_id: null,
      expires_at: null, created_at: dates.startDate, updated_at: dates.endDate,
      meta: JSON.stringify({ summary: 'Raise Brand budget', target: { kind: 'campaign', label: 'Brand' }, changes: ['Budget 50 to 70'] }),
      result: JSON.stringify({ before: { budget: 50 }, after: { budget: 60 }, user_message: 'Read-back differs.', error: { next_step: 'Re-check current state.' } }),
    };
    await memoryStore.proposals.create(proposal);
    for (const kind of ['execution_verified', 'execution_failed', 'execution_unverified']) {
      await memoryStore.audit.append(event(kind, { event: kind, proposal_id: proposal.id }));
    }
    const response = await activityGet(getRequest('http://localhost/api/activity'));
    const body = await response.json();
    expect(body.entries.map((entry: { outcome: string }) => entry.outcome).sort()).toEqual(['failed', 'unverified', 'verified']);
    expect(body.entries[0]).toMatchObject({
      target: 'Brand', summary: 'Raise Brand budget', before: { budget: 50 }, after: { budget: 60 },
    });
    expect(body.entries[0].message).toContain('Re-check current state.');
    expect(fake.requests).toEqual([]);
  });

  it('does not label an app-only revert as a verified Google Ads change', () => {
    const entry = appLogEntry({
      id: 'old-revert', timestamp: dates.startDate, campaignId: '111', campaignName: 'Brand',
      actionType: 'REVERT_PREVIOUS_ACTION', previousValue: '70', newValue: '50',
      reason: 'App rollback', source: 'USER', userOrSystem: 'User', status: 'REVERTED', canRevert: true,
    });
    expect(entry.outcome).toBe('recorded');
    expect(entry.message).toContain('not confirmation');
    expect(entry).not.toHaveProperty('canRevert');
  });

  it('rejects malformed pagination and unauthenticated history reads', async () => {
    expect((await activityGet(getRequest('http://localhost/api/activity?cursor=not-json'))).status).toBe(400);
    mocks.unauthorized = true;
    expect((await activityGet(getRequest('http://localhost/api/activity'))).status).toBe(401);
  });
});
