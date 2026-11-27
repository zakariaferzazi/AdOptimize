import { Check } from 'lucide-react';
import { ApprovalCard } from './product-preview';
import { landing } from './landing-ui';

const blocks = [
  {
    label: 'Ask in plain language',
    title: 'Find what is holding your campaigns back.',
    text: 'Ask where your budget is going and what deserves attention. The agent connects performance changes to campaign, keyword and search-term data so you can make an informed next move.',
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
    text: 'Give the agent your offer, goal and budget. It prepares the campaign settings and required structure, then creates the campaign in Google Ads after approval.',
    points: [
      'Search or App campaigns with budget, bidding and locations',
      'Ad groups and keywords created together in one request',
      'Specify a paused launch when you want to review before spending',
    ],
    panel: 'build',
  },
  {
    label: 'Approve and execute',
    title: 'Approve the change, and the agent applies it.',
    text: 'Each proposal shows current and new values side by side. Approve it and the agent applies it, then verifies the result in Google Ads.',
    points: [
      'Change budgets, bidding, keywords and targeting from one conversation',
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
    <div className="min-w-0">
      <section aria-label="Example cost per conversion comparison" className={`${landing.mock} p-5 sm:p-6`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Cost per conversion · this period vs previous</p>
        <ul className="mt-6 space-y-6">
          {rows.map((row) => (
            <li key={row.name}>
              <p className="break-words text-sm text-[#1F2937]">
                <span className="font-semibold text-[#2E1065]">{row.name}: </span>
                <span className="tabular-nums">${row.now.toFixed(2)} <span className="text-[#6B7280]">vs ${row.before.toFixed(2)}</span></span>
              </p>
              <div className="mt-2 space-y-1.5" aria-hidden="true">
                <div className="h-2 rounded-full bg-[#6D28D9]" style={{ width: `${(row.now / max) * 100}%` }} />
                <div className="h-2 rounded-full bg-[#DDD6FE]" style={{ width: `${(row.before / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className={landing.mockCaption}>Example data for illustration.</p>
    </div>
  );
}

function BuildPanel() {
  const settings = [
    ['Campaign', 'Search · Q3 Non-Brand draft'],
    ['Status', 'Paused'],
    ['Daily budget', '$60.00'],
    ['Max CPC limit', '$7.50'],
    ['Ad groups', '7'],
    ['Keywords', '126'],
  ];
  return (
    <div className="min-w-0">
      <section aria-label="Example campaign build summary" className={`${landing.mock} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Campaign draft</p>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Ready for review</span>
        </div>
        <dl className="mt-5 divide-y divide-[#DDD6FE] text-sm">
          {settings.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-[#6B7280]">{label}</dt>
              <dd className="font-semibold tabular-nums text-[#1F2937]">
                {label === 'Status' ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{value}</span>
                ) : value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <p className={landing.mockCaption}>Example data for illustration.</p>
    </div>
  );
}

export function FeatureBlocks() {
  return (
    <section className="border-t border-[#DDD6FE] bg-[#F5F3FF]" aria-label="How the agent works in your account">
      <div className={`${landing.container} ${landing.section} space-y-24`}>
        {blocks.map((block, index) => (
          <div key={block.label} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
              <p className={landing.label}>{block.label}</p>
              <h2 className={landing.h2}>{block.title}</h2>
              <p className={landing.lead}>{block.text}</p>
              <ul className="mt-7 space-y-3">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm font-medium leading-6 text-[#1F2937]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              {block.panel === 'approval' && (
                <div className="mt-6">
                  <ul aria-label="Possible execution statuses" className="flex flex-wrap gap-2 text-xs font-semibold">
                    <li className="rounded-full bg-green-50 px-3 py-1.5 text-green-800">Succeeded</li>
                    <li className="rounded-full bg-red-50 px-3 py-1.5 text-red-800">Failed</li>
                    <li className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">Unverified</li>
                  </ul>
                  <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                    Unverified means we could not confirm the change in Google Ads yet. You can check it in your activity history.
                  </p>
                </div>
              )}
            </div>
            <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
              {block.panel === 'investigation' && <InvestigationPanel />}
              {block.panel === 'build' && <BuildPanel />}
              {block.panel === 'approval' && (
                <div className="space-y-4">
                  <ApprovalCard />
                  <p className={landing.mockCaption}>Example data for illustration.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
