import Link from 'next/link';
import { landing } from './landing-ui';

const faqs = [
  {
    q: 'Is this just a chatbot with advertising advice?',
    a: 'No. AdOptimize works with your connected Google Ads account. It analyzes performance, builds campaigns and applies approved changes to budgets, bidding, keywords and targeting. You can delegate the account work, not just ask for advice.',
  },
  {
    q: 'What can the agent actually execute?',
    a: 'Within the Google Ads account you connect, it can create Search and App campaigns, pause or enable campaigns and ad groups, and change budgets, bidding, dates, networks, locations, keywords, negative keywords, conversion goals and tracking settings.',
  },
  {
    q: 'What is included in the free Google Ads audit plan?',
    a: 'Free includes five completed, read-only AI Ads Audits per calendar month (UTC), across your connected accounts. Review performance, non-converting queries, budget visibility and available low keyword Quality Scores, then export findings as CSV. No card is required. Dashboard, campaign viewing, agent conversations, reports and optimization tools require Pro.',
  },
  {
    q: 'Will a free audit change my campaigns?',
    a: 'No. It reads your connected Google Ads account and produces review findings. Applying campaign, budget, bidding or keyword changes requires Pro and your approval.',
  },
  {
    q: 'How do cancellation and billing work?',
    a: 'Choose Pro Monthly at $29 or Pro Yearly at $99, plus applicable taxes. Cancel in the billing portal to stop the next renewal. See the billing and cancellation policy for the full terms.',
  },
  {
    q: 'How is my Google Ads access handled?',
    a: "You sign in through Google's own authorization screen. We never see your Google password, and you can disconnect your account at any time in Settings.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className={`${landing.section} scroll-mt-24 bg-white`} aria-labelledby="faq-heading">
      <div className={`${landing.container} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
        <div>
          <p className={landing.label}>FAQ</p>
          <h2 id="faq-heading" className={landing.h2}>Questions before you subscribe.</h2>
          <p className={landing.lead}>
            Still unsure? <Link href="/contact" className="font-semibold text-[#6D28D9] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">Contact our team</Link>.
          </p>
        </div>
        <div className="divide-y divide-[#DDD6FE] rounded-xl border border-[#DDD6FE] bg-white px-6 shadow-sm sm:px-8">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-[#2E1065] marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">
                {item.q}
                <span className="text-xl leading-none text-[#6D28D9] transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-6 text-[#6B7280]">{item.a}</p>
              {item.q === 'How do cancellation and billing work?' && (
                <Link href="/refund-policy" className="mt-2 inline-block text-sm font-semibold text-[#6D28D9] underline">Billing and cancellation policy</Link>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
