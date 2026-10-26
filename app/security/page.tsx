import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Key, Server, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = {
  title: 'Security & Compliance - AdOptimize | Enterprise Data Protection',
  description: 'Learn how AdOptimize secures your Google Ads account data with AES-256 encryption, OAuth 2.0 isolation, and zero third-party disclosure.',
};

export default function SecurityPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'AES-256 Encryption at Rest & TLS 1.3 in Transit',
      desc: 'All campaign performance statistics, customer metadata, and credentials are encrypted using industry-standard protocols.',
    },
    {
      icon: Key,
      title: 'Google OAuth 2.0 Client Isolation',
      desc: 'We never see or store your Google password. Access tokens are secured server-side and never exposed to the client browser.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Silent Changes Guarantee',
      desc: 'AdOptimize operates by default in Recommendation mode. Budget reallocations and keyword changes require explicit 1-click human verification.',
    },
    {
      icon: Server,
      title: 'Zero Third-Party Model Training',
      desc: 'Your advertising search terms, Quality Scores, and spend metrics are strictly confidential. We never use your data to train external public LLMs.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans">
      <header className="bg-[#0d1117] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Enterprise Security & Trust</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Bank-Grade Security for Your Google Ads Data
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Your advertising budget is your most sensitive capital. AdOptimize is built from the ground up with defensive guardrails, strict encryption, and transparent audit logging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900">Google API Services User Data Policy Compliance</h2>
          <p>
            AdOptimize complies strictly with the <strong className="text-slate-900">Google API Services User Data Policy</strong>, including the Limited Use requirements.
          </p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>We only request the minimum OAuth scopes necessary to read campaign performance statistics and dispatch authorized budget and keyword adjustments.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>We never sell or distribute your Google Ads account metrics to third-party ad brokers, market researchers, or competitors.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>You can revoke AdOptimize’s access at any time with 1 click from your Google Account permissions dashboard or within AdOptimize Settings.</span>
            </li>
          </ul>
        </div>

        {/* Data Retention & Deletion Protocols Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3>Google User Data Protection, Retention &amp; Deletion Protocols</h3>
          </div>
          <p>
            AdOptimize enforces bank-grade cryptographic controls and strict retention rules for all sensitive Google Ads account data:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">AES-256 &amp; TLS 1.3 Protection</span>
              <p className="text-[11px] text-slate-600">
                Data is encrypted in transit using TLS 1.3/TLS 1.2 and at rest using AES-256. Sensitive OAuth tokens are stored in server-isolated vaults, never exposed to client browsers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">30-Day Retention Schedule</span>
              <p className="text-[11px] text-slate-600">
                Google user data is retained only while the account is connected. Data from disconnected or inactive accounts is permanently purged within 30 days.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Instant Deletion Methods</span>
              <p className="text-[11px] text-slate-600">
                Purge your data anytime via 1-click in-app deletion, directly revoke in Google Account Permissions, or email support@adoptimize.app for full wipe within 48-72h.
              </p>
            </div>
          </div>
          <div className="pt-2 text-xs">
            <Link
              href="/privacy-policy"
              className="text-emerald-700 font-bold underline hover:text-emerald-900 inline-flex items-center gap-1"
            >
              <span>Read our full Privacy Policy for technical retention schedules and verification timelines</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
          >
            <span>Open AdOptimize Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
