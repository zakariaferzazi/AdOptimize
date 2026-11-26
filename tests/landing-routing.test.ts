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

  it('shows agent capabilities beneath the price inside both subscription cards', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    const pricingCards = (html.match(/<article[^>]*>.*?<\/article>/g) ?? []).filter((card) => /<h3[^>]*>Pro (Monthly|Yearly)<\/h3>/.test(card));
    expect(pricingCards).toHaveLength(2);
    for (const card of pricingCards) {
      expect(card).toContain('Search and App campaign creation');
      expect(card).toContain('Budget, CPA, ROAS and bidding adjustments');
      expect(card).toContain('Approved changes executed in Google Ads');
      expect(card.indexOf('$')).toBeLessThan(card.indexOf('Everything in Pro'));
      expect(card.indexOf('Everything in Pro')).toBeLessThan(card.indexOf('Start Pro'));
    }
  });

  it('does not claim unverified ratings or testimonials', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).not.toMatch(/aggregateRating|ratingValue|testimonial/i);
  });
});
