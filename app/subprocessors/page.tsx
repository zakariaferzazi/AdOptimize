import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = {
  title: 'Service Providers - AdOptimize',
  description: 'Service providers and integrations used to operate AdOptimize, connect Google Ads, process subscriptions, and provide AI assistance.',
};

const providers = [
  { name: 'Google / Firebase', purpose: 'User authentication and selected application data storage and synchronization.', location: 'Google-operated infrastructure; region depends on configuration.' },
  { name: 'Google Ads API and Google OAuth', purpose: 'Authorized Google sign-in, Google Ads account data retrieval, and supported approved campaign operations.', location: 'Google-operated services.' },
  { name: 'Cloudflare', purpose: 'Application hosting, server execution, D1-backed billing and agent records, and delivery infrastructure.', location: 'Cloudflare infrastructure; processing may occur globally.' },
  { name: 'Polar', purpose: 'Checkout, recurring subscription billing, applicable tax handling, invoices, and customer billing portal.', location: 'Polar billing services.' },
  { name: 'OpenRouter and configured AI model providers', purpose: 'AI reasoning for user requests. Depending on the selected/configured model, prompts and account context may be processed by OpenRouter and Anthropic, OpenAI, or Google.', location: 'Provider infrastructure varies by model.' },
];

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Launch App</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center gap-1.5"><Database className="w-4 h-4" /><span>Infrastructure &amp; Service Providers</span></span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Service Providers</h1>
          <p className="text-sm text-slate-600 leading-relaxed">AdOptimize uses the following services to authenticate users, store application data, connect Google Ads, process subscriptions, and provide AI assistance. This list should be reviewed whenever infrastructure or model providers change.</p>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="divide-y divide-slate-100">
            {providers.map((provider) => (
              <div key={provider.name} className="p-6 space-y-1 text-xs sm:text-sm">
                <h2 className="font-bold text-slate-900 text-sm">{provider.name}</h2>
                <p className="text-slate-600">{provider.purpose}</p>
                <p className="text-xs text-slate-500 mt-1">Location: {provider.location}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[#DDD6FE] bg-white text-xs sm:text-sm text-slate-600">
          <p>For regulated deployments, the applicable data-processing agreements, transfer mechanisms, regional hosting choices, and provider contract status require legal and security confirmation.</p>
        </div>

        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E1065] text-[#FBBF24] font-bold text-xs rounded-xl shadow-lg">
            <span>Back to Dashboard</span><ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
