import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from '@/components/landing/landing-page';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import PricingPage from '@/app/pricing/page';

vi.mock('@/components/billing/plan-cta', () => ({
  PlanCta: ({ interval, label }: { interval: string; label: string }) => React.createElement('button', { 'data-interval': interval }, label),
}));
afterEach(() => vi.unstubAllGlobals());

describe('homepage', () => {
  it('offers an audit-only Free plan alongside exactly two paid checkout intervals', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html.match(/data-interval="monthly"/g)).toHaveLength(1);
    expect(html.match(/data-interval="yearly"/g)).toHaveLength(1);
    expect(html).toContain('$29');
    expect(html).toContain('$99');
    const freeCard = (html.match(/<article[^>]*>.*?<\/article>/g) ?? []).find((card) => /<h3[^>]*>Free<\/h3>/.test(card));
    expect(freeCard).toContain('$0');
    expect(freeCard).toContain('AI Ads Audit only');
    expect(freeCard).toContain('five Google Ads audits per calendar month');
    expect(freeCard).not.toContain('data-interval');
    expect(freeCard).toContain('href="/sign-up?next=/audit"');
  });

  it('routes sign-in and account creation to the auth pages and renders one page heading', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).toMatch(/href="\/sign-in"/);
    expect(html).toMatch(/href="\/sign-up\?next=\/audit"/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('publishes the Free offer and its audit limit consistently on the pricing page', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(PricingPage));
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    if (!json) throw new Error('Missing pricing structured data');
    const schema = JSON.parse(json);
    expect(schema.offers).toHaveLength(3);
    expect(schema.offers[0]).toMatchObject({ price: '0', description: expect.stringContaining('five Google Ads audits per calendar month') });
    expect(html).not.toMatch(/Limited dashboard|viewing do not require a subscription/);
    expect(html).toContain('Dashboard, campaign viewing');
  });

  it('shows agent capabilities beneath the price inside both subscription cards', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    const pricingCards = (html.match(/<article[^>]*>.*?<\/article>/g) ?? []).filter((card) => /<h3[^>]*>Pro (Monthly|Yearly)<\/h3>/.test(card));
    expect(pricingCards).toHaveLength(2);
    for (const card of pricingCards) {
      expect(card).toContain('AI Marketing Agent to build, manage and optimize campaigns');
      expect(card).toContain('Search and App campaigns built from your brief');
      expect(card).toContain('Budget and bid adjustments for your CPA and ROAS goals');
      expect(card).toContain('Approved updates applied directly in Google Ads');
      expect(card.indexOf('$')).toBeLessThan(card.indexOf('Your subscription includes'));
      expect(card.indexOf('Your subscription includes')).toBeLessThan(card.indexOf('Start Pro'));
      expect(card).not.toMatch(/Everything in Pro|Agent for account analysis/);
    }
  });

  it('does not claim unverified ratings or testimonials', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).not.toMatch(/aggregateRating|ratingValue|testimonial/i);
  });

  it('renders sourced competitor prices, qualifications and working comparison anchors', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(LandingPage));
    expect(html).toContain('id="compare"');
    expect(html).toContain('href="#compare"');
    for (const comparison of PSEO_COMPARISONS) {
      if (!comparison.pricing) continue;
      expect(html).toContain(`href="/compare/${comparison.slug}"`);
      expect(html).toContain(comparison.pricing.label);
      expect(html).toContain(comparison.pricing.detail);
    }
    expect(html).toContain('$8.25/month equivalent, paid yearly');
    expect(html).toContain('Legacy Advisor page; Buy Now points to example.com');
    expect(html).toContain('billed annually');
    expect(html).not.toMatch(/after 24 hours|gets app installs at|guaranteed|can do anything/i);
  });
});
