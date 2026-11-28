import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardClientView } from '@/app/dashboard/dashboard-client';
import { getCleanInitialState, getInitialState, type AdOptimizeState } from '@/lib/data-provider';

const mocks = vi.hoisted(() => ({ state: null as AdOptimizeState | null }));
vi.mock('@/context/adoptimize-context', () => ({
  useAdOptimize: () => ({
    state: mocks.state,
    user: { uid: 'free-user' },
    authLoading: false,
    isInitialLoading: false,
    selectedCampaign: null,
  }),
}));
vi.mock('@/components/providers/with-adoptimize', () => ({
  withAdOptimize: (component: React.ComponentType) => component,
}));
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => React.createElement('main', null, children),
}));

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('dashboard saved state', () => {
  it('renders a free, disconnected dashboard restored from a snapshot without breakdown data', () => {
    const { deviceBreakdown, networkBreakdown, locationBreakdown, ...legacy } = getCleanInitialState();
    storage.set('adoptimize_state_v2', JSON.stringify(legacy));
    mocks.state = getInitialState();

    const html = renderToStaticMarkup(React.createElement(DashboardClientView));
    expect(html).toContain('Connect your active Google Ads account');
    expect(html).toContain('Segmentation is unavailable');
    expect(mocks.state.deviceBreakdown).toEqual([]);
    expect(mocks.state.networkBreakdown).toEqual([]);
    expect(mocks.state.locationBreakdown).toEqual([]);
  });

  it('keeps a free account connected without exposing paid dashboard data', () => {
    const connected = getInitialState();
    connected.account = { ...connected.account, isConnected: true, clientCustomerId: '123-456-7890' };
    mocks.state = connected;

    const html = renderToStaticMarkup(React.createElement(DashboardClientView as React.ComponentType<{ hasProAccess?: boolean }>, { hasProAccess: false }));
    expect(html).not.toContain('Connect your active Google Ads account');
    for (const campaign of connected.campaigns) expect(html).not.toContain(campaign.name);
  });

  it('restores missing collections without overriding newer sync data with a dedicated account', () => {
    const account = {
      ...getCleanInitialState('My account', '1234567890').account,
      lastSuccessfulSyncAt: '2026-11-26T12:00:00Z',
      syncStatus: 'IDLE',
    };
    storage.set('adoptimize_state_v2', JSON.stringify({ account }));
    storage.set('adoptimize_connected_account', JSON.stringify({
      ...account,
      lastSuccessfulSyncAt: '2026-11-25T12:00:00Z',
      syncStatus: 'ERROR',
    }));

    const restored = getInitialState();
    expect(restored.campaigns).toEqual([]);
    expect(restored.keywords).toEqual([]);
    expect(restored.networkBreakdown).toEqual([]);
    expect(restored.locationBreakdown).toEqual([]);
    expect(restored.account.lastSuccessfulSyncAt).toBe(account.lastSuccessfulSyncAt);
    expect(restored.account.syncStatus).toBe('IDLE');
    expect(restored.account.isConnected).toBe(true);
  });

  it('preserves synchronized data when restoring a current snapshot', () => {
    const state = getCleanInitialState('My account', '1234567890');
    delete state.account.monthlySpendCap;
    state.deviceBreakdown = [{
      name: 'MOBILE', spend: 25, conversions: 2, cpa: 12.5, roas: 3, sharePercent: 100,
    }];
    storage.set('adoptimize_state_v2', JSON.stringify(state));
    expect(getInitialState()).toEqual(state);
  });

  it('reports an invalid saved state instead of returning a null dashboard state', () => {
    storage.set('adoptimize_state_v2', 'null');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getInitialState().campaigns).toEqual([]);
      expect(warning).toHaveBeenCalledWith(
        '[Workspace] Could not restore saved state:', expect.any(Error),
      );
    } finally {
      warning.mockRestore();
    }
  });
});
