import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, ClipboardCheck, Layers3, Search, ShieldCheck, Target } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export const metadata: Metadata = {
  title: 'Features | AdOptimize',
  description: 'Explore the AI Marketing Agent, Google Ads audit, budget optimizer, and reports.',
  alternates: { canonical: '/features' },
};

const features = [
  { icon: Search, title: 'Investigate your Google Ads account', text: 'Ask the agent to analyze live campaigns, search terms, keywords, conversion setup, and performance across periods. It can investigate across multiple account resources before explaining what it found.' },
  { icon: Layers3, title: 'Build and manage campaigns', text: 'Describe a Search or App campaign for the agent to prepare. It can also propose supported changes to campaign status, budgets, bidding, dates, locations, and conversion goals.' },
  { icon: Target, title: 'Work with keywords and ad groups', text: 'Ask the agent to create a Search ad group, add positive or negative keywords, or adjust supported keyword and ad group settings.' },
  { icon: ShieldCheck, title: 'Approve before execution', text: 'Review the proposed change on its approval card. After your approval, the agent can execute supported changes in Google Ads and report the recorded outcome.' },
  { icon: ClipboardCheck, title: 'Run an account audit', text: 'Choose a reporting period and review campaign comparisons, non-converting search queries, keyword quality, and prioritized evidence-led findings. Export the findings as CSV.' },
  { icon: BarChart3, title: 'Optimize budgets and report performance', text: 'Review budget recommendations and create period-specific reports with previous-period comparisons, campaign breakdowns, CSV exports, and print-ready views.' },
];

export default function FeaturesPage() {
  return (
    <div className="site-page">
      <SiteHeader />
      <main className="site-container py-20">
        <div className="max-w-3xl">
          <span className="site-label">THE PRO WORKSPACE</span>
          <h1 className="site-heading">An AI marketing agent built to act.</h1>
          <p className="site-intro">From investigating an account to executing an approved change, AdOptimize brings the work together. Explore the dashboard and preview Pro before subscribing.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="site-card">
              <div className="site-icon"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <h2 className="mt-6 text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/sign-up" className="site-button">Explore the workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/pricing" className="site-button-secondary">See Pro pricing</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
