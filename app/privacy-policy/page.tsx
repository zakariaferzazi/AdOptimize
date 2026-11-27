import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { Lock, Database, Bot, CreditCard, Trash2, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy - AdOptimize',
  description: 'How AdOptimize handles account information, Google Ads OAuth data, AI conversations, campaign data, billing, cookies, and privacy requests.',
  path: '/privacy-policy',
});

const categories = [
  {
    icon: ShieldCheck,
    title: 'AdOptimize account information',
    text: 'Account identifiers, sign-in email, display name, authentication state, workspace preferences, and account activity needed to provide and secure access.',
  },
  {
    icon: Database,
    title: 'Connected Google Ads information',
    text: 'Authorized account identifiers and names, campaign and ad-group settings, keywords, search terms, conversion settings, bidding and budget configuration, and performance metrics requested through Google APIs.',
  },
  {
    icon: Bot,
    title: 'AI conversations and proposals',
    text: 'Your prompts, conversation history, agent state, analysis, proposed changes, approval events, and execution outcomes needed to continue tasks and show activity history.',
  },
  {
    icon: CreditCard,
    title: 'Subscription information',
    text: 'Polar customer and subscription identifiers, selected interval, payment state, renewal or cancellation status, and invoice portal references. AdOptimize does not receive or store full payment card details.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <div className="flex items-center gap-3">
            <Link href="/security" className="text-xs text-slate-300 hover:text-white hidden sm:inline-block">Security overview</Link>
            <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl">Launch App</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#5B21B6] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /><span>Google Ads Connection &amp; Data Use</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            This policy explains how AdOptimize handles information used to provide its Free audit-only plan, Pro workspace, Google Ads analysis, AI assistance, and approved campaign operations. Free includes five completed audits per UTC calendar month. We store audit-usage records linked to a hashed account identifier, including the usage period and reservation or completion status, to enforce that allowance.
          </p>
          <p className="text-xs text-slate-500">The service operator’s full legal name, registered address, applicable jurisdiction, retention schedule, and required privacy representative must be confirmed by counsel before production publication.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.title} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">{category.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{category.text}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl p-8 sm:p-10 border border-slate-200/90 shadow-xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Google sign-in and Google Ads authorization</h2>
            <p>Google sign-in and Google Ads authorization occur through Google-controlled screens. AdOptimize does not receive your Google password. You decide whether to authorize a Google Ads connection and which account access Google makes available.</p>
            <p>After authorization, AdOptimize may use Google OAuth credentials to retrieve account details and performance data, inspect campaign and conversion configuration, and execute a supported operation only after you approve the proposal. You can revoke access in your Google Account permissions or use available disconnect controls in AdOptimize Settings.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. How information is used</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Authenticate you and keep account sessions and subscription entitlements secure.</li>
              <li>Display connected Google Ads accounts, campaigns, performance, keywords, search terms, and conversion setup.</li>
              <li>Provide analysis, audits, reports, campaign creation, and the Budget Optimizer.</li>
              <li>Create supported proposals from your request and record approval and execution outcomes.</li>
              <li>Manage Pro Monthly or Pro Yearly checkout, subscription status, invoices, and billing access through Polar.</li>
              <li>Maintain activity history, troubleshoot service errors, protect the platform, and comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. AI processing</h2>
            <p>To answer your request, AdOptimize may send your prompt, relevant conversation history, selected model settings, and the minimum account context needed for the task to OpenRouter and a configured model provider such as Anthropic, OpenAI, or Google. These providers process data under their own terms and privacy practices.</p>
            <p>AdOptimize does not promise that AI output is complete or correct. Do not submit secrets, passwords, payment card details, or information you are not authorized to process. Before production use, the configured model providers, their data-use settings, retention terms, and data-processing arrangements require legal confirmation.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Service providers</h2>
            <p>We use service providers to operate the product. These may include Firebase/Google for identity and selected application storage, Cloudflare for hosting and D1-backed records, Google Ads for connected account data and operations, Polar for payments and billing, and OpenRouter with configured AI model providers for AI reasoning.</p>
            <p>See the <Link href="/subprocessors" className="font-semibold text-[#6D28D9] underline">Service Providers page</Link>. The list and any required agreements or transfer mechanisms should be reviewed if providers or processing locations change.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Storage and security</h2>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
              <Lock className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
              <p>AdOptimize uses authenticated server routes, account-scoped records, encrypted server-side storage for sensitive Google Ads connection credentials, HTTPS transport, and verification of billing events. No security control eliminates all risk, and this page is not a guarantee or certification.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Retention</h2>
            <p>Information is retained while needed to provide the service, keep account and billing records, respond to support or legal requests, resolve disputes, and meet legitimate retention obligations. Different categories may have different retention periods. Backups or provider records may persist for a limited period after deletion from active systems.</p>
            <p>A production-ready retention schedule—including account, conversation, audit, billing, log, backup, and disconnected-account periods—requires business and legal confirmation before publication.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Your choices and requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <Trash2 className="w-5 h-5 text-[#6D28D9] mb-2" />
                <h3 className="font-bold text-slate-900">Disconnect or revoke</h3>
                <p className="mt-1 text-xs">Use AdOptimize Settings to disconnect supported account data or remove AdOptimize access in your Google Account permissions.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <Mail className="w-5 h-5 text-[#6D28D9] mb-2" />
                <h3 className="font-bold text-slate-900">Privacy request</h3>
                <p className="mt-1 text-xs">Email support@adoptimize.app to request access, correction, deletion, or another right available under applicable law.</p>
              </div>
            </div>
            <p>We may need to verify your identity and account ownership before acting on a request. Some records may be retained where required or permitted by law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">8. Cookies, children, and international users</h2>
            <p>AdOptimize uses essential session and preference storage described in the <Link href="/cookie-policy" className="font-semibold text-[#6D28D9] underline">Cookie Policy</Link>. The service is not intended for children. Users may access the service from different countries, and data may be processed by providers in countries with different privacy laws; any required transfer safeguards and consent mechanisms require legal confirmation for the launch jurisdictions.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">9. Changes and contact</h2>
            <p>We may update this policy as the product or providers change. For privacy questions or requests, contact support@adoptimize.app.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
