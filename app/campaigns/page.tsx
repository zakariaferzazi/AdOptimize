import type { Metadata } from 'next';
import { CampaignsClientView } from './campaigns-client';
import { requirePageSession } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Campaign Manager & Bidding Controls | AdOptimize',
  description: 'Manage Google Ads Search, Shopping, and Performance Max campaigns. Real-time budget adjustment, keyword analysis, and pause/enable controls.',
  alternates: {
    canonical: 'https://adoptimize.app/campaigns',
  },
  openGraph: {
    title: 'Google Ads Campaign Manager & Bidding Controls | AdOptimize',
    description: 'Manage Google Ads Search, Shopping, and Performance Max campaigns with real-time budget and bid adjustments.',
    url: 'https://adoptimize.app/campaigns',
    siteName: 'AdOptimize',
  },
};

export default async function CampaignsPage() {
  await requirePageSession('/campaigns');
  return <CampaignsClientView />;
}
