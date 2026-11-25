import Link from 'next/link';
import { ArrowRight, MessageSquare, Check } from 'lucide-react';
import { ApprovalCard, CampaignTable } from './product-preview';
import { landing } from './landing-ui';

export function Hero() {
  return (
    <section className="bg-white">
      <div className={`${landing.container} grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.02fr_1fr] lg:gap-16 lg:pb-24 lg:pt-24`}>
        <div>
          <p className={landing.label}>AI Marketing Agent for Google Ads</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 text-balance sm:text-5xl lg:text-6xl">
            An agent that runs your Google Ads, with your approval on every change.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            AdOptimize investigates performance, finds wasted spend, builds campaigns, and prepares budget, bidding, keyword and targeting changes. Approve a change and the agent executes it in your Google Ads account.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#pricing" className={landing.btnPrimary}>
              Get Pro from $29/month <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/sign-up" className={landing.btnSecondary}>Create your account</Link>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Your dashboard and campaign data are available with an account. Pro unlocks the agent and campaign changes.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-[1.75rem] bg-indigo-50 p-4 sm:p-6">
            <div className="space-y-4">
              <div className="ml-auto flex max-w-md items-start gap-3 rounded-2xl rounded-tr-sm bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <p>Our CPA doubled on Core Search this week. Find the cause and prepare the fix.</p>
              </div>
              <ApprovalCard />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Example conversation and data for illustration. Results depend on your account.</p>
        </div>
      </div>

      <div className="border-y border-slate-200 bg-slate-50">
        <ul className={`${landing.container} grid gap-4 py-6 text-sm font-medium text-slate-700 sm:grid-cols-3`}>
          {['Connects through Google sign-in and Google Ads authorization', 'Nothing changes until you approve it', 'Every outcome is logged as succeeded, failed or unverified'].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
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
