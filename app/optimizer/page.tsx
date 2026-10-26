import type { Metadata } from 'next';
import { OptimizerClientView } from './optimizer-client';

export const metadata: Metadata = {
  title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
  description: 'Reallocate ad spend from low-ROAS bleeders to high-performing search terms and winning campaigns. 1-click verification with human-in-the-loop safeguards.',
  alternates: {
    canonical: 'https://adoptimize.app/optimizer',
  },
  openGraph: {
    title: 'Google Ads Budget & Bid Optimizer | AdOptimize',
    description: 'Autonomous budget reallocations and bid optimization for Google Ads with safety guardrails.',
    url: 'https://adoptimize.app/optimizer',
    siteName: 'AdOptimize',
  },
};

export default function OptimizerPage() {
  return <OptimizerClientView />;
}
