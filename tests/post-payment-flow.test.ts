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
  user: { uid: 'user-a' } as { uid: string } | null,
  formValues: [] as string[],
  replace: vi.fn(),
  next: '/dashboard',
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [
    initial === '' && mocks.formValues.length > 0 ? mocks.formValues.shift()
      : initial === null && mocks.nullCalls++ === 0 ? { uid: 'user-a', status: mocks.status } : initial,
    mocks.setState,
  ],
  useEffect: (effect: () => (() => void) | undefined) => { mocks.effects.push(effect); },
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams({ next: mocks.next }),
}));
vi.mock('@/hooks/use-auth-user', () => ({ useAuthUser: () => ({ user: mocks.user, ready: true }) }));
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
  mocks.user = { uid: 'user-a' };
  mocks.formValues = [];
  mocks.replace.mockReset();
  mocks.next = '/dashboard';
  mocks.fetch.mockReset().mockImplementation(async () => mocks.status);
  mocks.sync.mockReset().mockResolvedValue(undefined);
  mocks.setState.mockReset();
});

type ClickableElement = React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }>;
function findElement(node: React.ReactNode, predicate: (element: ClickableElement) => boolean): ClickableElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(node)) return undefined;
  return predicate(node) ? node : findElement(node.props.children, predicate);
}

function clickFreePlan() {
  const plan = findElement(AuthFlow({ mode: 'sign-up' }), (element) => typeof element.type === 'function' && element.type.name === 'PlanStep');
  if (!plan || typeof plan.type !== 'function') throw new Error('Missing plan step');
  const tree = Reflect.apply(plan.type, null, [plan.props]);
  const button = findElement(tree, (element) => element.type === 'button' && element.props.children === 'Continue with Free');
  if (!button?.props.onClick) throw new Error('Missing Free plan action');
  button.props.onClick();
}

describe('Free audit onboarding', () => {
  it.each(['/dashboard', '/campaigns', '/chat', '/reports', '/optimizer', '/activity-log', '/audit', '/settings', '/billing'])('synchronizes the session before opening the accessible workspace or locked preview: %s', async (next) => {
    mocks.status = { ...mocks.status!, hasAccess: false, status: 'none' };
    mocks.next = next;
    clickFreePlan();
    expect(mocks.sync).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(next));
  });

  it('keeps the Free continuation on-site when the requested destination is invalid', async () => {
    mocks.status = { ...mocks.status!, hasAccess: false, status: 'none' };
    mocks.next = 'https://example.invalid';
    clickFreePlan();
    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/audit'));
  });

  it('shows an error instead of entering the audit when session synchronization fails', async () => {
    mocks.status = { ...mocks.status!, hasAccess: false, status: 'none' };
    mocks.sync.mockRejectedValueOnce(new Error('Session unavailable'));
    clickFreePlan();
    await vi.waitFor(() => expect(mocks.setState).toHaveBeenCalledWith('Session unavailable'));
    expect(mocks.replace).not.toHaveBeenCalled();
  });
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

  it.each(['campaign1', 'CAMPAIGN1', '12345678'])('allows signup without mixed-case letters: %s', (password) => {
    mocks.user = null;
    mocks.formValues = ['Test User', 'test@example.com', password, password];
    const html = renderToStaticMarkup(React.createElement(AuthFlow, { mode: 'sign-up' }));
    expect(html).not.toMatch(/<button[^>]*type="submit"[^>]*\sdisabled=""/);
    expect(html).not.toContain('Lowercase (a-z) and uppercase (A-Z)');
  });

  it.each([
    ['short1', 'short1'],
    ['campaign', 'campaign'],
    ['campaign1', 'different1'],
  ])('keeps length, number/symbol and confirmation checks: %s', (password, confirm) => {
    mocks.user = null;
    mocks.formValues = ['Test User', 'test@example.com', password, confirm];
    const html = renderToStaticMarkup(React.createElement(AuthFlow, { mode: 'sign-up' }));
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*\sdisabled=""/);
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
    expect(html).toContain('Continue with Free');
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
