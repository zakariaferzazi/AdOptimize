import { Check } from 'lucide-react';
import { PlanCta } from '@/components/billing/plan-cta';
import { landing } from './landing-ui';
import { FREE_PLAN_SUMMARY } from '@/lib/plans';
import { LandingPrimaryCta } from './session-cta';
import { ProPlanFeatures, proFeatures } from '@/components/billing/pro-plan-features';

const buttonBase = 'mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] motion-reduce:transition-none disabled:opacity-60';

export function PricingSection() {
  return (
    <section id="pricing" className={`${landing.container} ${landing.section} scroll-mt-24`} aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className={landing.label}>Free &amp; Pro</p>
        <h2 id="pricing-heading" className={landing.h2}>Audit for free. Put the agent to work with Pro.</h2>
        <p className={landing.lead}>Start with a free Google Ads audit. Upgrade for the dashboard, campaign management and an agent that turns your decisions into approved account changes.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
        <article className="flex min-w-0 flex-col rounded-xl border border-[#DDD6FE] bg-white p-8 shadow-sm">
          <h3 className="text-lg font-bold text-[#2E1065]">Free</h3>
          <p className="mt-6 flex items-baseline gap-1.5"><span className="text-5xl font-extrabold tracking-tight text-[#2E1065]">$0</span><span className="text-base font-medium text-[#6B7280]">per month</span></p>
          <p className="mt-3 text-sm text-[#6B7280]">No card required.</p>
          <div className="mt-6 flex-1 border-t border-[#DDD6FE] pt-6">
            <p className="text-sm font-bold text-[#2E1065]">AI Ads Audit only</p>
            <p className="mt-4 text-sm leading-6 text-[#1F2937]">{FREE_PLAN_SUMMARY}</p>
            <p className="mt-4 text-sm leading-6 text-[#6B7280]">Read-only findings and CSV export. Connect your Google Ads account in Settings.</p>
          </div>
          <LandingPrimaryCta className="mt-8 w-full" />
        </article>
        <article className="flex min-w-0 flex-col rounded-xl border border-[#DDD6FE] bg-white p-8 shadow-sm">
          <h3 className="text-lg font-bold text-[#2E1065]">Pro Monthly</h3>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-[#2E1065]">$29</span>
            <span className="text-base font-medium text-[#6B7280]">per month</span>
          </p>
          <p className="mt-3 text-sm text-[#6B7280]">Billed monthly. Cancel anytime.</p>
          <ProPlanFeatures />
          <PlanCta interval="monthly" label="Start Pro monthly" className={`${buttonBase} border border-[#6D28D9] bg-transparent text-[#6D28D9] hover:bg-[#F5F3FF]`} />
        </article>

        <article className="relative flex min-w-0 flex-col rounded-xl border-2 border-[#6D28D9] bg-white p-8 shadow-sm">
          <span className="absolute -top-3 left-8 rounded-full bg-[#FBBF24] px-3 py-1 text-xs font-bold text-[#2E1065]">Best value</span>
          <h3 className="text-lg font-bold text-[#2E1065]">Pro Yearly</h3>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-[#2E1065]">$99</span>
            <span className="text-base font-medium text-[#6B7280]">per year</span>
          </p>
          <p className="mt-3 text-sm text-[#6B7280]">About $8.25 per month, billed yearly. Saves $249 compared with monthly.</p>
          <ProPlanFeatures />
          <PlanCta interval="yearly" label="Start Pro yearly" className={`${buttonBase} bg-[#6D28D9] text-white hover:bg-[#5B21B6]`} />
        </article>
      </div>

      <div className="mx-auto mt-14 max-w-5xl">
        <div className="max-w-2xl">
          <p className={landing.label}>Put the agent to work</p>
          <h3 className={landing.h2}>Less manual work. More time to grow.</h3>
          <p className={landing.lead}>From your next campaign launch to your next budget decision, delegate the Google Ads work to an agent that can act on your behalf.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {proFeatures.map((feature) => (
            <article key={feature.title} className={landing.card}>
              <Check className="h-5 w-5 text-[#6D28D9]" aria-hidden="true" />
              <h4 className="mt-4 text-base font-bold text-[#2E1065]">{feature.title}</h4>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{feature.description}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#6B7280]">
          {FREE_PLAN_SUMMARY}
        </p>
      </div>
    </section>
  );
}
