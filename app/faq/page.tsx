import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, HelpCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - AdOptimize',
  description: 'Common questions about Google Ads integration, AI recommendations, budget safety limits, and automation.',
  alternates: {
    canonical: 'https://adoptimize.io/faq',
  },
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
    {
      q: 'How does AdOptimize connect to my Google Ads account?',
      a: 'AdOptimize connects securely via official Google OAuth 2.0 with the read/write advertising management scope. All tokens and developer credentials remain strictly server-side in encrypted environments. We never expose API keys to the browser.',
    },
    {
      q: 'Does AdOptimize change my bids or budgets without permission?',
      a: 'No. By default, AdOptimize operates in "Recommend" mode. Every suggested budget shift, negative keyword addition, or campaign pause requires your explicit click approval.',
    },
  ];

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

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

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/solutions" className="text-slate-300 hover:text-white">
              Solutions Hub
            </Link>
            <Link href="/" className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold rounded-xl shadow-xs transition-colors">
              Open SaaS App
            </Link>
          </div>
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
          {faqs.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <h3 className="font-bold text-slate-900 text-base">{f.q}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200/80 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-950 text-sm">Have more questions?</h4>
            <p className="text-xs text-emerald-800">Our engineering and ad strategist team is available 24/7.</p>
          </div>
          <Link
            href="/contact"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
