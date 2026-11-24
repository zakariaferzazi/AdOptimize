import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from '@/components/landing/landing-page';

vi.mock('@/components/landing/model-demo-simulator', () => ({
  ModelDemoSimulator: () => null,
}));
vi.mock('@/components/billing/plan-cta', () => ({
  PlanCta: () => null,
}));

describe('homepage auth routing', () => {
  it('links login and Google signup to auth pages, with a separate explicit demo link', () => {
    const html = renderToStaticMarkup(React.createElement(LandingPage, {
      onOpenApp: vi.fn(),
      onConnectGoogleAds: vi.fn(),
    }));
    expect(html).toMatch(/href="\/sign-in"[^>]*>Log In<\/a>/);
    expect(html.match(/href="\/sign-up"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toMatch(/href="\/dashboard\?demo=true"[^>]*><span>View Demo<\/span><\/a>/);
    expect(html.match(/href="\/dashboard\?demo=true"/g)).toHaveLength(1);
  });
});
