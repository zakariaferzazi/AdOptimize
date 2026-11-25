import type { Metadata } from 'next';
import { AuditClientView } from './audit-client';
import { hasPageSubscription } from '@/lib/billing/access';
import { ProPreview } from '@/components/billing/pro-preview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Google Ads Audit & Wasted Spend Scanner | AdOptimize',
  description: 'Audit Google Ads for a selected reporting period. Compare performance, review non-converting search queries, and investigate evidence-led recommendations.',
  alternates: {
    canonical: 'https://adoptimize.app/audit',
  },
  openGraph: {
    title: 'AI Google Ads Audit & Wasted Spend Scanner | AdOptimize',
    description: 'Period-specific Google Ads performance audit with previous-period comparisons, campaign evidence and search-query review.',
    url: 'https://adoptimize.app/audit',
    siteName: 'AdOptimize',
  },
};

export default async function AuditPage() {
  if (!await hasPageSubscription('/audit')) return <ProPreview feature="audit" />;
  return <AuditClientView />;
}
