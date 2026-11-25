import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from '@/components/landing/landing-page';

vi.mock('@/components/billing/plan-cta', () => ({
  PlanCta: ({ interval, label }: { interval: string; label: string }) => React.createElement('button', { 'data-interval': interval }, label),
}));
afterEach(() => vi.unstubAllGlobals());

describe('homepage', () => {
  it('sells Pro through exactly the monthly and yearly checkout CTAs, with no free plan', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html.match(/data-interval="monthly"/g)).toHaveLength(1);
    expect(html.match(/data-interval="yearly"/g)).toHaveLength(1);
    expect(html).toContain('$29');
    expect(html).toContain('$99');
    expect(html).not.toMatch(/free plan/i);
  });

  it('routes sign-in and account creation to the auth pages and renders one page heading', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).toMatch(/href="\/sign-in"/);
    expect(html).toMatch(/href="\/sign-up"/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('does not claim unverified ratings or testimonials', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).not.toMatch(/aggregateRating|ratingValue|testimonial/i);
  });
});
