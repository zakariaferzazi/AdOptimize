import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, ClipboardCheck, MessageSquareText, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { PricingCards } from '@/components/landing/pricing-cards';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';
import { faqs } from '@/components/landing/faq-data';

const features = [
  { icon: ClipboardCheck, title: 'Find the opportunities', text: 'Review campaign performance and search terms to uncover areas worth a closer look.' },
  { icon: Sparkles, title: 'Get an action plan', text: 'Ask the AI Marketing Agent questions and turn account data into actionable recommendations.' },
  { icon: Target, title: 'Put budget to work', text: 'Compare campaign performance and explore budget recommendations with your goals in mind.' },
  { icon: BarChart3, title: 'See the bigger picture', text: 'Bring campaign metrics, reports, and account activity together in one workspace.' },
];

export function LandingPage() {
  return (
    <div className="site-page">
      <SiteHeader />
      <main>
        <section className="site-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div>
            <span className="site-eyebrow"><Sparkles className="h-4 w-4" aria-hidden="true" /> Your AI-powered Google Ads workspace</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">Make every ad dollar <span className="text-indigo-600">work harder.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">Understand your Google Ads performance, find opportunities, and move from data to decisions with an AI marketing agent by your side.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="site-button" href="/sign-up">Get started free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <a className="site-button-secondary" href="#how-it-works">See how it works</a>
            </div>
            <p className="mt-5 text-sm text-slate-500">Start free. Connect with Google. You approve changes. <Link href="/dashboard?demo=true" className="font-semibold text-indigo-700 underline">View demo</Link></p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-500 to-sky-400 p-6 shadow-2xl shadow-indigo-300/40 sm:p-9">
            <div className="absolute -right-12 -top-20 h-56 w-56 rotate-12 rounded-[3rem] bg-indigo-900/30" aria-hidden="true" />
            <div className="relative rounded-3xl bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Sparkles className="h-5 w-5" /></span>
                <div><p className="font-bold text-slate-900">AI Marketing Agent</p><p className="text-xs text-slate-500">Your account, in focus</p></div>
                <span className="ml-auto rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Example</span>
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <p className="ml-8 rounded-2xl rounded-tr-sm bg-indigo-50 p-4 leading-relaxed text-indigo-950">Where should I focus my Google Ads budget?</p>
                <div className="mr-5 rounded-2xl rounded-tl-sm bg-slate-50 p-4 leading-relaxed text-slate-600"><p className="font-semibold text-slate-900">Let&apos;s take a closer look.</p><p className="mt-1">I&apos;ll review your campaign performance and surface opportunities for you to consider.</p></div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-indigo-600" /> Illustrative example; results depend on your account.</div>
            </div>
            <Image src="/auth_panel.png" alt="" width={560} height={300} className="relative mx-auto mt-5 max-h-40 w-auto object-contain" />
          </div>
        </section>

        <section className="border-y border-indigo-100 bg-white">
          <div className="site-container grid gap-5 py-7 text-sm font-semibold text-slate-600 sm:grid-cols-3">
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Connect through Google</p>
            <p className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-indigo-600" /> Review before changes</p>
            <p className="flex items-center gap-3"><MessageSquareText className="h-5 w-5 text-indigo-600" /> Insights in plain language</p>
          </div>
        </section>

        <section id="features" className="site-container scroll-mt-32 py-20 sm:py-28">
          <div className="max-w-2xl"><span className="site-label">THE WORKSPACE</span><h2 className="site-heading">Less digging. More doing.</h2><p className="site-intro">The tools you need to understand your account and decide what to do next, all in one place.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="site-card"><div className="site-icon"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-6 text-lg font-bold text-slate-900">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-32 bg-white py-20 sm:py-28">
          <div className="site-container"><div className="max-w-2xl"><span className="site-label">HOW IT WORKS</span><h2 className="site-heading">From connection to clarity.</h2><p className="site-intro">A straightforward workflow, built around your decisions.</p></div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">{[
              ['01', 'Connect your account', 'Create an account and authorize your Google Ads connection.'],
              ['02', 'Explore your performance', 'Review campaigns, ask questions, and identify opportunities.'],
              ['03', 'Decide what comes next', 'Review recommendations and approve the changes you want to make.'],
            ].map(([number, title, text]) => <div key={number} className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-7"><span className="text-sm font-bold text-indigo-600">{number}</span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div>
          </div>
        </section>

        <section id="pricing" className="site-container scroll-mt-32 py-20 sm:py-28">
          <div className="text-center"><span className="site-label">SIMPLE PRICING</span><h2 className="site-heading">Start free. Grow with Pro.</h2><p className="site-intro">Choose the tools that fit the way you work.</p></div>
          <PricingCards />
        </section>

        <section id="faq" className="scroll-mt-32 bg-white py-20 sm:py-28"><div className="site-container grid gap-10 lg:grid-cols-[1fr_1.5fr]"><div><span className="site-label">GOOD TO KNOW</span><h2 className="site-heading">Questions? Answered.</h2><p className="site-intro">Need more help? <Link href="/contact" className="font-semibold text-indigo-700 underline">Get in touch</Link>.</p></div><div className="divide-y divide-slate-200">{faqs.map(item => <details key={item.question} className="group py-5"><summary className="cursor-pointer list-none pr-6 font-bold text-slate-900 marker:content-none">{item.question}<span className="float-right text-indigo-600 group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p></details>)}</div></div></section>
        <section className="site-container py-20"><div className="rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 px-7 py-14 text-center text-white sm:px-12"><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to put your data to work?</h2><p className="mx-auto mt-4 max-w-xl leading-relaxed text-indigo-100">Connect your Google Ads account and find your next opportunity with AdOptimize.</p><Link href="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">Get started free <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
