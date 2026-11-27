import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingStatus } from '@/lib/billing-client';
import { SubscriptionManager } from '@/components/billing/subscription-manager';

const mocks = vi.hoisted(() => ({
  status: null as BillingStatus | null,
  effect: undefined as (() => (() => void) | undefined) | undefined,
  fetch: vi.fn(),
  setState: vi.fn(),
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [
    initial === null ? { uid: 'user-a', status: mocks.status } : initial,
    mocks.setState,
  ],
  useEffect: (effect: () => (() => void) | undefined) => { mocks.effect = effect; },
}));
vi.mock('@/hooks/use-auth-user', () => ({ useAuthUser: () => ({ user: { uid: 'user-a' }, ready: true }) }));
vi.mock('@/lib/billing-client', () => ({ fetchBillingStatus: mocks.fetch, openPortal: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
}));

beforeEach(() => {
  mocks.status = {
    environment: 'sandbox', status: 'active', hasAccess: true, hasCustomer: true,
    cancelAtPeriodEnd: true, interval: 'monthly', periodEnd: '2027-01-01T00:00:00Z',
  };
  mocks.fetch.mockReset().mockImplementation(async () => mocks.status);
  mocks.setState.mockReset();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('subscription management', () => {
  it('shows scheduled cancellation without removing paid access or offering a refresh button', () => {
    const html = renderToStaticMarkup(React.createElement(SubscriptionManager));
    expect(html).toContain('Canceled (access until period end)');
    expect(html).toContain('Pro monthly');
    expect(html).toContain('Access ends');
    expect(html).not.toContain('Renews');
    expect(html).not.toContain('Refresh status');
  });

  it('shows immediate revocation as canceled, not renewing or Pro', () => {
    mocks.status = { ...mocks.status!, status: 'canceled', hasAccess: false, cancelAtPeriodEnd: false };
    const html = renderToStaticMarkup(React.createElement(SubscriptionManager));
    expect(html).toContain('Canceled');
    expect(html).toContain('Free — AI Ads Audit');
    expect(html).toContain('five Google Ads audits per calendar month');
    expect(html).not.toContain('Renews');
    expect(html).not.toContain('access until period end');
  });

  it('reloads on return from Polar and periodically, pauses while hidden, and cleans up', async () => {
    vi.useFakeTimers();
    renderToStaticMarkup(React.createElement(SubscriptionManager));
    const cleanup = mocks.effect?.();
    try {
      await Promise.resolve();
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(30000);
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
      Object.assign(document, { visibilityState: 'hidden' });
      await vi.advanceTimersByTimeAsync(30000);
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
      Object.assign(document, { visibilityState: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      expect(mocks.fetch).toHaveBeenCalledTimes(4);
    } finally { cleanup?.(); }
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(30000);
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });
});
