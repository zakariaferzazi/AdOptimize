import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, HelpCircle, ShieldCheck } from 'lucide-react';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { BrandLogo } from '@/components/ui/brand-logo';
import { BLOG_DISCLAIMER, BLOG_POSTS } from '@/lib/blog-data';
import { absoluteUrl, buildPageMetadata, serializeJsonLd } from '@/lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PSEO_COMPARISONS.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comp = PSEO_COMPARISONS.find((c) => c.slug === slug);
  if (!comp) return {};

  return buildPageMetadata({
    title: comp.metaTitle,
    description: comp.metaDescription,
    path: `/compare/${comp.slug}`,
  });
}

export default async function ComparisonDetailPage({ params }: Props) {
  const { slug } = await params;
  const comp = PSEO_COMPARISONS.find((c) => c.slug === slug);

  if (!comp) {
    notFound();
  }

  const relatedPost = BLOG_POSTS.find((post) => post.slug === comp.relatedBlogSlug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: comp.title,
        description: comp.metaDescription,
        dateModified: comp.checkedAt,
        author: {
          '@type': 'Organization',
          name: 'AdOptimize',
          url: absoluteUrl('/'),
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
            name: 'Compare',
            item: absoluteUrl('/compare'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: comp.title,
            item: absoluteUrl(`/compare/${comp.slug}`),
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: comp.faqs.map((faq) => ({
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
            Open App
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/compare" className="hover:text-slate-800">Compare</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">{comp.competitorName}</span>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE] text-xs font-bold">
            <span>Pricing &amp; Campaign Workflows</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {comp.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            {comp.tagline}
          </p>
          <section aria-labelledby="key-facts" className="rounded-xl border border-[#DDD6FE] bg-white p-6 space-y-3 text-left">
            <h2 id="key-facts" className="text-sm font-bold text-slate-900">Key facts</h2>
            <ul className="list-disc space-y-2 pl-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {comp.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          </section>
        </div>

        {/* Head-to-Head Comparison Table */}
        <div className="bg-white rounded-xl overflow-hidden border border-slate-200/80 shadow-md">
          <div className="hidden grid-cols-3 gap-3 bg-[#2E1065] p-5 text-xs font-bold uppercase tracking-wider text-white sm:grid">
            <div>Feature / Dimension</div>
            <div className="text-[#FBBF24]">AdOptimize</div>
            <div>{comp.competitorName}</div>
          </div>
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {comp.comparisonPoints.map((row, i) => (
              <div key={i} className="grid gap-3 p-5 sm:grid-cols-3 sm:items-start">
                <h3 className="font-bold text-slate-900">{row.feature}</h3>
                <dl className="grid gap-4 leading-relaxed sm:col-span-2 sm:grid-cols-2 sm:gap-3">
                  <div className="min-w-0">
                    <dt className="mb-1 text-xs font-bold text-[#2E1065] sm:sr-only">AdOptimize</dt>
                    <dd className="font-semibold text-[#5B21B6]">{row.adoptimize}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="mb-1 text-xs font-bold text-slate-900 sm:sr-only">{comp.competitorName}</dt>
                    <dd className="text-slate-600">{row.competitor}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict Box */}
        <div className="bg-white rounded-xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>The AdOptimize Value</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Why consider AdOptimize?</h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {comp.verdict}
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#6D28D9]" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-3">
            {comp.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {comp.competitorSources && comp.competitorSources.length > 0 && (
          <section aria-labelledby="competitor-sources" className="space-y-3 text-xs text-slate-600">
            <h2 id="competitor-sources" className="text-sm font-bold text-slate-900">Competitor sources</h2>
            <ul className="list-disc pl-5 space-y-1">
              {comp.competitorSources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[#5B21B6] hover:underline">
                    {source.label}
                  </a>{' '}
                  (checked {new Date(`${comp.checkedAt}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })})
                </li>
              ))}
            </ul>
          </section>
        )}

        {relatedPost && (
          <p className="text-sm text-slate-700">
            Read the full article:{' '}
            <Link href={`/blog/${relatedPost.slug}`} className="font-semibold text-[#5B21B6] hover:underline">{relatedPost.title}</Link>
          </p>
        )}

        <p className="text-xs text-slate-500 leading-relaxed">{BLOG_DISCLAIMER}</p>

        {/* Bottom CTA */}
        <div className="bg-[#2E1065] text-white rounded-xl p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Put your Google Ads agent to work.</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Start with five free, read-only Google Ads audits per UTC calendar month. Pro unlocks the dashboard, campaign workspace and executable agent at $29/month or $99/year, plus applicable taxes.
          </p>
          <div className="pt-2">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Create free account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
