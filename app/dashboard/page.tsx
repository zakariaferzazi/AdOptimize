import type { Metadata } from 'next';
import { PRIVATE_ROBOTS } from '@/lib/seo';
import { DashboardClientView } from './dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Executive Dashboard - Google Ads Live Performance | AdOptimize',
  description: 'Connected Google Ads performance metrics, spend tracking, ROAS analysis, and account-aware optimization tools in one workspace.',
  robots: PRIVATE_ROBOTS,
};

export default function DashboardPage() {
  return <DashboardClientView />;
}
