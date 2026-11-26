import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { CreditCard, ExternalLink } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Billing, Cancellation & Refund Policy - AdOptimize',
  description: 'AdOptimize subscription billing, renewal, cancellation, and no-refund policy for Pro Monthly and Pro Yearly.',
  path: '/refund-policy',
});

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] text-white font-bold text-xs rounded-xl shadow-xs">
            Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Billing, Cancellation &amp; Refund Policy</h1>
        <p className="text-sm text-slate-600">This policy applies to AdOptimize Pro Monthly and Pro Yearly subscriptions.</p>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-4 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE] flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#2E1065]">All sales are final</div>
              <p className="mt-1">AdOptimize follows a strict no-refund policy. Fees for subscription periods that have started are non-refundable, and partial periods are not credited or prorated.</p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">Subscription prices and renewals</h2>
            <p>Pro is offered at $29 per month or $99 per year, plus applicable taxes. Checkout and recurring payments are processed by Polar, which acts as the merchant of record. Subscriptions renew automatically at the selected interval until you cancel.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">Cancellation and account access</h2>
            <p>You can manage or cancel your subscription through the billing portal in AdOptimize. Cancellation stops the next renewal. Unless otherwise required by law, your Pro access continues until the end of the current paid period and then returns to limited dashboard access.</p>
            <p>Canceling does not remove your AdOptimize account or automatically refund charges already made. It also does not stop or refund spending incurred directly in your Google Ads account.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">No refunds or credits</h2>
            <p>AdOptimize does not provide refunds for unused time, unused features, a change of mind, dissatisfaction with analysis, campaign performance, or failure to cancel before renewal. Outcomes depend on your account, creative, landing pages, conversion tracking, competition, and other factors outside our control.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">Mandatory rights and Polar</h2>
            <p>Nothing in this policy limits rights that cannot be waived under applicable law. Polar may issue a refund where it is required by law or where Polar determines it is necessary under its buyer terms, including chargeback-prevention measures. Contact support@adoptimize.app for billing questions and contact Polar through the receipt or portal for merchant-of-record inquiries.</p>
            <a href="https://polar.sh/legal/checkout-buyer-terms" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#6D28D9] underline">
              Polar checkout buyer terms <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
