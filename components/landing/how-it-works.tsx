import { landing } from './landing-ui';

const steps = [
  {
    title: 'Connect your Google Ads account',
    text: 'Sign in, then authorize the Google Ads account you want the agent to manage. Access is limited to the account you connect.',
  },
  {
    title: 'Describe the outcome',
    text: 'Ask in plain language: explain a CPA increase, build a new campaign, or cut waste on a campaign. The agent reads live data before it proposes anything.',
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
          <h2 id="how-heading" className={landing.h2}>From a question to an executed change in three steps.</h2>
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
