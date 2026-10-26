import type { Metadata } from 'next';
import { AuditClientView } from './audit-client';

export const metadata: Metadata = {
  title: 'AI Google Ads Audit & Wasted Spend Scanner | AdOptimize',
  description: 'Audit your Google Ads account in 60 seconds. Scan search terms, detect CPA runaway spikes, identify zero-conversion bleeding keywords, and eliminate wasted spend.',
  alternates: {
    canonical: 'https://adoptimize.app/audit',
  },
  openGraph: {
    title: 'AI Google Ads Audit & Wasted Spend Scanner | AdOptimize',
    description: 'Instant Google Ads audit tool. Detect wasted ad spend, negative keyword opportunities, and budget bottlenecks.',
    url: 'https://adoptimize.app/audit',
    siteName: 'AdOptimize',
  },
};

export default function AuditPage() {
  return <AuditClientView />;
}
