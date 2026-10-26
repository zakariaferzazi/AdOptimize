import type { Metadata } from 'next';
import { CampaignsClientView } from './campaigns-client';

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

export default function CampaignsPage() {
  return <CampaignsClientView />;
}
