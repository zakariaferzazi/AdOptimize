import { ChatSimulation } from './chat-simulation';
import { landing } from './landing-ui';
import { LandingPrimaryCta } from './session-cta';

export function Hero() {
  return (
    <section className="bg-white">
      <div className={`${landing.container} ${landing.section} grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16`}>
        <div>
          <p className="inline-flex rounded-full bg-[#FBBF24] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#2E1065]">Free audit · Pro AI Marketing Agent</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#2E1065] text-balance sm:text-5xl lg:text-6xl">
            Find wasted spend with a free Google Ads audit.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280]">
            Start with five free, read-only audits per month to review performance, costly queries and keyword Quality Scores. When you are ready to act, Pro unlocks your AI Marketing Agent to build campaigns, manage budgets and bidding, and apply the changes you approve.
          </p>
          <p className="mt-4 text-sm font-medium text-[#1F2937]">
            Built for in-house marketers, freelancers and agencies.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LandingPrimaryCta className="w-full sm:w-auto" />
            <a href="#pricing" className={`${landing.btnSecondary} w-full sm:w-auto`}>See Pro pricing</a>
          </div>
          <p className="mt-5 text-sm text-[#6B7280]">
            No card required for Free. Dashboard and campaign management require Pro: $29/month or $99/year.
          </p>
        </div>

        <ChatSimulation />
      </div>
    </section>
  );
}
