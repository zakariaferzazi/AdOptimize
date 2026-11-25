import type { Metadata } from 'next';
import { DashboardClientView } from './dashboard-client';
import { requirePageSession } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Executive Dashboard - Google Ads Live Performance | AdOptimize',
  description: 'Real-time Google Ads performance metrics, spend tracking, ROAS analysis, and automated anomaly alerts in one unified dashboard.',
  alternates: {
    canonical: 'https://adoptimize.app/dashboard',
  },
  openGraph: {
    title: 'Executive Dashboard - Google Ads Live Performance | AdOptimize',
    description: 'Real-time Google Ads performance metrics, spend tracking, ROAS analysis, and automated anomaly alerts.',
    url: 'https://adoptimize.app/dashboard',
    siteName: 'AdOptimize',
  },
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string | string[] }> }) {
  if ((await searchParams).demo !== 'true') await requirePageSession('/dashboard');
  return <DashboardClientView />;
}
