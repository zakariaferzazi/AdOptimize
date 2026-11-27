import type { Metadata } from 'next';
import { ReportsClientView } from './reports-client';
import { hasPageSubscription } from '@/lib/billing/access';
import { ProPreview } from '@/components/billing/pro-preview';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Executive Reports & Analytics | AdOptimize',
  description: 'Generate period-specific Google Ads performance reports with previous-period comparisons, campaign breakdowns and clean CSV or print exports.',
  robots: PRIVATE_ROBOTS,
};

export default async function ReportsPage() {
  if (!(await hasPageSubscription('/reports'))) return <ProPreview feature="reports" />;
  return <ReportsClientView />;
}
