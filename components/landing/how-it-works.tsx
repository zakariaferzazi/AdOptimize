import { landing } from './landing-ui';

const steps = [
  {
    title: 'Connect your Google Ads account',
    text: 'Create your account and connect Google Ads. Explore your dashboard, then activate Pro when you are ready to delegate campaign work.',
  },
  {
    title: 'Describe the outcome',
    text: 'Ask the agent to build a campaign, investigate rising CPA or improve budget allocation. It uses your account data to prepare the next steps.',
  },
  {
    title: 'Approve, and it executes',
    text: 'You review each proposal. The agent applies approved changes in Google Ads and records the outcome.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={`${landing.section} scroll-mt-24 bg-[#F5F3FF]`} aria-labelledby="how-heading">
      <div className={landing.container}>
        <div className="max-w-2xl">
          <p className={landing.label}>How it works</p>
          <h2 id="how-heading" className={landing.h2}>Brief your agent. Review the plan. Let it do the work.</h2>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className={landing.card}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6D28D9] text-sm font-bold text-white">{index + 1}</span>
              <h3 className="mt-6 text-lg font-bold text-[#2E1065]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
