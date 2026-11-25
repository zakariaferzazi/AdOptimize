import Link from 'next/link';
import { Check } from 'lucide-react';
import { PlanCta } from '@/components/billing/plan-cta';
import { landing } from './landing-ui';

const proFeatures = [
  'AI Marketing Agent that investigates and proposes changes',
  'Approve-then-execute changes to budgets, bidding, keywords, targeting and status',
  'Campaign creation for Search and App campaigns',
  'Period account audit with prioritized findings and CSV export',
  'Budget Optimizer and performance reports',
  'Full activity history of proposals, approvals and outcomes',
];

const buttonBase = 'mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] motion-reduce:transition-none disabled:opacity-60';

export function PricingSection() {
  return (
    <section id="pricing" className={`${landing.container} ${landing.section} scroll-mt-24`} aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className={landing.label}>Pro</p>
        <h2 id="pricing-heading" className={landing.h2}>One plan with everything the agent can do.</h2>
        <p className={landing.lead}>Choose monthly flexibility or save with yearly billing. Both include the same features.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <article className="flex min-w-0 flex-col rounded-xl border border-[#DDD6FE] bg-white p-8 shadow-sm">
          <h3 className="text-lg font-bold text-[#2E1065]">Pro Monthly</h3>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-[#2E1065]">$29</span>
            <span className="text-base font-medium text-[#6B7280]">per month</span>
          </p>
          <p className="mt-3 text-sm text-[#6B7280]">Billed monthly. Cancel anytime.</p>
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
          <PlanCta interval="yearly" label="Start Pro yearly" className={`${buttonBase} bg-[#6D28D9] text-white hover:bg-[#5B21B6]`} />
        </article>
      </div>

      <p className="mx-auto mt-5 max-w-4xl text-center text-sm text-[#6B7280]">
        All sales are final. Cancel to stop the next renewal.{' '}
        <Link href="/refund-policy" className="font-semibold text-[#6D28D9] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">See the billing and cancellation policy.</Link>
      </p>

      <div className="mx-auto mt-10 grid max-w-4xl gap-8 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-8 sm:p-10 md:grid-cols-2">
        <div>
          <h3 className="text-base font-bold text-[#2E1065]">Included in Pro</h3>
          <ul className="mt-5 space-y-3">
            {proFeatures.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#1F2937]">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm leading-6 text-[#1F2937]">
            Free account: explore your dashboard and campaign data.
          </p>
          <p className="mt-6 text-sm leading-6 text-[#1F2937]">
            Pro unlocks AI-powered analysis, campaign creation and management, budgets, optimization, reports, and supported Google Ads changes. Prices are in USD; applicable taxes are calculated at checkout.
          </p>
        </div>
      </div>
    </section>
  );
}
