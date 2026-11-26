import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { PlanCta } from '@/components/billing/plan-cta';
import { absoluteUrl, buildPageMetadata, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing - AdOptimize Pro Monthly and Yearly',
  description: 'Limited dashboard access plus AdOptimize Pro for $29 per month or $99 per year. Unlock AI analysis, campaign management, reports, and approved Google Ads changes.',
  path: '/pricing',
});

const features = [
  'AI Marketing Agent with account-aware conversations',
  'Google Ads performance analysis and period-specific audits',
  'Campaign creation and supported campaign management',
  'Budget, bidding, keyword, negative, targeting, and conversion-goal proposals',
  'Budget Optimizer and performance reports',
  'Approval and execution history',
];

const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'AdOptimize Pro',
  description: 'AI marketing agent for Google Ads with approval before supported changes are applied.',
  brand: { '@type': 'Brand', name: 'AdOptimize' },
  url: absoluteUrl('/pricing'),
  offers: [
    { '@type': 'Offer', name: 'Pro Monthly', price: '29.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: absoluteUrl('/pricing') },
    { '@type': 'Offer', name: 'Pro Yearly', price: '99.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: absoluteUrl('/pricing') },
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pricingSchema) }} />
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Launch Live App</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Pro subscriptions</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Choose how you subscribe</h1>
          <p className="text-slate-600 text-sm leading-relaxed">Monthly and yearly plans provide the same Pro product access. Limited dashboard and account viewing do not require a subscription.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-xl p-7 border border-slate-200/80 bg-white text-slate-900 shadow-xs flex flex-col">
            <div className="text-sm font-bold">Pro Monthly</div>
            <p className="text-xs mt-1 text-slate-500">One paid interval with the full Pro feature set.</p>
            <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">$29</span><span className="text-xs text-slate-500">per month</span></div>
            <p className="mt-3 text-xs text-slate-500">Renews monthly until canceled. Taxes calculated at checkout.</p>
            <PlanCta interval="monthly" label="Start Pro Monthly" className="mt-8 w-full py-3 rounded-xl text-xs font-bold text-center bg-transparent border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF]" />
          </div>

          <div className="relative rounded-xl p-7 border-2 border-[#6D28D9] bg-[#2E1065] text-white shadow-xl flex flex-col">
            <span className="absolute -top-3 right-6 bg-[#FBBF24] text-[#2E1065] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Best value</span>
            <div className="text-sm font-bold">Pro Yearly</div>
            <p className="text-xs mt-1 text-slate-300">One paid interval with the full Pro feature set.</p>
            <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">$99</span><span className="text-xs text-slate-300">per year</span></div>
            <p className="mt-3 text-xs text-slate-300">Renews yearly until canceled. Taxes calculated at checkout.</p>
            <PlanCta interval="yearly" label="Start Pro Yearly" className="mt-8 w-full py-3 rounded-xl text-xs font-bold text-center bg-[#6D28D9] text-white hover:bg-[#5B21B6]" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-slate-900">Included with Pro</h2>
          <ul className="mt-5 grid sm:grid-cols-2 gap-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#6D28D9]" />{feature}
              </li>
            ))}
          </ul>
          <div className="mt-7 border-t border-slate-200 pt-5 text-sm text-slate-600 space-y-2">
            <p><strong className="text-slate-900">Limited account access:</strong> Explore the dashboard, connected account information, campaign data, account settings, billing, and non-Pro workspace areas without a paid subscription.</p>
            <p>Subscriptions renew automatically until canceled. All sales are final. Cancellation stops the next renewal and Pro access generally continues through the paid period. Google Ads advertising spend is separate and is not billed or refunded by AdOptimize.</p>
            <p><Link href="/refund-policy" className="font-semibold text-[#6D28D9] underline">Read the Billing, Cancellation &amp; Refund Policy</Link>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
