import type { Metadata } from 'next';
import { PricingCards } from '@/components/landing/pricing-cards';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export const metadata: Metadata = {
  title: 'Pricing | AdOptimize',
  description: 'Get the AI Marketing Agent and Google Ads optimization tools with Pro, from $29 per month or $99 per year.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | AdOptimize',
    description: 'Get the AI Marketing Agent and Google Ads optimization tools with Pro, from $29 per month or $99 per year.',
    url: '/pricing',
    images: ['/auth_panel.png'],
  },
};

export default function PricingPage() {
  return <div className="site-page"><SiteHeader /><main className="site-container py-20">
    <div className="text-center"><span className="site-label">ONE POWERFUL WORKSPACE</span><h1 className="site-heading">Choose how you pay for Pro.</h1><p className="site-intro">Same agent. Same powerful tools. Pick the billing interval that works for you.</p></div>
    <PricingCards />
  </main><SiteFooter /></div>;
}
