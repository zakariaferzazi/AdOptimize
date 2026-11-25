import { Layers3, ListChecks, Search, SlidersHorizontal, Target, TrendingDown } from 'lucide-react';
import { landing } from './landing-ui';

const capabilities = [
  {
    icon: Search,
    title: 'Investigate performance',
    text: 'Explain any change down to the campaign, keyword or search term.',
  },
  {
    icon: TrendingDown,
    title: 'Find wasted spend',
    text: 'Surface non-converting queries and CPA outliers.',
  },
  {
    icon: Layers3,
    title: 'Build campaigns',
    text: 'Create Search or App campaigns from a brief.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Adjust budgets and bidding',
    text: 'Change budgets, bids and campaign status.',
  },
  {
    icon: ListChecks,
    title: 'Manage keywords and negatives',
    text: 'Add keywords and negatives, and adjust bids.',
  },
  {
    icon: Target,
    title: 'Control targeting and conversions',
    text: 'Edit locations and conversion goals.',
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className={`${landing.section} scroll-mt-24 bg-white`} aria-labelledby="capabilities-heading">
      <div className={landing.container}>
        <div className="max-w-2xl">
          <p className={landing.label}>What the agent does</p>
          <h2 id="capabilities-heading" className={landing.h2}>It works inside your account, not beside it.</h2>
          <p className={landing.lead}>Ask for an outcome in plain language. The agent reads the live account, checks each change against Google Ads, and prepares it for your approval.</p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <li key={title} className={landing.card}>
              <span className={landing.iconTile}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-bold text-[#2E1065]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
