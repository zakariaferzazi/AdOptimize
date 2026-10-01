import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, HelpCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - AdOptimize',
  description: 'Common questions about Google Ads integration, AI recommendations, budget safety limits, and automation.',
};

export default function FaqPage() {
  const faqs = [
    {
      q: 'Does AdOptimize require changing our Google Ads campaign structure?',
      a: 'No. AdOptimize connects non-invasively to your existing campaigns, ad groups, and keyword lists. It detects optimizations without forcing you to restructure your account.',
    },
    {
      q: 'How frequently does AdOptimize synchronize Google Ads performance?',
      a: 'On our Pro and Business plans, AdOptimize runs background synchronization every 15 minutes, scanning for acute CPA spikes, zero-conversion budget drains, or sudden spend spikes.',
    },
    {
      q: 'Can we revert a budget shift or negative keyword addition?',
      a: 'Yes. AdOptimize maintains a comprehensive audit log in the Change History view with full timestamp, previous values, and a 1-click "Revert" button for all supported actions.',
    },
    {
      q: 'Is our advertising performance data private?',
      a: 'Yes. We strictly isolate all customer account data. We never sell your data or use your campaign keywords to train external foundation models.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <header className="bg-[#0d1117] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </Link>

          <Link href="/" className="px-4 py-2 bg-[#00d67d] text-slate-950 font-bold text-xs rounded-xl shadow-xs">
            Open SaaS App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Knowledge Base
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Everything you need to know about our Google Ads AI Marketing Manager, data security, and automation controls.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-2">
              <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-2xl shadow-xl hover:bg-slate-900 transition-colors"
          >
            <span>Launch Live AdOptimize App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
