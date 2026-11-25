import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CampaignTable } from './product-preview';
import { ChatSimulation } from './chat-simulation';
import { landing } from './landing-ui';

export function Hero() {
  return (
    <section className="bg-white">
      <div className={`${landing.container} grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-24`}>
        <div>
          <p className={landing.label}>AI Marketing Agent for Google Ads</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 text-balance sm:text-5xl lg:text-6xl">
            An agent that runs your Google Ads, with your approval on every change.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            AdOptimize investigates performance, finds wasted spend, builds campaigns, and prepares budget, bidding, keyword and targeting changes. Approve a change and the agent executes it in your Google Ads account.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={landing.btnPrimary}>
              Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#pricing" className={landing.btnSecondary}>See Pro pricing</a>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Create your account first. Choose Pro when you are ready to use the agent.
          </p>
        </div>

        <ChatSimulation />
      </div>
    </section>
  );
}

export function InsideWorkspace() {
  return (
    <section className={`${landing.container} ${landing.section}`} aria-labelledby="workspace-heading">
      <div className="max-w-2xl">
        <p className={landing.label}>Inside the workspace</p>
        <h2 id="workspace-heading" className={landing.h2}>Every campaign, with the numbers behind each decision.</h2>
        <p className={landing.lead}>Your dashboard shows live performance. The agent uses the same data when it investigates, so its proposals are grounded in your account.</p>
      </div>
      <div className="mt-12">
        <CampaignTable />
      </div>
    </section>
  );
}
