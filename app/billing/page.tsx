import type { Metadata } from 'next';
import { BillingClientView } from './billing-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Billing | AdOptimize', robots: { index: false, follow: false } };

export default function BillingPage() {
  return <BillingClientView />;
}
