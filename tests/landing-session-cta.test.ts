import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let signedIn = false;
const mocks = vi.hoisted(() => ({
  loaded: null as { uid: string; status?: { hasAccess: boolean }; error?: string } | null,
  effects: [] as Array<() => (() => void) | undefined>,
  fetch: vi.fn(),
  setState: vi.fn(),
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [initial === null ? mocks.loaded : initial, mocks.setState],
  useEffect: (effect: () => (() => void) | undefined) => { mocks.effects.push(effect); },
}));
vi.mock('@/lib/billing-client', () => ({ fetchBillingStatus: mocks.fetch }));

vi.mock('@/hooks/use-auth-user', () => ({
  useAuthUser: () => ({ ready: true, user: signedIn ? { uid: 'signed-in' } : null }),
}));

import { LandingAccountLink, LandingAuditCta, LandingPrimaryCta, LandingSessionProvider } from '@/components/landing/session-cta';

function homepageCta() {
  return renderToStaticMarkup(React.createElement(LandingSessionProvider, null, React.createElement(LandingPrimaryCta)));
}
afterEach(() => vi.unstubAllGlobals());

describe('homepage session CTAs', () => {
  beforeEach(() => {
    signedIn = false;
    mocks.loaded = null;
    mocks.effects = [];
    mocks.fetch.mockReset().mockResolvedValue({ hasAccess: false });
    mocks.setState.mockReset();
  });

  it('shows account creation while signed out', () => {
    const primary = renderToStaticMarkup(React.createElement(LandingPrimaryCta));
    const account = renderToStaticMarkup(React.createElement(LandingAccountLink));
    expect(primary).toContain('Get free audit');
    expect(primary).toContain('/sign-up?next=/audit');
    expect(account).toContain('Sign in');
  });

  it('links directly to the accessible audit workspace while signed in', () => {
    signedIn = true;
    const primary = renderToStaticMarkup(React.createElement(LandingPrimaryCta));
    const account = renderToStaticMarkup(React.createElement(LandingAccountLink));
    expect(primary).toContain('Open audit workspace');
    expect(primary).toContain('/audit');
    expect(primary).not.toContain('/sign-up');
    expect(account).toBe('');
  });

  it.each([false, true])('uses verified subscription access on the homepage: Pro=%s', (hasAccess) => {
    signedIn = true;
    mocks.loaded = { uid: 'signed-in', status: { hasAccess } };
    const html = homepageCta();
    expect(html).toContain(hasAccess ? 'Go to Dashboard' : 'Upgrade to Pro');
    expect(html).toContain(hasAccess ? 'href="/dashboard"' : 'href="/pricing"');
    expect(html).not.toContain('Open audit workspace');
    expect(html).not.toContain('/sign-up');
  });

  it('sends signed-out visitors through signup to the audit', () => {
    const html = renderToStaticMarkup(React.createElement(LandingSessionProvider, null, React.createElement(LandingAuditCta)));
    expect(html).toContain('Audit now');
    expect(html).toContain('href="/sign-up?next=/audit"');
  });

  it.each([false, true])('takes signed-in users to the audit regardless of Pro access: Pro=%s', (hasAccess) => {
    signedIn = true;
    mocks.loaded = { uid: 'signed-in', status: { hasAccess } };
    const html = renderToStaticMarkup(React.createElement(LandingSessionProvider, null, React.createElement(LandingAuditCta)));
    expect(html).toContain('Audit now');
    expect(html).toContain('href="/audit"');
    expect(html).not.toContain('Upgrade to Pro');
    expect(html).not.toContain('Go to Dashboard');
  });

  it('does not assume Pro or Free before loading the current user plan', () => {
    signedIn = true;
    mocks.loaded = { uid: 'another-user', status: { hasAccess: true } };
    const html = homepageCta();
    expect(html).toContain('Checking plan...');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Go to Dashboard');
    expect(html).not.toContain('Upgrade to Pro');
  });

  it('surfaces plan lookup failures without making up an entitlement', () => {
    signedIn = true;
    mocks.loaded = { uid: 'signed-in', error: 'Unable to load your plan.' };
    const html = homepageCta();
    expect(html).toContain('role="alert"');
    expect(html).toContain('Unable to load your plan.');
    expect(html).toContain('Retry');
    expect(html).toContain('href="/billing"');
  });

  it('loads the plan once for all homepage CTAs and refreshes when the user returns', async () => {
    signedIn = true;
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
    renderToStaticMarkup(React.createElement(LandingSessionProvider, null,
      React.createElement(LandingPrimaryCta), React.createElement(LandingPrimaryCta)));
    const cleanup = mocks.effects[0]?.();
    try {
      await Promise.resolve();
      expect(mocks.fetch).toHaveBeenCalledOnce();
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
    } finally { cleanup?.(); }
    window.dispatchEvent(new Event('focus'));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
