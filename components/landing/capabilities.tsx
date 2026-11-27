import { Layers3, ListChecks, Search, SlidersHorizontal, Target, TrendingDown } from 'lucide-react';
import { landing } from './landing-ui';

const capabilities = [
  {
    icon: Search,
    title: 'Investigate performance',
    text: 'Understand what changed and where to focus your next optimization.',
  },
  {
    icon: TrendingDown,
    title: 'Find wasted spend',
    text: 'Identify costly queries and turn findings into negative-keyword changes.',
  },
  {
    icon: Layers3,
    title: 'Build campaigns',
    text: 'Brief the agent and launch approved Search or App campaigns.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Adjust budgets and bidding',
    text: 'Adjust budgets and bidding around your CPA and ROAS goals.',
  },
  {
    icon: ListChecks,
    title: 'Manage keywords and negatives',
    text: 'Add relevant keywords, exclude wasted clicks and refine keyword bids.',
  },
  {
    icon: Target,
    title: 'Control targeting and conversions',
    text: 'Refine locations and conversion goals to match your business.',
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className={`${landing.section} scroll-mt-24 bg-white`} aria-labelledby="capabilities-heading">
      <div className={landing.container}>
        <div className="max-w-2xl">
          <p className={landing.label}>What the agent does</p>
          <h2 id="capabilities-heading" className={landing.h2}>It works inside your account, not beside it.</h2>
          <p className={landing.lead}>One conversation can take you from a performance question to a campaign launch, a budget adjustment or a keyword update. The agent handles the account work; you decide what goes ahead.</p>
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
