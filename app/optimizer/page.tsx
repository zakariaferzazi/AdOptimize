import type { Metadata } from 'next';
import { OptimizerClientView } from './optimizer-client';
import { hasPageSubscription } from '@/lib/billing/access';
import { ProPreview } from '@/components/billing/pro-preview';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
  description: 'Reallocate ad spend from low-ROAS bleeders to high-performing search terms and winning campaigns. 1-click verification with human-in-the-loop safeguards.',
  robots: PRIVATE_ROBOTS,
};

export default async function OptimizerPage() {
  if (!(await hasPageSubscription('/optimizer'))) return <ProPreview feature="optimizer" />;
  return <OptimizerClientView />;
}
