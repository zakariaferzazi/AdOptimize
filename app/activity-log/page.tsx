import type { Metadata } from 'next';
import { ActivityLogClientView } from './activity-log-client';
import { requirePageSession } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AdOptimize Activity & Execution History | AdOptimize',
  description: 'Review account-linked AdOptimize proposals, approvals, execution outcomes and app records with search, filters and export.',
  alternates: {
    canonical: 'https://adoptimize.app/activity-log',
  },
  openGraph: {
    title: 'AdOptimize Activity & Execution History | AdOptimize',
    description: 'Search saved proposals, approvals and verified or failed execution events for your connected account.',
    url: 'https://adoptimize.app/activity-log',
    siteName: 'AdOptimize',
  },
};

export default async function ActivityLogPage() {
  await requirePageSession('/activity-log');
  return <ActivityLogClientView />;
}
