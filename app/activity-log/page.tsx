import type { Metadata } from 'next';
import { ActivityLogClientView } from './activity-log-client';
import { PRIVATE_ROBOTS } from '@/lib/seo';
import { hasPageSubscription } from '@/lib/billing/access';
import { ProPreview } from '@/components/billing/pro-preview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AdOptimize Activity & Execution History | AdOptimize',
  description: 'Review account-linked AdOptimize proposals, approvals, execution outcomes and app records with search, filters and export.',
  robots: PRIVATE_ROBOTS,
};

export default async function ActivityLogPage() {
  if (!(await hasPageSubscription('/activity-log'))) return <ProPreview feature="activity_log" />;
  return <ActivityLogClientView />;
}
