import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service - AdOptimize',
  description: 'Terms governing access to AdOptimize, Pro subscriptions, Google Ads connections, AI-assisted recommendations, and approved campaign changes.',
  path: '/terms-of-service',
});

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <Link href="/" className="px-4 py-2 bg-[#6D28D9] text-white font-bold text-xs rounded-xl shadow-xs">Back to App</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-600">These terms describe the rules for using AdOptimize. Material legal fields must be confirmed before launch, including the service operator’s full legal name, address, and governing law.</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. The service</h2>
            <p>AdOptimize is an AI-powered workspace for connected Google Ads accounts. The Free plan includes AI Ads Audit only, with five completed read-only audits per UTC calendar month across the user’s connected accounts. Runs are allocated to the month in which they start. Failed runs do not consume the allowance; in-progress runs reserve a slot. Account settings and billing are available for connection and upgrades. The dashboard, campaign workspace, activity history, reports, Budget Optimizer, AI conversations and campaign management require Pro. Pro audits do not have the Free monthly quota; technical rate limits apply to all plans.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Eligibility and your account</h2>
            <p>You must be authorized to bind an account to these terms and have permission to manage the Google Ads account you connect. Keep your login and account credentials secure, provide accurate information, and promptly report suspected unauthorized access.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Google Ads connection and approved changes</h2>
            <p>Connecting Google Ads is a separate authorization through Google. You choose the permissions and accounts made available through that authorization. The agent may read performance and configuration data and prepare supported changes, including campaign creation, campaign status, budgets, bidding, keywords, negative keywords, locations, tracking settings, and conversion goals.</p>
            <p>Proposed changes do not run until you approve them. Before approving, review the proposed values, target account, and business impact. You remain responsible for approved changes, campaign budgets, Google Ads spend, ad content, conversion tracking, landing pages, and compliance with Google Ads policies and applicable advertising law.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. AI output and performance</h2>
            <p>AI-generated analysis and proposed changes can be incomplete, inaccurate, or unsuitable for your circumstances. Results should be reviewed rather than treated as professional, legal, financial, or accounting advice. AdOptimize does not guarantee savings, conversions, CPA, ROAS, revenue, delivery, availability, or any other outcome.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Subscriptions, renewals, and cancellation</h2>
            <p>Pro Monthly costs $29 per month and Pro Yearly costs $99 per year, plus applicable taxes. Polar handles checkout and recurring billing as merchant of record. Subscriptions renew automatically at the selected interval until canceled through the billing portal.</p>
            <p>Cancellation stops the next renewal. Pro access generally continues until the end of the paid period, after which your account returns to the Free audit-only plan and its monthly allowance. All sales are final; see the <Link href="/refund-policy" className="font-semibold text-[#6D28D9] underline">Billing, Cancellation &amp; Refund Policy</Link>. Mandatory legal rights remain unaffected.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Acceptable use</h2>
            <p>Do not misuse the service, access another person’s account without permission, interfere with the platform, bypass security or entitlement controls, submit malicious instructions, infringe rights, or use the service for unlawful or deceptive advertising. We may suspend access to protect the service, users, or third-party systems.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">7. Service providers and availability</h2>
            <p>AdOptimize depends on Google, Firebase, Cloudflare, Polar, OpenRouter, and configured AI model providers to deliver parts of the service. Third-party outages, quotas, policy changes, or data availability may interrupt features. We do not control Google Ads and are not affiliated with or endorsed by Google.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">8. Privacy and data</h2>
            <p>Use of the service is also governed by our <Link href="/privacy-policy" className="font-semibold text-[#6D28D9] underline">Privacy Policy</Link>. The policy describes account data, Google Ads permissions, AI processing, service providers, and available choices.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">9. Contact and changes</h2>
            <p>Questions may be sent to support@adoptimize.app. We may update these terms to reflect product or legal changes. Continued use after an update constitutes acceptance where permitted by law.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
