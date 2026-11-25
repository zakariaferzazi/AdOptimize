import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFlow, describeAuthError } from '@/components/auth/auth-flow';
import { CheckoutSuccess } from '@/components/billing/checkout-success';
import type { BillingStatus } from '@/lib/billing-client';

const mocks = vi.hoisted(() => ({
  status: null as BillingStatus | null,
  effects: [] as Array<() => (() => void) | undefined>,
  fetch: vi.fn(),
  sync: vi.fn(),
  setState: vi.fn(),
  nullCalls: 0,
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [
    initial === null && mocks.nullCalls++ === 0 ? { uid: 'user-a', status: mocks.status } : initial,
    mocks.setState,
  ],
  useEffect: (effect: () => (() => void) | undefined) => { mocks.effects.push(effect); },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-auth-user', () => ({ useAuthUser: () => ({ user: { uid: 'user-a' }, ready: true }) }));
vi.mock('@/lib/firebase', () => ({ auth: {}, signInWithEmail: vi.fn(), signInWithGoogle: vi.fn(), signUpWithEmail: vi.fn() }));
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn(), updateProfile: vi.fn() }));
vi.mock('@/lib/auth-session', () => ({ synchronizeServerSession: mocks.sync }));
vi.mock('@/lib/billing-client', () => ({ fetchBillingStatus: mocks.fetch, startCheckout: vi.fn(), BillingClientError: class extends Error {} }));
vi.mock('@/components/billing/post-payment-connect', () => ({
  PostPaymentConnect: () => React.createElement('div', null, 'Post-payment Google Ads connection'),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
}));

beforeEach(() => {
  mocks.status = {
    environment: 'sandbox', status: 'active', hasAccess: true, hasCustomer: true,
    interval: 'monthly', periodEnd: '2027-01-01T00:00:00Z', cancelAtPeriodEnd: false,
  };
  mocks.effects = [];
  mocks.nullCalls = 0;
  mocks.fetch.mockReset().mockImplementation(async () => mocks.status);
  mocks.sync.mockReset().mockResolvedValue(undefined);
  mocks.setState.mockReset();
});

describe('paid signup connection step', () => {
  it('explains disabled email authentication instead of hiding the Firebase configuration error', () => {
    expect(describeAuthError({ code: 'auth/operation-not-allowed' })).toContain('Email/password sign-in is not enabled');
    expect(describeAuthError({ code: 'auth/operation-not-allowed' })).toContain('Google');
  });

  it('explains a stricter Firebase password policy without exposing the raw provider message', () => {
    expect(describeAuthError({ code: 'auth/password-does-not-meet-requirements', message: 'raw provider details' })).toContain('security requirements');
    expect(describeAuthError({ code: 'auth/password-does-not-meet-requirements', message: 'raw provider details' })).not.toContain('raw provider details');
  });

  it('resumes Google Ads connection for a webhook-confirmed Pro user', () => {
    const html = renderToStaticMarkup(React.createElement(AuthFlow, { mode: 'sign-up' }));
    expect(html).toContain('Post-payment Google Ads connection');
    expect(html).toContain('Bring your campaigns to life');
  });

  it('does not request Google Ads connection before payment', () => {
    mocks.status = { ...mocks.status!, hasAccess: false, status: 'none' };
    const html = renderToStaticMarkup(React.createElement(AuthFlow, { mode: 'sign-up' }));
    expect(html).not.toContain('Post-payment Google Ads connection');
    expect(html).toContain('Choose your plan');
    expect(html).toContain('Continue with the free plan');
    expect(html).not.toContain('Your data, your rules');
  });

  it('waits for stored entitlement and secure-session synchronization after checkout', async () => {
    renderToStaticMarkup(React.createElement(CheckoutSuccess));
    const cleanup = mocks.effects[0]();
    try {
      await vi.waitFor(() => expect(mocks.setState).toHaveBeenCalledWith('active'));
      expect(mocks.fetch).toHaveBeenCalledOnce();
      expect(mocks.sync).toHaveBeenCalledOnce();
    } finally { cleanup?.(); }
  });

  it('does not advance to connection if secure-session synchronization fails', async () => {
    mocks.sync.mockRejectedValue(new Error('Session unavailable'));
    renderToStaticMarkup(React.createElement(CheckoutSuccess));
    const cleanup = mocks.effects[0]();
    try {
      await vi.waitFor(() => expect(mocks.setState).toHaveBeenCalledWith('error'));
      expect(mocks.setState).not.toHaveBeenCalledWith('active');
    } finally { cleanup?.(); }
  });

  it('does not treat a checkout return as payment confirmation', async () => {
    vi.useFakeTimers();
    mocks.status = { ...mocks.status!, hasAccess: false, status: 'none' };
    renderToStaticMarkup(React.createElement(CheckoutSuccess));
    const cleanup = mocks.effects[0]();
    try {
      await vi.advanceTimersByTimeAsync(3000);
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
      expect(mocks.sync).not.toHaveBeenCalled();
      expect(mocks.setState).not.toHaveBeenCalledWith('active');
    } finally { cleanup?.(); vi.useRealTimers(); }
  });
});
