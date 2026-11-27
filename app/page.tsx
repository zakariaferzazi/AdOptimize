import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const title = 'Free Google Ads Audit & AI Marketing Agent | AdOptimize';
const description = 'Run a free Google Ads audit: review wasted spend, CPA, ROAS and available keyword Quality Scores. Five audits per month. Unlock campaign management with Pro.';

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
