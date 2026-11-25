import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ChatSimulation } from './chat-simulation';
import { landing } from './landing-ui';

export function Hero() {
  return (
    <section className="bg-white">
      <div className={`${landing.container} grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-24`}>
        <div>
          <p className={landing.label}>AI Marketing Agent for Google Ads</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 text-balance sm:text-5xl lg:text-6xl">
            Your Google Ads agent. You approve every change.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            AdOptimize finds wasted spend, explains performance swings and builds campaigns. You review each proposal, and the agent applies it in Google Ads.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-700">
            Built for in-house marketers, freelancers and agencies.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={landing.btnPrimary}>
              Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#pricing" className={landing.btnSecondary}>See Pro pricing</a>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Free account to explore your dashboard. Pro ($29/mo) unlocks the agent.
          </p>
        </div>

        <ChatSimulation />
      </div>
    </section>
  );
}
