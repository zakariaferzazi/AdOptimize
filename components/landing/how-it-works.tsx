import { Check, ShieldCheck } from 'lucide-react';
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
    text: 'You review every proposed change with its current and new values. When you approve, the agent applies it in Google Ads and records the outcome.',
  },
];

const controls = [
  'Every change is shown as a proposal with current and new values before it runs.',
  'Unapproved proposals expire, so nothing waits in the queue indefinitely.',
  'Each execution is checked against Google Ads and logged as succeeded, failed or unverified.',
  'Pro access and account permissions are enforced on the server, not in the browser.',
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={`${landing.container} ${landing.section} scroll-mt-24`} aria-labelledby="how-heading">
      <div className="max-w-2xl">
        <p className={landing.label}>How it works</p>
        <h2 id="how-heading" className={landing.h2}>From a question to an executed change in three steps.</h2>
      </div>

      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className={landing.card}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{index + 1}</span>
            <h3 className="mt-6 text-lg font-bold text-slate-950">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 overflow-hidden rounded-[2rem] bg-indigo-950 px-7 py-12 text-white sm:px-12 sm:py-16 lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div>
          <ShieldCheck className="h-10 w-10 text-indigo-300" aria-hidden="true" />
          <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">You stay in control of every change.</h3>
          <p className="mt-4 max-w-md leading-7 text-indigo-100">
            The agent does the investigation and preparation. Your approval decides what runs.
          </p>
        </div>
        <ul className="mt-10 space-y-4 lg:mt-0">
          {controls.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-indigo-50">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
