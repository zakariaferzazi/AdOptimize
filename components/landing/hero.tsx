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
            Your Google Ads agent. Built to take action.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280]">
            Tell AdOptimize what you want to achieve. Your AI Marketing Agent analyzes performance, builds campaigns, manages budgets and bidding, and applies the changes you approve. Less manual work, with optimization decisions focused on your CPA and ROAS goals.
          </p>
          <p className="mt-4 text-sm font-medium text-[#1F2937]">
            Built for in-house marketers, freelancers and agencies.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LandingPrimaryCta className="w-full sm:w-auto" />
            <a href="#pricing" className={`${landing.btnSecondary} w-full sm:w-auto`}>See Pro pricing</a>
          </div>
          <p className="mt-5 text-sm text-[#6B7280]">
            Explore your dashboard with a free account. Pro unlocks the agent from $29/month or $99/year.
          </p>
        </div>

        <ChatSimulation />
      </div>
    </section>
  );
}
