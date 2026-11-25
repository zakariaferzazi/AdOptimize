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
          ['Daily budget', '$50.00 → $40.00'],
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
