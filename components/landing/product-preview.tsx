import { CheckCircle2, Clock3 } from 'lucide-react';
import { landing } from './landing-ui';

export function ApprovalCard() {
  return (
    <section aria-label="Example proposed change waiting for approval" className={`${landing.mock} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Proposed change</p>
          <h3 className="mt-1 text-sm font-bold text-[#2E1065]">Core Search – US</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Awaiting approval
        </span>
      </div>

      <dl className="mt-5 divide-y divide-[#DDD6FE] text-sm">
        {[
          ['Daily budget', '$50.00 → $40.00'],
          ['Max CPC limit', '$7.50 → $5.00'],
          ['Negative keywords', '+2 exact match'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[#6B7280]">{label}</dt>
            <dd className="font-semibold tabular-nums text-[#1F2937]">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 rounded-xl bg-[#F5F3FF] p-3 text-xs leading-5 text-[#6B7280]">
        Reason: two broad-match queries took 42% of spend with no conversions in the last 14 days.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2 text-sm font-semibold min-[420px]:grid-cols-3">
        <span className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#6D28D9] px-6 text-white">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
        </span>
        <span className="inline-flex h-12 items-center justify-center rounded-xl border border-[#6D28D9] px-6 text-[#6D28D9]">Revise</span>
        <span className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-red-700">Cancel</span>
      </div>
    </section>
  );
}
