import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PlanCta } from '@/components/billing/plan-cta';

const included = [
  'AI agent that investigates and executes approved changes',
  'Campaign creation, budgets, bidding, targeting, and keywords',
  'Google Ads audit with prioritized findings',
  'Budget Optimizer and performance reports',
  'CSV exports and account activity history',
];

export function PricingCards() {
  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div className="grid gap-5 md:grid-cols-2">
        <article className="site-card flex flex-col p-8">
          <div className="text-sm font-bold text-indigo-600">PRO MONTHLY</div>
          <h3 className="mt-3 text-2xl font-bold text-slate-950">Flexible by the month</h3>
          <p className="mt-2 text-sm text-slate-600">The complete Pro workspace, billed monthly.</p>
          <p className="mt-7 text-5xl font-extrabold tracking-tight text-slate-950">$29<span className="text-base font-medium text-slate-500"> / month</span></p>
          <p className="mt-2 text-sm text-slate-500">Billed monthly in USD, plus applicable taxes.</p>
          <PlanCta interval="monthly" label="Choose monthly" className="site-button-secondary mt-8 w-full" />
        </article>
        <article className="site-card relative flex flex-col border-indigo-400 p-8 shadow-xl shadow-indigo-200/60">
          <span className="absolute -top-3 right-6 rounded-full bg-indigo-600 px-4 py-1 text-xs font-bold text-white">SAVE $249 / YEAR</span>
          <div className="text-sm font-bold text-indigo-600">PRO YEARLY</div>
          <h3 className="mt-3 text-2xl font-bold text-slate-950">More value, same Pro</h3>
          <p className="mt-2 text-sm text-slate-600">Everything in Pro, at a lower effective monthly cost.</p>
          <p className="mt-7 text-5xl font-extrabold tracking-tight text-slate-950">$99<span className="text-base font-medium text-slate-500"> / year</span></p>
          <p className="mt-2 text-sm text-slate-500">Equivalent to $8.25/month. Billed yearly in USD, plus applicable taxes.</p>
          <PlanCta interval="yearly" label="Choose yearly" className="site-button mt-8 w-full" />
        </article>
      </div>
      <div className="mt-6 rounded-3xl border border-indigo-100 bg-white p-7 sm:p-8">
        <h3 className="text-lg font-bold text-slate-950">Every Pro subscription includes</h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">{included.map(item => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />{item}</li>
        ))}</ul>
        <p className="mt-6 text-xs leading-5 text-slate-500">Cancel anytime. Annual savings compare $99/year with 12 monthly payments of $29.</p>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">Not ready yet? <Link href="/sign-up" className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline">Explore the dashboard first <ArrowRight className="h-4 w-4" /></Link></p>
    </div>
  );
}
