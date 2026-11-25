import { CheckCircle2, Clock3 } from 'lucide-react';

export function ApprovalCard() {
  return (
    <section aria-label="Example proposed change waiting for approval" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposed change</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">Core Search – US</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Awaiting approval
        </span>
      </div>

      <dl className="mt-5 divide-y divide-slate-100 text-sm">
        {[
          ['Daily budget', '$40.00 → $50.00'],
          ['Max CPC limit', '$7.50 → $5.00'],
          ['Negative keywords', '+2 exact match'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        Reason: two broad-match queries took 42% of spend with no conversions in the last 14 days.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-white">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
        </span>
        <span className="rounded-full border border-slate-300 px-4 py-2 text-slate-700">Revise</span>
        <span className="rounded-full px-4 py-2 text-slate-500">Cancel</span>
      </div>
    </section>
  );
}

const rows = [
  { name: 'Core Search – US', status: 'Enabled', spend: '$1,240', conv: '48', cpa: '$25.83', roas: '3.1x' },
  { name: 'Brand – US', status: 'Enabled', spend: '$310', conv: '37', cpa: '$8.38', roas: '6.4x' },
  { name: 'Product Shopping – UK', status: 'Paused', spend: '$0', conv: '0', cpa: '—', roas: '—' },
];

export function CampaignTable() {
  return (
    <section aria-label="Example campaign performance table" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-950">Campaigns · Last 30 days</h3>
        <span className="text-xs text-slate-500">Example data</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3">Campaign</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3 text-right">Spend</th>
              <th scope="col" className="px-3 py-3 text-right">Conv.</th>
              <th scope="col" className="px-3 py-3 text-right">CPA</th>
              <th scope="col" className="px-5 py-3 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row" className="px-5 py-3.5 font-semibold text-slate-950">{row.name}</th>
                <td className="px-3 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === 'Enabled' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.status}</span>
                </td>
                <td className="px-3 py-3.5 text-right text-slate-700">{row.spend}</td>
                <td className="px-3 py-3.5 text-right text-slate-700">{row.conv}</td>
                <td className="px-3 py-3.5 text-right text-slate-700">{row.cpa}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-950">{row.roas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
