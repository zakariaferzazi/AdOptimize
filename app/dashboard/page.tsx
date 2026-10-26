import type { Metadata } from 'next';
import { DashboardClientView } from './dashboard-client';

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

export default function DashboardPage() {
  return <DashboardClientView />;
}
