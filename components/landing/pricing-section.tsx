import Link from 'next/link';
import { Check } from 'lucide-react';
import { PlanCta } from '@/components/billing/plan-cta';
import { landing } from './landing-ui';

const proFeatures = [
  '[X] Google Ads account(s) per plan',
  'AI Marketing Agent that investigates and proposes changes',
  'Approve-then-execute changes to budgets, bidding, keywords, targeting and status',
  'Campaign creation for Search and App campaigns',
  'Period account audit with prioritized findings and CSV export',
  'Budget Optimizer and performance reports',
  'Full activity history of proposals, approvals and outcomes',
];

const buttonBase = 'mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60';

export function PricingSection() {
  return (
    <section id="pricing" className={`${landing.container} ${landing.section} scroll-mt-24`} aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className={landing.label}>Pro</p>
        <h2 id="pricing-heading" className={landing.h2}>One plan with everything the agent can do.</h2>
        <p className={landing.lead}>Choose monthly flexibility or save with yearly billing. Both include the same features.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-950">Pro Monthly</h3>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-slate-950">$29</span>
            <span className="text-base font-medium text-slate-500">per month</span>
          </p>
          <p className="mt-3 text-sm text-slate-500">Billed monthly. Cancel anytime.</p>
          <PlanCta interval="monthly" label="Start Pro monthly" className={`${buttonBase} border border-indigo-600 text-indigo-700 hover:bg-indigo-50`} />
        </article>

        <article className="relative flex flex-col rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-sm">
          <span className="absolute -top-3 left-8 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Best value</span>
          <h3 className="text-lg font-bold text-slate-950">Pro Yearly</h3>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-slate-950">$99</span>
            <span className="text-base font-medium text-slate-500">per year</span>
          </p>
          <p className="mt-3 text-sm text-slate-500">About $8.25 per month, billed yearly. Saves $249 compared with monthly.</p>
          <PlanCta interval="yearly" label="Start Pro yearly" className={`${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`} />
        </article>
      </div>

      <p className="mx-auto mt-5 max-w-4xl text-center text-sm text-slate-600">
        14-day refund.{' '}
        <Link href="/refund-policy" className="font-semibold text-indigo-700 underline">See the refund policy.</Link>
      </p>

      <div className="mx-auto mt-10 grid max-w-4xl gap-8 rounded-3xl bg-slate-50 p-8 sm:p-10 md:grid-cols-2">
        <div>
          <h3 className="text-base font-bold text-slate-950">Included in Pro</h3>
          <ul className="mt-5 space-y-3">
            {proFeatures.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                <Check className="mt-1 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm leading-6 text-slate-700">
            Free account: explore your dashboard and campaign data.
          </p>
          <p className="mt-6 text-sm leading-6 text-slate-600">
            Using the agent, audits, reports, the Budget Optimizer and campaign changes requires Pro. Prices are in USD; applicable taxes are calculated at checkout.
          </p>
        </div>
      </div>
    </section>
  );
}
