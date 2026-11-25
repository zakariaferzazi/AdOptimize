import type { Metadata } from 'next';
import { ReportsClientView } from './reports-client';
import { requirePageSubscription } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Executive Reports & Analytics | AdOptimize',
  description: 'Generate period-specific Google Ads performance reports with previous-period comparisons, campaign breakdowns and clean CSV or print exports.',
  alternates: {
    canonical: 'https://adoptimize.app/reports',
  },
  openGraph: {
    title: 'Google Ads Executive Reports & Analytics | AdOptimize',
    description: 'Period-specific Google Ads reporting, previous-period comparisons and campaign performance exports.',
    url: 'https://adoptimize.app/reports',
    siteName: 'AdOptimize',
  },
};

export default async function ReportsPage() {
  await requirePageSubscription('/reports');
  return <ReportsClientView />;
}
