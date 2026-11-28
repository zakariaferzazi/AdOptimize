import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/brand-logo';
import { PlanCta } from '@/components/billing/plan-cta';
import { ProPlanFeatures } from '@/components/billing/pro-plan-features';
import { absoluteUrl, buildPageMetadata, serializeJsonLd } from '@/lib/seo';
import { FREE_PLAN_SUMMARY } from '@/lib/plans';
import { LandingPrimaryCta } from '@/components/landing/session-cta';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Google Ads Audit Plan & Pro Pricing | AdOptimize',
  description: 'Free: five Google Ads audits per month. Pro: dashboard, AI Marketing Agent and campaign management at $29/month or $99/year. Compare AdOptimize plans.',
  path: '/pricing',
});

const pricingQuestions = [
  {
    question: 'What counts toward the Free audit limit?',
    answer: 'Only completed audits count. Free includes five completed AI Ads Audits per calendar month, and the allowance resets at the start of each month (UTC).',
  },
  {
    question: 'Is my Google Ads spend included?',
    answer: 'No. Google bills your advertising spend directly. Your AdOptimize subscription covers the software and AI Marketing Agent only.',
  },
  {
    question: 'Will the agent change my account without asking?',
    answer: 'No. The agent prepares supported changes and applies them to your connected Google Ads account only after you approve them.',
  },
  {
    question: 'What is the difference between monthly and yearly?',
    answer: 'Both include the same Pro features. Yearly is $99 per year, compared with $348 for 12 months on the monthly plan.',
  },
  {
    question: 'How do renewals and cancellation work?',
    answer: 'Pro renews automatically until canceled. Canceling stops the next renewal, and Pro access generally continues through the current paid period.',
  },
];

const pricingFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pricingQuestions.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'AdOptimize',
  description: 'Free Google Ads audits and Pro AI marketing agent with approval before supported changes are applied.',
  brand: { '@type': 'Brand', name: 'AdOptimize' },
  url: absoluteUrl('/pricing'),
  offers: [
    { '@type': 'Offer', name: 'Free — AI Ads Audit', price: '0', priceCurrency: 'USD', description: FREE_PLAN_SUMMARY, url: absoluteUrl('/tools/google-ads-audit') },
    { '@type': 'Offer', name: 'Pro Monthly', price: '29.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: absoluteUrl('/pricing') },
    { '@type': 'Offer', name: 'Pro Yearly', price: '99.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: absoluteUrl('/pricing') },
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pricingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pricingFaqSchema) }} />
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Launch Live App</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Free &amp; Pro</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Start with a free Google Ads audit.</h1>
          <p className="text-slate-600 text-sm leading-relaxed">Free includes AI Ads Audit only, with five completed audits per calendar month (UTC). Both Pro intervals unlock the dashboard, campaign workspace and full agent capabilities.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="rounded-xl p-7 border border-[#DDD6FE] bg-white text-slate-900 shadow-xs flex flex-col">
            <h2 className="text-sm font-bold">Free</h2>
            <p className="text-xs mt-1 text-slate-500">AI Ads Audit only. No card required.</p>
            <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">$0</span><span className="text-xs text-slate-500">per month</span></div>
            <p className="mt-3 flex-1 text-xs leading-6 text-slate-600">{FREE_PLAN_SUMMARY}</p>
            <LandingPrimaryCta className="mt-8 w-full" />
          </div>
          <article className="rounded-xl p-7 border border-slate-200/80 bg-white text-slate-900 shadow-xs flex flex-col">
            <h2 className="text-sm font-bold">Pro Monthly</h2>
            <p className="text-xs mt-1 text-slate-500">One paid interval with the full Pro feature set.</p>
            <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">$29</span><span className="text-xs text-slate-500">per month</span></div>
            <p className="mt-3 text-xs text-slate-500">Renews monthly until canceled. Taxes calculated at checkout.</p>
            <ProPlanFeatures />
            <PlanCta interval="monthly" label="Start Pro Monthly" className="mt-8 w-full py-3 rounded-xl text-xs font-bold text-center bg-transparent border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF]" />
          </article>

          <article className="relative rounded-xl p-7 border-2 border-[#6D28D9] bg-[#2E1065] text-white shadow-xl flex flex-col">
            <span className="absolute -top-3 right-6 bg-[#FBBF24] text-[#2E1065] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Best value</span>
            <h2 className="text-sm font-bold">Pro Yearly</h2>
            <p className="text-xs mt-1 text-slate-300">One paid interval with the full Pro feature set.</p>
            <div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">$99</span><span className="text-xs text-slate-300">per year</span></div>
            <p className="mt-3 text-xs text-slate-300">Renews yearly until canceled. Taxes calculated at checkout.</p>
            <ProPlanFeatures dark />
            <PlanCta interval="yearly" label="Start Pro Yearly" className="mt-8 w-full py-3 rounded-xl text-xs font-bold text-center bg-[#6D28D9] text-white hover:bg-[#5B21B6]" />
          </article>
        </div>

        <section aria-labelledby="pricing-questions" className="max-w-4xl mx-auto">
          <h2 id="pricing-questions" className="text-2xl font-bold tracking-tight text-center text-slate-900">Pricing questions</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {pricingQuestions.map(({ question, answer }) => (
              <article key={question} className="rounded-xl border border-[#DDD6FE] bg-white p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#2E1065]">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            See the <Link href="/refund-policy" className="font-semibold text-[#6D28D9] underline">billing and cancellation policy</Link> for full terms.
          </p>
        </section>
      </main>
    </div>
  );
}
