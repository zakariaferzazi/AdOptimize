import { Check } from 'lucide-react';
import { ApprovalCard } from './product-preview';
import { landing } from './landing-ui';

const blocks = [
  {
    label: 'Ask in plain language',
    title: 'Get the cause of a change, with the numbers behind it.',
    text: 'Ask why performance moved. The agent compares your chosen period with the previous one and traces the change down to the campaign, keyword or search term.',
    points: [
      'Compare any period with the equal period before it',
      'Break results down by device, network or day',
      'See which search terms cost money without converting',
    ],
    panel: 'investigation',
  },
  {
    label: 'Build from a brief',
    title: 'Describe the campaign. The agent sets it up.',
    text: 'Give the agent the goal, budget and bidding limit. It prepares the campaign structure, ad groups and keywords for you to review before anything reaches Google Ads.',
    points: [
      'Search or App campaigns with budget, bidding and locations',
      'Ad groups and keywords created together in one request',
      'New campaigns start paused until you choose to enable them',
    ],
    panel: 'build',
  },
  {
    label: 'Approve and execute',
    title: 'Approve the change, and the agent applies it.',
    text: 'Each proposal shows current and new values side by side. Approve it and the agent applies it in Google Ads, then verifies the result in Google Ads.',
    points: [
      'Unapproved proposals expire after 24 hours',
      'Each execution is recorded as succeeded, failed or unverified',
    ],
    panel: 'approval',
  },
] as const;

function InvestigationPanel() {
  const rows = [
    { name: 'Core Search – US', now: 25.83, before: 14.2 },
    { name: 'Brand – US', now: 8.38, before: 9.1 },
    { name: 'Shopping – UK', now: 31.4, before: 19.6 },
  ];
  const max = Math.max(...rows.flatMap((row) => [row.now, row.before]));
  return (
    <section aria-label="Example cost per conversion comparison" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost per conversion · this period vs previous</p>
      <ul className="mt-6 space-y-6">
        {rows.map((row) => (
          <li key={row.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-950">{row.name}:</span>
              <span className="tabular-nums text-slate-600">${row.now.toFixed(2)} <span className="text-slate-400">vs ${row.before.toFixed(2)}</span></span>
            </div>
            <div className="mt-2 space-y-1.5" aria-hidden="true">
              <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${(row.now / max) * 100}%` }} />
              <div className="h-2 rounded-full bg-slate-200" style={{ width: `${(row.before / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Example data for illustration.</p>
    </section>
  );
}

function BuildPanel() {
  const settings = [
    ['Campaign', 'Search · Q3 Non-Brand'],
    ['Status', 'Paused'],
    ['Daily budget', '$60.00'],
    ['Max CPC limit', '$7.50'],
    ['Ad groups', '7'],
    ['Keywords', '126'],
  ];
  return (
    <section aria-label="Example campaign build summary" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campaign build</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Ready for review</span>
      </div>
      <dl className="mt-5 divide-y divide-slate-100 text-sm">
        {settings.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Example data for illustration.</p>
    </section>
  );
}

export function FeatureBlocks() {
  return (
    <section className="border-t border-slate-200 bg-slate-50" aria-label="How the agent works in your account">
      <div className={`${landing.container} space-y-24 py-20 sm:py-28`}>
        {blocks.map((block, index) => (
          <div key={block.label} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
              <p className={landing.label}>{block.label}</p>
              <h2 className={landing.h2}>{block.title}</h2>
              <p className={landing.lead}>{block.text}</p>
              <ul className="mt-7 space-y-3">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-800">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
              {block.panel === 'investigation' && <InvestigationPanel />}
              {block.panel === 'build' && <BuildPanel />}
              {block.panel === 'approval' && (
                <div className="space-y-4">
                  <ApprovalCard />
                  <p className="text-center text-xs text-slate-500">Example data for illustration.</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Unverified means we could not confirm the change in Google Ads yet. You can check it in your activity history.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
