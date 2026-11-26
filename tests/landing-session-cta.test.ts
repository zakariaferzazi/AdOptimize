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
    expect(primary).toContain('Create free account');
    expect(primary).toContain('/sign-up');
    expect(account).toContain('Sign in');
  });

  it('links directly to the dashboard while signed in', () => {
    signedIn = true;
    const primary = renderToStaticMarkup(React.createElement(LandingPrimaryCta));
    const account = renderToStaticMarkup(React.createElement(LandingAccountLink));
    expect(primary).toContain('Go to Dashboard');
    expect(primary).toContain('/dashboard');
    expect(account).toBe('');
  });
});
