import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from '@/components/landing/landing-page';

vi.mock('@/components/billing/plan-cta', () => ({
  PlanCta: ({ interval, label }: { interval: string; label: string }) => React.createElement('button', { 'data-interval': interval }, label),
}));
afterEach(() => vi.unstubAllGlobals());

describe('homepage auth routing', () => {
  it('offers the workspace and demo separately from the two Pro billing intervals', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).toMatch(/href="\/sign-in"[^>]*>Sign in<\/a>/);
    expect(html.match(/href="\/sign-up"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('href="/dashboard?demo=true"');
    expect(html.match(/href="\/dashboard\?demo=true"/g)).toHaveLength(1);
    expect(html).toContain('data-interval="monthly"');
    expect(html).toContain('data-interval="yearly"');
    expect(html).not.toContain('PRO FREE');
    expect(html).toContain('approve every change');
  });
});
