import type { Metadata } from 'next';
import { ReportsClientView } from './reports-client';

export const metadata: Metadata = {
  title: 'Google Ads Executive Reports & Analytics | AdOptimize',
  description: 'Generate audit reports, campaign breakdown analytics, and ROAS performance exports for executive teams and stakeholders.',
  alternates: {
    canonical: 'https://adoptimize.app/reports',
  },
  openGraph: {
    title: 'Google Ads Executive Reports & Analytics | AdOptimize',
    description: 'Generate audit reports, campaign breakdown analytics, and ROAS performance exports.',
    url: 'https://adoptimize.app/reports',
    siteName: 'AdOptimize',
  },
};

export default function ReportsPage() {
  return <ReportsClientView />;
}
