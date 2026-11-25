import type { Metadata } from 'next';
import { OptimizerClientView } from './optimizer-client';
import { requirePageSubscription } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
  description: 'Reallocate ad spend from low-ROAS bleeders to high-performing search terms and winning campaigns. 1-click verification with human-in-the-loop safeguards.',
  alternates: {
    canonical: 'https://adoptimize.app/optimizer',
  },
  openGraph: {
    title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
    description: 'Review AI-assisted Google Ads budget and bid optimization proposals before approving supported changes.',
    url: 'https://adoptimize.app/optimizer',
    siteName: 'AdOptimize',
  },
};

export default async function OptimizerPage() {
  await requirePageSubscription('/optimizer');
  return <OptimizerClientView />;
}
