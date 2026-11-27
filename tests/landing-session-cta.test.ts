import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let signedIn = false;

vi.mock('@/hooks/use-auth-user', () => ({
  useAuthUser: () => ({ ready: true, user: signedIn ? { uid: 'signed-in' } : null }),
}));

import { LandingAccountLink, LandingPrimaryCta } from '@/components/landing/session-cta';

describe('homepage session CTAs', () => {
  beforeEach(() => {
    signedIn = false;
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
});
