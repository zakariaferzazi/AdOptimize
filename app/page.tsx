import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const title = 'AdOptimize | AI Marketing Agent for Google Ads';
const description = 'An AI agent that investigates your Google Ads account, builds campaigns, and executes budget, bidding and keyword changes after you approve them. Pro from $29/month.';

export const metadata: Metadata = buildPageMetadata({ title, description, path: '/' });

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AdOptimize',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description,
  offers: [
    { '@type': 'Offer', name: 'Pro Monthly', price: '29', priceCurrency: 'USD', description: 'Billed monthly' },
    { '@type': 'Offer', name: 'Pro Yearly', price: '99', priceCurrency: 'USD', description: 'Billed yearly' },
  ],
};

export default function AdOptimizeRootPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <LandingPage />
    </>
  );
}
