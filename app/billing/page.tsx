import type { Metadata } from 'next';
import Link from 'next/link';
import { BillingPanel } from '@/components/billing/billing-panel';

export const metadata: Metadata = { title: 'Billing | AdOptimize', robots: { index: false, follow: false } };

export default function BillingPage() {
  return <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
    <Link href="/dashboard" className="text-sm text-slate-600 underline">Back to dashboard</Link>
    <BillingPanel />
  </main>;
}
