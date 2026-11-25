import { ArrowUp } from 'lucide-react';

export function ChatSimulation() {
  return (
    <section aria-label="Example conversation with the AI Marketing Agent" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
        <p className="ml-3 text-xs font-semibold text-slate-600">AI Marketing Agent</p>
      </div>

      <div className="space-y-4 p-5 text-sm leading-6 sm:p-6">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-white">
          Build me a campaign that gets app installs at $1.50 each.
        </p>

        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
          Create App campaign · Target CPI $1.50
        </p>

        <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-slate-800">
          I drafted an install campaign with a $1.50 target cost per install and a $25 daily budget. Nothing is created in Google Ads until you approve.
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-600">Waiting for your approval</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
            Approve <ArrowUp className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
        <p className="text-center text-xs text-slate-500">Example data for illustration.</p>
      </div>
    </section>
  );
}
