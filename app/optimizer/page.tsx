import type { Metadata } from 'next';
import { OptimizerClientView } from './optimizer-client';
import { requirePageSubscription } from '@/lib/billing/access';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
  description: 'Reallocate ad spend from low-ROAS bleeders to high-performing search terms and winning campaigns. 1-click verification with human-in-the-loop safeguards.',
  robots: PRIVATE_ROBOTS,
};

export default async function OptimizerPage() {
  await requirePageSubscription('/optimizer');
  return <OptimizerClientView />;
}
