import type { Metadata } from 'next';
import { SettingsClientView } from './settings-client';

export const metadata: Metadata = {
  title: 'Google Ads Account Settings & MCC Manager | AdOptimize',
  description: 'Configure your Google Ads Customer ID, MCC Manager Account ID, optimization thresholds, and workspace notifications.',
  alternates: {
    canonical: 'https://adoptimize.app/settings',
  },
  openGraph: {
    title: 'Google Ads Account Settings & MCC Manager | AdOptimize',
    description: 'Configure your Google Ads Customer ID, MCC Manager Account ID, optimization thresholds, and workspace notifications.',
    url: 'https://adoptimize.app/settings',
    siteName: 'AdOptimize',
  },
};

export default function SettingsPage() {
  return <SettingsClientView />;
}
