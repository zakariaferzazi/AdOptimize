import type { Metadata } from 'next';
import { DashboardClientView } from './dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Executive Dashboard - Google Ads Live Performance | AdOptimize',
  description: 'Connected Google Ads performance metrics, spend tracking, ROAS analysis, and account-aware optimization tools in one workspace.',
  alternates: {
    canonical: 'https://adoptimize.app/dashboard',
  },
  openGraph: {
    title: 'Executive Dashboard - Google Ads Live Performance | AdOptimize',
    description: 'Connected Google Ads performance metrics, spend tracking, ROAS analysis, and approval-controlled optimization tools.',
    url: 'https://adoptimize.app/dashboard',
    siteName: 'AdOptimize',
  },
};

export default function DashboardPage() {
  return <DashboardClientView />;
}
