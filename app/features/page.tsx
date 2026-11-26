import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { SlidersHorizontal, ShieldCheck, Zap, ArrowRight, CheckCircle2, Bot, BarChart3 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Features - AI Google Ads Analysis and Campaign Management | AdOptimize',
  description: 'Explore AdOptimize AI analysis, campaign creation, budgets, bidding, keywords, conversion settings, reports, and approval-controlled Google Ads changes.',
  path: '/features',
});

const capabilities = [
  { icon: BarChart3, title: 'Account analysis', desc: 'Ask about performance at account, campaign, ad-group, or keyword level and investigate changes by period, device, or network.' },
  { icon: SlidersHorizontal, title: 'Budgets and bidding', desc: 'Prepare supported changes to daily budgets, campaign bidding strategies, target CPA or ROAS, and max CPC limits.' },
  { icon: ShieldCheck, title: 'Approval-controlled execution', desc: 'Review each proposal’s account, current values, proposed values, and reason before approving execution in Google Ads.' },
  { icon: Zap, title: 'Keywords and waste review', desc: 'Review search terms, non-converting queries, keyword performance, and proposed positive or negative keyword changes.' },
  { icon: Bot, title: 'Campaign creation', desc: 'Draft supported Search and App campaigns with goals, budgets, locations, bidding, ad-group structure, and keywords for review.' },
  { icon: CheckCircle2, title: 'Targeting and conversions', desc: 'Prepare changes to locations, tracking settings, campaign conversion goals, and selected conversion actions when supported.' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Open Workspace</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Platform Capabilities</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Analyze, build, and manage Google Ads with an AI agent</h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">Limited dashboard access is available without Pro. Pro Monthly and Pro Yearly unlock the agent, advanced analysis, audits, reports, campaign creation, and supported Google Ads changes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <div key={capability.title} className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                <h2 className="text-base font-bold text-slate-900">{capability.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{capability.desc}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto max-w-2xl text-center text-xs text-slate-500">Supported operations depend on Google Ads account permissions, campaign type, data availability, and Google Ads API requirements. AdOptimize does not guarantee advertising outcomes.</p>

        <div className="text-center pt-4">
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2E1065] text-[#FBBF24] font-bold text-xs rounded-xl shadow-xl">
            <span>View Pro pricing</span><ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
