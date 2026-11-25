import type { Metadata } from 'next';
import { BillingClientView } from './billing-client';
import { requirePageSession } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Billing | AdOptimize', robots: { index: false, follow: false } };

export default async function BillingPage() {
  await requirePageSession('/billing');
  return <BillingClientView />;
}
