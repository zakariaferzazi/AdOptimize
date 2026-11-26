import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Frequently Asked Questions - AdOptimize',
  description: 'Answers about AdOptimize subscriptions, Google Ads connections, AI analysis, campaign approvals, billing, and cancellations.',
  path: '/faq',
});

const faqs = [
  {
    q: 'What is included without Pro?',
    a: 'You can create an account, connect or view supported account information, explore limited dashboard and campaign data, use account settings, and access billing. Advanced analysis and supported Google Ads changes require Pro.',
  },
  {
    q: 'What do Pro Monthly and Pro Yearly include?',
    a: 'Pro provides the AI Marketing Agent, account analysis, audits, reports, the Budget Optimizer, campaign creation and management, and approved changes to supported Google Ads settings. Monthly is $29 and yearly is $99, plus applicable taxes.',
  },
  {
    q: 'Will the agent change my Google Ads account without asking?',
    a: 'No. The agent prepares a proposal and the user must approve it before the supported change is executed. Review the target account, current value, proposed value, and reason before approving.',
  },
  {
    q: 'What can the agent help manage?',
    a: 'Supported capabilities include Search and App campaign creation, budgets, bidding, campaign or ad group status, names, dates, networks, locations, keywords, negative keywords, ad groups, tracking settings, and selected conversion-goal settings. Availability can depend on campaign type and account permissions.',
  },
  {
    q: 'How does the Google Ads connection work?',
    a: 'You authorize access through Google’s own sign-in and authorization screen. We never receive your Google password. AdOptimize stores the resulting connection credentials securely on the server and uses them to request data and execute approved supported operations.',
  },
  {
    q: 'Does AdOptimize guarantee lower CPA or higher ROAS?',
    a: 'No. The agent can identify patterns and prepare optimization proposals, but outcomes depend on factors including your offer, creative, landing pages, conversion tracking, auction competition, account history, and the changes you approve.',
  },
  {
    q: 'How does billing work?',
    a: 'Polar is the merchant of record and processes checkout, recurring payments, taxes, invoices, and the customer billing portal. Pro subscriptions renew automatically at the selected monthly or yearly interval until canceled.',
  },
  {
    q: 'What happens when I cancel?',
    a: 'Canceling stops the next renewal. Pro access continues through the end of the paid period unless otherwise required by law, then the account returns to limited dashboard access.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'No. AdOptimize has a strict no-refund policy for subscription charges. Review the Billing, Cancellation & Refund Policy and applicable Polar buyer terms before purchasing.',
  },
  {
    q: 'Can I disconnect or delete my Google Ads data?',
    a: 'You can disconnect the account, revoke Google access in your Google Account permissions, and use available in-app data controls. You can also contact support about deletion requests. See the Privacy Policy for details and limitations.',
  },
];

export default function FaqPage() {
  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><BrandLogo /></Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/solutions" className="text-slate-300 hover:text-white">Solutions Hub</Link>
            <Link href="/" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold rounded-xl">Open Workspace</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Knowledge Base</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Frequently Asked Questions</h1>
          <p className="text-sm text-slate-600 leading-relaxed">Answers about subscriptions, Google Ads access, the AI agent, billing, and cancellations.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <div key={item.q} className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
                <h2 className="font-bold text-slate-900 text-base">{item.q}</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#F5F3FF] rounded-xl p-6 border border-[#DDD6FE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-[#2E1065] text-sm">Still have a question?</h3>
            <p className="text-xs text-[#5B21B6]">Contact support about your account, billing, or data request.</p>
          </div>
          <Link href="/contact" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0">
            <span>Contact Support</span><ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
