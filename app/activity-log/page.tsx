import type { Metadata } from 'next';
import { ActivityLogClientView } from './activity-log-client';
import { PRIVATE_ROBOTS } from '@/lib/seo';
import { requirePageSubscription } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AdOptimize Activity & Execution History | AdOptimize',
  description: 'Review account-linked AdOptimize proposals, approvals, execution outcomes and app records with search, filters and export.',
  robots: PRIVATE_ROBOTS,
};

export default async function ActivityLogPage() {
  await requirePageSubscription('/activity-log');
  return <ActivityLogClientView />;
}
