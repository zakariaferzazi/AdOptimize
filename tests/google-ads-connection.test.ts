import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleAdsConnection } from '@/hooks/use-google-ads-connection';
import type { GoogleAdsAccount } from '@/types/adoptimize';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), fetch: vi.fn(), states: [] as unknown[],
}));
vi.mock('@/lib/google-identity', () => ({ acquireGoogleAdsToken: mocks.authorize }));
vi.mock('@/lib/authenticated-fetch', () => ({ authenticatedFetch: mocks.fetch }));
vi.mock('react', () => ({
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => {
    const index = mocks.states.push(value) - 1;
    return [value, (next: unknown) => { mocks.states[index] = next; }];
  },
}));

const account: GoogleAdsAccount = {
  id: 'account', clientCustomerId: '123-456-7890', accountName: 'Connected account',
  isConnected: true, currency: 'USD', timezone: 'UTC', lastSyncAt: '', syncStatus: 'IDLE', isDemo: false,
  totalCampaignsCount: 0, monthlySpendCap: 1000,
};
beforeEach(() => {
  mocks.states = [];
  mocks.authorize.mockReset().mockResolvedValue('short-lived-test-token');
  mocks.fetch.mockReset().mockResolvedValue(Response.json({ success: true, account }));
  const storage = { setItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

describe('direct Google Ads connection', () => {
  it('starts authorization on the first connect call and delivers the connected account', async () => {
    const onConnectAccount = vi.fn();
    const { connect } = useGoogleAdsConnection({ currentAccount: account, onConnectAccount });
    const result = connect();
    expect(mocks.authorize).toHaveBeenCalledOnce();
    await result;
    expect(mocks.fetch).toHaveBeenCalledWith('/api/google-ads/connect', expect.objectContaining({ method: 'POST' }));
    expect(onConnectAccount).toHaveBeenCalledWith(account, [], 'short-lived-test-token', [], []);
  });

  it('selects among discovered accounts without a second authorization popup', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ success: true, requiresSelection: true, customers: ['123-456-7890', '987-654-3210'] }));
    const onConnectAccount = vi.fn();
    const { connect } = useGoogleAdsConnection({ currentAccount: account, onConnectAccount });
    await connect();
    expect(onConnectAccount).not.toHaveBeenCalled();
    await connect('123-456-7890');
    expect(mocks.authorize).toHaveBeenCalledOnce();
    expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).customerId).toBe('123-456-7890');
    expect(onConnectAccount).toHaveBeenCalledOnce();
  });

  it('surfaces canceled authorization and never submits a connection', async () => {
    mocks.authorize.mockRejectedValue(new Error('Google authorization window was closed.'));
    const onConnectAccount = vi.fn();
    await useGoogleAdsConnection({ currentAccount: account, onConnectAccount }).connect();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(onConnectAccount).not.toHaveBeenCalled();
    expect(mocks.states).toContain('Google authorization window was closed.');
  });

  it('prevents a double click from opening two authorization windows', async () => {
    let authorize: (token: string) => void = () => {};
    mocks.authorize.mockImplementation(() => new Promise<string>((resolve) => { authorize = resolve; }));
    const { connect } = useGoogleAdsConnection({ currentAccount: account, onConnectAccount: vi.fn() });
    const first = connect();
    const second = connect();
    expect(mocks.authorize).toHaveBeenCalledOnce();
    authorize('short-lived-test-token');
    await Promise.all([first, second]);
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it('starts fresh authorization for a later reconnect rather than reusing the selection token', async () => {
    mocks.fetch.mockImplementation(() => Promise.resolve(Response.json({ success: true, account })));
    const { connect } = useGoogleAdsConnection({ currentAccount: account, onConnectAccount: vi.fn() });
    await connect();
    await connect(account.clientCustomerId);
    expect(mocks.authorize).toHaveBeenCalledTimes(2);
  });

  it('rejects an incomplete success response instead of continuing to the workspace', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ success: true }));
    const onConnectAccount = vi.fn();
    await useGoogleAdsConnection({ currentAccount: account, onConnectAccount }).connect();
    expect(onConnectAccount).not.toHaveBeenCalled();
    expect(mocks.states).toContain('Google Ads returned an incomplete account connection. Please try again.');
  });
});
