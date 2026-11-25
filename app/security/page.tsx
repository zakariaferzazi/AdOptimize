import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Key, Server, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = {
  title: 'Security Overview - AdOptimize',
  description: 'How AdOptimize handles Google Ads authorization, approved account changes, server-side credentials, and connected data.',
};

const controls = [
  {
    icon: Key,
    title: 'Google authorization',
    text: 'Users connect through Google’s authorization screen. AdOptimize never receives the user’s Google password, and access can be revoked through Google or disconnected in the app.',
  },
  {
    icon: Lock,
    title: 'Server-side connection credentials',
    text: 'Google Ads connection credentials are stored on the server and encrypted for storage. They are not placed in ordinary browser local storage or exposed in proposal responses.',
  },
  {
    icon: ShieldCheck,
    title: 'Approval before execution',
    text: 'The agent validates supported changes and creates a proposal. The user must approve the proposal before AdOptimize executes that change in Google Ads.',
  },
  {
    icon: Server,
    title: 'Account-scoped access',
    text: 'Workspace and billing routes use authenticated account identity and server-side checks. Connected Google Ads data and subscription access are bound to the signed-in user.',
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Launch App</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /><span>Security Overview</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Controls around your Google Ads connection</h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">This page summarizes implemented product controls. It is not a security certification, audit, or guarantee.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {controls.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900">Google user data and AI processing</h2>
          <p>AdOptimize uses authorized Google Ads data to provide dashboard views, analysis, proposals, and supported operations. AI requests may include relevant prompts, conversation history, account context, and the data needed to answer the request. Depending on the selected or configured model, processing may involve OpenRouter and Anthropic, OpenAI, or Google.</p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" /><span>Review the proposed current and new values before approving a change.</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" /><span>Disconnect or revoke Google access when you no longer need the integration.</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" /><span>Keep conversion tracking, bidding limits, budgets, and permissions appropriate for your business.</span></li>
          </ul>
          <p>AdOptimize’s legal, infrastructure, and security teams should verify the exact Google Limited Use, data-processing, provider, retention, and incident-response obligations before relying on this summary in a regulated procurement or compliance process.</p>
          <Link href="/privacy-policy" className="text-[#5B21B6] font-bold underline inline-flex items-center gap-1">
            Read the Privacy Policy <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2E1065] text-[#FBBF24] font-bold text-xs rounded-xl shadow-lg">
            Open AdOptimize Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
