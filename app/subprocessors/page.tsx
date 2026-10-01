import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Database, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subprocessors - AdOptimize | Third-Party Infrastructure Disclosure',
  description: 'List of infrastructure sub-processors used by AdOptimize to securely deliver Google Ads monitoring and optimization services.',
};

export default function SubprocessorsPage() {
  const subprocessors = [
    {
      name: 'Google Cloud Platform (GCP)',
      purpose: 'Cloud hosting, database services, and server execution',
      location: 'United States & European Union',
    },
    {
      name: 'Firebase (Google LLC)',
      purpose: 'User authentication, security rules, and real-time document storage',
      location: 'United States',
    },
    {
      name: 'Google Ads API (Google LLC)',
      purpose: 'Authorized retrieval of campaign performance, search queries, and bid updates',
      location: 'Global (OAuth 2.0 endpoints)',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans">
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

          <Link
            href="/"
            className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span>Infrastructure & Trust</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            AdOptimize Subprocessors
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            To provide continuous 24/7 campaign analysis and secure data synchronization, AdOptimize engages third-party infrastructure providers that meet rigorous enterprise security standards.
          </p>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="divide-y divide-slate-100">
            {subprocessors.map((sub, i) => (
              <div key={i} className="p-6 space-y-1 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                <div className="text-slate-600">{sub.purpose}</div>
                <div className="text-xs text-slate-400 font-mono mt-1">Location: {sub.location}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
