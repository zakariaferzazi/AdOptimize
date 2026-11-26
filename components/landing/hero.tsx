import { ChatSimulation } from './chat-simulation';
import { landing } from './landing-ui';
import { LandingPrimaryCta } from './session-cta';

export function Hero() {
  return (
    <section className="bg-white">
      <div className={`${landing.container} ${landing.section} grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16`}>
        <div>
          <p className="inline-flex rounded-full bg-[#FBBF24] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#2E1065]">AI Marketing Agent for Google Ads</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#2E1065] text-balance sm:text-5xl lg:text-6xl">
            Your Google Ads agent. You approve every change.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280]">
            AdOptimize is the AI marketing agent for your Google Ads. It finds wasted spend, helps lower your cost per conversion and boosts ROAS, and you approve every change before it goes live.
          </p>
          <p className="mt-4 text-sm font-medium text-[#1F2937]">
            Built for in-house marketers, freelancers and agencies.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LandingPrimaryCta className="w-full sm:w-auto" />
            <a href="#pricing" className={`${landing.btnSecondary} w-full sm:w-auto`}>See Pro pricing</a>
          </div>
          <p className="mt-5 text-sm text-[#6B7280]">
            Free account to explore your dashboard. Pro ($29/mo) unlocks the agent.
          </p>
        </div>

        <ChatSimulation />
      </div>
    </section>
  );
}
