import type { Metadata } from 'next';
import { AuditClientView } from './audit-client';
import { requirePageUser } from '@/lib/billing/access';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Google Ads Audit & Wasted Spend Scanner | AdOptimize',
  description: 'Audit Google Ads for a selected reporting period. Compare performance, review non-converting search queries, and investigate evidence-led recommendations.',
  robots: PRIVATE_ROBOTS,
};

export default async function AuditPage() {
  await requirePageUser('/audit');
  return <AuditClientView />;
}
