import { BarChart3, Layers3, ListChecks, Search, SlidersHorizontal, Target, TrendingDown } from 'lucide-react';
import { landing } from './landing-ui';

const capabilities = [
  {
    icon: Search,
    title: 'Investigate performance',
    text: 'Compare any period with the previous one at account, campaign, ad group or keyword level, broken down by day, device or network.',
  },
  {
    icon: TrendingDown,
    title: 'Find wasted spend',
    text: 'Surface non-converting search queries, zero-conversion spend, CPA outliers and low-quality keywords, each shown with its supporting numbers.',
  },
  {
    icon: Layers3,
    title: 'Build campaigns',
    text: 'Create Search or App campaigns from a brief, with budget, bidding, locations, ad groups and keywords. New campaigns start paused unless you choose otherwise.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Adjust budgets and bidding',
    text: 'Change daily budgets, target CPA or ROAS, max CPC limits, campaign dates and networks. Pause or enable campaigns and ad groups.',
  },
  {
    icon: ListChecks,
    title: 'Manage keywords and negatives',
    text: 'Add positive or negative keywords, set keyword and ad group bids, and create ad groups in existing Search campaigns.',
  },
  {
    icon: Target,
    title: 'Control targeting and conversions',
    text: 'Edit location targeting, choose which conversion actions a campaign optimizes for, and set tracking templates and final URL suffixes.',
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className={`${landing.section} scroll-mt-24 bg-slate-50`} aria-labelledby="capabilities-heading">
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
              <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-5 text-sm leading-6 text-slate-700">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
          <p>
            Also included with Pro: a period-specific account audit with prioritized findings, the Budget Optimizer, and reports you can export as CSV or print.
          </p>
        </div>
      </div>
    </section>
  );
}
