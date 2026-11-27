import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'About Us - AdOptimize | Mission & Background',
  description: 'Learn what AdOptimize does and how its AI marketing agent helps users analyze, create, and manage Google Ads campaigns.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">
            Our Mission
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            A practical AI agent for Google Ads work
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            AdOptimize connects Google Ads account data with an AI marketing agent so users can investigate performance, prepare campaigns, and manage approved changes in one workspace.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">Why We Built AdOptimize</h2>
          <p>
            Google Ads accounts generate detailed performance and configuration data, but finding the cause of a change and turning that finding into a reviewed action can require switching between reports and campaign settings.
          </p>
          <p>
            AdOptimize is designed for in-house marketers, freelancers, and agencies who want help understanding campaign, keyword, search-term, conversion, and bidding data—and, with approval, applying supported account changes. Start with the Free AI Ads Audit plan: five read-only Google Ads audits per calendar month (UTC). Pro Monthly and Pro Yearly unlock the dashboard, campaign workspace, AI Marketing Agent and advanced management features.
          </p>
          <p>The agent can explain account performance, create supported Search or App campaigns, and prepare changes to budgets, bidding, status, dates, networks, locations, keywords, negatives, tracking, and conversion goals. Results are not guaranteed, and users review and approve each proposed change before it is executed in Google Ads.</p>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E1065] text-[#FBBF24] font-bold text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
          >
            <span>Experience AdOptimize Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
