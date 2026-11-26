import type { Metadata } from 'next';
import { CampaignsClientView } from './campaigns-client';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Campaign Manager & Bidding Controls | AdOptimize',
  description: 'Manage Google Ads Search, Shopping, and Performance Max campaigns. Real-time budget adjustment, keyword analysis, and pause/enable controls.',
  robots: PRIVATE_ROBOTS,
};

export default function CampaignsPage() {
  return <CampaignsClientView />;
}
