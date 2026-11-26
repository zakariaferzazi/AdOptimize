import { Check } from 'lucide-react';
import { PlanCta } from '@/components/billing/plan-cta';
import { landing } from './landing-ui';

const proFeatures = [
  {
    title: 'An agent that works inside Google Ads',
    description: 'Ask in plain language. The agent reads connected account data, finds performance drivers, and prepares practical next steps.',
  },
  {
    title: 'Campaigns built from your brief',
    description: 'Draft Search and App campaigns with goals, budgets, bidding, locations, ad groups and keywords ready for review.',
  },
  {
    title: 'Budget and bidding optimization',
    description: 'Investigate wasted spend and review proposed changes to daily budgets, target CPA, target ROAS and CPC limits.',
  },
  {
    title: 'Keyword and targeting management',
    description: 'Find poor-performing queries, prepare keywords and negatives, and manage supported location and conversion-goal changes.',
  },
  {
    title: 'You approve before execution',
    description: 'Every supported Google Ads change is shown for review with the target and proposed values before you authorize it.',
  },
  {
    title: 'Account history and verification',
    description: 'Track proposals, approvals, execution results and follow-up checks in your workspace activity history.',
  },
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

      <div className="mx-auto mt-14 max-w-5xl">
        <div className="max-w-2xl">
          <p className={landing.label}>Put the agent to work</p>
          <h3 className={landing.h2}>More than recommendations. Real Google Ads work, prepared for your approval.</h3>
          <p className={landing.lead}>Pro gives you an account-aware agent for investigation, campaign creation, optimization and supported execution.</p>
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
          Explore your dashboard with a standard account. Pro unlocks advanced analysis and supported agent actions.
        </p>
      </div>
    </section>
  );
}
