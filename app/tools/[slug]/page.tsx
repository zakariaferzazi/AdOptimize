import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, HelpCircle, ChevronRight } from 'lucide-react';
import { PSEO_TOOLS } from '@/lib/pseo-data';
import { ToolInteractiveWidget } from './tool-widget';
import { BrandLogo } from '@/components/ui/brand-logo';
import { absoluteUrl, buildPageMetadata, serializeJsonLd } from '@/lib/seo';
import { FREE_PLAN_SUMMARY } from '@/lib/plans';
import { LandingPrimaryCta } from '@/components/landing/session-cta';
import { BLOG_POSTS } from '@/lib/blog-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PSEO_TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = PSEO_TOOLS.find((t) => t.slug === slug);
  if (!tool) return {};

  return buildPageMetadata({
    title: tool.metaTitle,
    description: tool.metaDescription,
    path: `/tools/${tool.slug}`,
  });
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  const tool = PSEO_TOOLS.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }
  const relatedArticles = BLOG_POSTS.filter((post) => post.relatedToolSlug === tool.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: tool.title,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        description: tool.metaDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: ['audit', 'quality-score', 'negative-keywords', 'wasted-spend'].includes(tool.toolType) ? FREE_PLAN_SUMMARY : tool.metaDescription,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: absoluteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Free Google Ads Tools',
            item: absoluteUrl('/tools'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.title,
            item: absoluteUrl(`/tools/${tool.slug}`),
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: tool.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch Full App
          </Link>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/tools" className="hover:text-slate-800">Tools</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">{tool.title}</span>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Tool Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE] text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Interactive PPC Utility</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {tool.headline}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            {tool.subheadline}
          </p>
        </div>

        {/* Interactive Tool Widget */}
        {['audit', 'quality-score', 'negative-keywords', 'wasted-spend'].includes(tool.toolType) ? (
          <section className="rounded-xl border border-[#DDD6FE] bg-white p-6 sm:p-8 space-y-4" aria-labelledby="real-audit-heading">
            <h2 id="real-audit-heading" className="text-xl font-bold text-[#2E1065]">Run your free Google Ads audit</h2>
            <p className="text-sm leading-6 text-slate-700">{FREE_PLAN_SUMMARY}</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm leading-6 text-slate-700">
              <li>Create your account. Free requires no credit card.</li>
              <li>Connect Google Ads through Google’s authorization screen in Settings.</li>
              <li>Open AI Ads Audit, choose your dates and optional CPA/ROAS targets, and run the report.</li>
              <li>Review findings and coverage notes. Export the findings as CSV.</li>
            </ol>
            <p className="text-xs leading-5 text-slate-500">The audit uses rules-based diagnostics from your connected account. It cannot scan private ad performance from a domain or customer ID alone. No savings or performance outcome is guaranteed.</p>
            <LandingPrimaryCta className="w-full sm:w-auto" />
          </section>
        ) : <ToolInteractiveWidget tool={tool} />}

        {/* Key Benefits */}
        <div className="bg-white rounded-xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Why Use This Tool?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tool.keyBenefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmark Cards */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Scope and methodology</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tool.benchmarks.map((b, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-medium text-slate-500">{b.label}</div>
                <div className="text-2xl font-bold font-mono text-[#6D28D9]">{b.value}</div>
                <div className="text-[11px] text-slate-400">{b.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#6D28D9]" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-3">
            {tool.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        {relatedArticles.length > 0 && (
          <section className="rounded-xl border border-[#DDD6FE] bg-white p-6 space-y-3" aria-labelledby="audit-guides">
            <h2 id="audit-guides" className="text-lg font-bold text-[#2E1065]">Practical audit guides</h2>
            <ul className="list-disc pl-5 space-y-3 text-sm text-[#6D28D9]">
              {relatedArticles.map((post) => <li key={post.slug}><Link href={`/blog/${post.slug}`} className="font-semibold underline">{post.title}</Link></li>)}
            </ul>
          </section>
        )}
        <div className="bg-[#2E1065] text-white rounded-xl p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Start with a free Google Ads audit.</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Run five read-only audits per month. Upgrade to Pro for the dashboard and an agent that creates campaigns, manages budgets and executes approved changes.
          </p>
          <div className="pt-2">
            <Link
              href="/sign-up?next=/audit"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Get free audit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
