import type { Metadata } from 'next';
import { ActivityLogClientView } from './activity-log-client';

export const metadata: Metadata = {
  title: 'Google Ads Audit Log & 1-Click Rollback Trail | AdOptimize',
  description: 'Complete verifiable changelog of all Google Ads actions, budget shifts, negative keyword exclusions, and automated rules with instant 1-click rollback.',
  alternates: {
    canonical: 'https://adoptimize.app/activity-log',
  },
  openGraph: {
    title: 'Google Ads Audit Log & 1-Click Rollback Trail | AdOptimize',
    description: 'Verifiable changelog and 1-click instant rollback for all Google Ads actions and optimizations.',
    url: 'https://adoptimize.app/activity-log',
    siteName: 'AdOptimize',
  },
};

export default function ActivityLogPage() {
  return <ActivityLogClientView />;
}
