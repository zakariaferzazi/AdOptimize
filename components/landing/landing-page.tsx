import Link from 'next/link';
import { ArrowRight, BarChart3, Check, ClipboardCheck, Layers3, MousePointerClick, Search, ShieldCheck, Sparkles, Target, Zap } from 'lucide-react';
import { PricingCards } from '@/components/landing/pricing-cards';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';
import { faqs } from '@/components/landing/faq-data';

const capabilities = [
  { icon: Search, title: 'Investigate the account', text: 'Dig into campaigns, search terms, keywords, conversions, and period-over-period performance using live Google Ads data.' },
  { icon: Layers3, title: 'Build campaigns', text: 'Brief the agent to prepare supported Search or App campaigns, including budgets, bidding, locations, and campaign settings.' },
  { icon: Target, title: 'Optimize what is running', text: 'Prepare changes to budgets, bidding, targeting, keywords, negatives, and campaign or ad group status.' },
  { icon: ClipboardCheck, title: 'Audit with evidence', text: 'Review prioritized findings, non-converting queries, and campaign performance for the period you choose.' },
  { icon: Zap, title: 'Put budgets to work', text: 'Compare performance and review budget recommendations before making supported changes.' },
  { icon: BarChart3, title: 'Report the results', text: 'Create period-specific reports, compare previous performance, and export CSV or print-ready reports.' },
];

export function LandingPage() {
  return (
    <div className="site-page">
      <SiteHeader />
      <main>
        <section className="site-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
          <div>
            <span className="site-eyebrow"><Sparkles className="h-4 w-4" aria-hidden="true" /> Your AI Google Ads specialist</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">Tell your ads agent what to do. <span className="text-indigo-600">Then let it do the work.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">AdOptimize investigates your Google Ads account, builds campaigns, and prepares optimizations it can execute for you. You review and approve every change before it goes live.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="site-button" href="/sign-up">Explore your workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <a className="site-button-secondary" href="#agent">See the agent in action</a>
            </div>
            <p className="mt-5 text-sm text-slate-500">Explore the dashboard before subscribing. <Link href="/dashboard?demo=true" className="font-semibold text-indigo-700 underline">View example dashboard</Link></p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-400 p-5 shadow-2xl shadow-indigo-300/40 sm:p-8">
            <div className="relative rounded-3xl bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
                <div><p className="font-bold text-slate-900">AI Marketing Agent</p><p className="text-xs text-slate-500">Investigate. Prepare. Execute.</p></div>
                <span className="ml-auto rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Example</span>
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <p className="ml-8 rounded-2xl rounded-tr-sm bg-indigo-50 p-4 leading-relaxed text-indigo-950">Review my Search campaign and prepare a daily budget change.</p>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Budget change prepared</div>
                  <p className="mt-2 leading-relaxed text-slate-600">Review the campaign and proposed budget before approving the change.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">$40 / day</span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" /><span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">$50 / day</span></div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Waiting for your approval</div>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">Illustrative example. Changes are subject to account access and Google Ads validation.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-indigo-100 bg-white"><div className="site-container grid gap-5 py-7 text-sm font-semibold text-slate-600 sm:grid-cols-3">
          <p className="flex items-center gap-3"><Search className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Investigates your live account</p>
          <p className="flex items-center gap-3"><MousePointerClick className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Executes supported changes</p>
          <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-indigo-600" aria-hidden="true" /> You approve before execution</p>
        </div></section>

        <section id="agent" className="site-container scroll-mt-32 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <div><span className="site-label">MORE THAN A CHATBOT</span><h2 className="site-heading">From a request to a real Google Ads change.</h2><p className="site-intro">Stop switching between advice and execution. Your agent can look up the account details, prepare the work, and carry out supported changes after you approve them.</p><Link href="/sign-up" className="site-button mt-8">Explore the agent <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
            <div className="space-y-4">{[
              ['01', 'Give it a goal', 'Ask it to investigate a CPA increase, build a Search campaign, or prepare a budget adjustment.'],
              ['02', 'It investigates and prepares', 'The agent uses live account data, resolves the relevant campaign, and prepares a proposal with the change to review.'],
              ['03', 'You approve. It executes.', 'Approve the proposal card to send the supported change to Google Ads. Review the recorded outcome in your activity history.'],
            ].map(([n, title, text]) => <div key={n} className="site-card flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">{n}</span><div><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div>
          </div>
        </section>

        <section id="features" className="scroll-mt-32 bg-white py-20 sm:py-28"><div className="site-container">
          <div className="max-w-3xl"><span className="site-label">BUILT FOR THE WORK BEHIND THE ADS</span><h2 className="site-heading">A specialist, an audit, and the tools to act.</h2><p className="site-intro">Go from account investigation to an approved change without losing the context along the way.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="site-card bg-indigo-50/40"><div className="site-icon"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-6 text-lg font-bold text-slate-900">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
          <Link href="/features" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline">Explore the features <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div></section>

        <section id="how-it-works" className="site-container scroll-mt-32 py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div><span className="site-label">YOUR ACCOUNT, YOUR CONTROL</span><h2 className="site-heading">Move faster without handing over the keys.</h2><p className="site-intro">The agent prepares changes against your connected account. You review the proposal before execution, and the recorded outcome tells you what happened.</p><ul className="mt-6 space-y-4">{['Connect through Google authorization', 'See the proposed change before approving', 'Review execution outcomes in your activity history'].map(item => <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><Check className="h-5 w-5 text-indigo-600" aria-hidden="true" />{item}</li>)}</ul></div><div className="rounded-[2rem] bg-indigo-950 p-8 text-white sm:p-10"><ShieldCheck className="h-10 w-10 text-indigo-300" aria-hidden="true" /><h3 className="mt-6 text-2xl font-bold">Your approval is the difference.</h3><p className="mt-4 leading-7 text-indigo-100">The agent can do the legwork and execute supported operations on your behalf. It does not apply its proposed changes just because it suggested them.</p></div></div></section>

        <section id="pricing" className="site-container scroll-mt-32 pb-20 sm:pb-28"><div className="text-center"><span className="site-label">PRO PRICING</span><h2 className="site-heading">One powerful Pro. Two ways to pay.</h2><p className="site-intro">Unlock the agent and every Pro tool. Choose monthly flexibility or yearly value.</p></div><PricingCards /></section>
        <section id="faq" className="scroll-mt-32 bg-white py-20 sm:py-28"><div className="site-container grid gap-10 lg:grid-cols-[1fr_1.5fr]"><div><span className="site-label">GOOD TO KNOW</span><h2 className="site-heading">Questions? Answered.</h2><p className="site-intro">Need more help? <Link href="/contact" className="font-semibold text-indigo-700 underline">Get in touch</Link>.</p></div><div className="divide-y divide-slate-200">{faqs.map(item => <details key={item.question} className="group py-5"><summary className="cursor-pointer list-none pr-6 font-bold text-slate-900 marker:content-none">{item.question}<span className="float-right text-indigo-600 group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p></details>)}</div></div></section>
        <section className="site-container py-20"><div className="rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 px-7 py-14 text-center text-white sm:px-12"><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to put your agent to work?</h2><p className="mx-auto mt-4 max-w-xl leading-relaxed text-indigo-100">Explore the workspace and choose a Pro plan when you&apos;re ready.</p><Link href="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">Explore your workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
