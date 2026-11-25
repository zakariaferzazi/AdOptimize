import Link from 'next/link';
import { landing } from './landing-ui';

const faqs = [
  {
    q: 'Will the agent change my account without asking?',
    a: 'No. The agent prepares a proposal that shows the current and new values. Changes run only after you approve them, and proposals that are not approved in time expire.',
  },
  {
    q: 'What can the agent actually execute?',
    a: 'Within the Google Ads account you connect, it can create Search and App campaigns, pause or enable campaigns and ad groups, and change budgets, bidding, dates, networks, locations, keywords, negative keywords, conversion goals and tracking settings.',
  },
  {
    q: 'Can I look around before I subscribe?',
    a: 'Yes. Create an account to open your dashboard and see your campaign and account data. Pro is needed to use the agent, audits, reports, the Budget Optimizer and to approve campaign changes.',
  },
  {
    q: 'What is the difference between monthly and yearly?',
    a: 'Nothing in the product. Yearly is $99 billed once a year, about $8.25 per month, which is $249 less than twelve monthly payments of $29.',
  },
  {
    q: 'How do I cancel or request a refund?',
    a: 'You can cancel anytime from your billing page. Refund eligibility follows our refund policy, which sets out the conditions for the 14-day refund window.',
  },
  {
    q: 'How is my Google Ads access handled?',
    a: 'You connect through Google’s own authorization screen. AdOptimize stores your Google Ads refresh token encrypted on the server, and you can disconnect the account at any time in Settings.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className={`${landing.section} scroll-mt-24 bg-slate-50`} aria-labelledby="faq-heading">
      <div className={`${landing.container} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
        <div>
          <p className={landing.label}>FAQ</p>
          <h2 id="faq-heading" className={landing.h2}>Questions before you subscribe.</h2>
          <p className={landing.lead}>
            Still unsure? <Link href="/contact" className="font-semibold text-indigo-700 underline">Contact our team</Link>.
          </p>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white px-6 sm:px-8">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-slate-950 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                {item.q}
                <span className="text-xl leading-none text-indigo-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-6 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
