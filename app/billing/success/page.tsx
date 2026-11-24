import type { Metadata } from 'next';
import { CheckoutSuccess } from '@/components/billing/checkout-success';

export const metadata: Metadata = { title: 'Payment | AdOptimize', robots: { index: false, follow: false } };

export default function BillingSuccessPage() {
  return <CheckoutSuccess />;
}
