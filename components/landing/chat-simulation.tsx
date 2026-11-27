import { ArrowUp } from 'lucide-react';
import { landing } from './landing-ui';

export function ChatSimulation() {
  return (
    <div className="min-w-0">
      <section aria-label="Example conversation with the AI Marketing Agent" className={`${landing.mock} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280]" aria-hidden="true" />
          <p className="ml-3 text-xs font-semibold text-[#1F2937]">AI Marketing Agent</p>
        </div>

        <div className="space-y-4 p-5 text-sm leading-6 sm:p-6">
          <p className="ml-auto max-w-[85%] rounded-xl bg-[#6D28D9] px-4 py-3 text-white">
            Build an app install campaign. Aim for $1.50 per install with a $25 daily budget.
          </p>

          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1.5 text-xs font-semibold text-[#5B21B6]">
            Create App campaign · Target CPI $1.50
          </p>

          <div className="max-w-[92%] rounded-xl bg-[#F5F3FF] px-4 py-3 text-[#1F2937]">
            I drafted an install campaign with a $1.50 target cost per install and a $25 daily budget. Nothing is created in Google Ads until you approve.
          </div>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-[#DDD6FE] p-3 min-[420px]:flex-row min-[420px]:items-center">
            <p className="text-xs text-[#6B7280]">Waiting for your approval</p>
            <span className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#6D28D9] px-6 text-xs font-semibold text-white">
              Approve <ArrowUp className="h-3 w-3" aria-hidden="true" />
            </span>
          </div>
        </div>
      </section>
      <p className={landing.mockCaption}>Example data for illustration.</p>
    </div>
  );
}
