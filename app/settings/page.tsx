import type { Metadata } from 'next';
import { SettingsClientView } from './settings-client';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Google Ads Account Settings & MCC Manager | AdOptimize',
  description: 'Configure your Google Ads Customer ID, MCC Manager Account ID, optimization thresholds, and workspace notifications.',
  robots: PRIVATE_ROBOTS,
};

export default function SettingsPage() {
  return <SettingsClientView />;
}
