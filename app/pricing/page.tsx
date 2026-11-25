import type { Metadata } from 'next';
import { PricingCards } from '@/components/landing/pricing-cards';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export const metadata: Metadata = {
  title: 'Pricing | AdOptimize',
  description: 'Start with free Google Ads campaign viewing or unlock Pro for $29 per month or $99 per year.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | AdOptimize',
    description: 'Start with free Google Ads campaign viewing or unlock Pro for $29 per month or $99 per year.',
    url: '/pricing',
    images: ['/auth_panel.png'],
  },
};

export default function PricingPage() {
  return <div className="site-page"><SiteHeader /><main className="site-container py-20">
    <div className="text-center"><span className="site-label">SIMPLE PRICING</span><h1 className="site-heading">Start free. Grow with Pro.</h1><p className="site-intro">Choose the tools that fit the way you work.</p></div>
    <PricingCards />
  </main><SiteFooter /></div>;
}
