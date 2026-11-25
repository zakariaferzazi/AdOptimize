import { Check, MessageSquare } from 'lucide-react';

export function ChatSimulation() {
  return (
    <section aria-label="Example conversation with the AI Marketing Agent" className="rounded-[1.75rem] bg-slate-100 p-4 sm:p-6">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><MessageSquare className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <p className="text-sm font-bold text-slate-950">AI Marketing Agent</p>
          <p className="text-xs text-slate-500">Example conversation</p>
        </div>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-white shadow-sm">
          Pause the two weakest ad groups in Brand Search and drop their keyword bids by 10%. Show me before anything changes.
        </p>

        <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-5 py-4 text-slate-800 shadow-sm">
          <p className="font-bold text-slate-950">Prepared 2 changes for your review.</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Status: awaiting approval · 2 ad groups · 14 keywords</p>
          <p className="mt-3 font-semibold text-slate-900">Checks completed:</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Both ad groups spent over $180 in the last 30 days with no conversions',
              'Keyword bids drop 10%, and none fall below the minimum bid',
              'Top-performing Brand keywords stay untouched',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-slate-100 pt-3 text-slate-600">Nothing is live yet. Approve the change when you are ready.</p>
        </div>
      </div>
    </section>
  );
}
