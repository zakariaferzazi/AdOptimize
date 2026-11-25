import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = {
  title: 'Cookie Policy - AdOptimize',
  description: 'How AdOptimize uses essential cookies and browser storage for authentication, billing sessions, and user preferences.',
};

export default function CookiePolicyPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center gap-1.5">
            <Cookie className="w-4 h-4" /><span>Browser Storage &amp; Privacy</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cookie Policy</h1>
          <p className="text-sm text-slate-600 leading-relaxed">AdOptimize uses essential browser storage so the service can authenticate users, protect sessions, remember workspace preferences, and open billing flows.</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Essential cookies</h2>
            <p>We use cookies or similar browser storage for sign-in sessions, security state, and access to server-verified subscription status. These technologies are required for account functionality and cannot be replaced with a non-essential marketing purpose.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Local browser preferences</h2>
            <p>The browser may store interface preferences and report selections, such as a date range, currency display, or selected campaign. These values help the workspace reopen in the state you selected and may be removed through your browser’s site-data controls.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Google and billing services</h2>
            <p>Google sign-in, Google Ads authorization, and Polar checkout operate through their own pages or services. Their cookies and data practices are governed by their respective policies. Google Ads refresh credentials are stored server-side rather than placed in browser cookies.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Analytics and advertising cookies</h2>
            <p>AdOptimize does not use this policy to claim the presence or absence of every third-party tracking technology. Any analytics or optional tracking added in the future should be disclosed here and, where required by law, presented with the appropriate consent controls. Current legal consent requirements must be reviewed for each deployment region.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Your choices</h2>
            <p>You can block or delete cookies in your browser. Blocking essential storage may prevent sign-in, subscription management, Google Ads connection, or use of protected workspace routes.</p>
          </section>
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
