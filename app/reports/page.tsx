import type { Metadata } from 'next';
import { ReportsClientView } from './reports-client';
import { hasPageSubscription } from '@/lib/billing/access';
import { ProPreview } from '@/components/billing/pro-preview';

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
  if (!await hasPageSubscription('/reports')) return <ProPreview feature="reports" />;
  return <ReportsClientView />;
}
