import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrendingUp, ArrowRight, CheckCircle2, ChevronRight, HelpCircle, ShieldCheck } from 'lucide-react';
import { PSEO_COMPARISONS } from '@/lib/pseo-data';

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

  const baseUrl = process.env.APP_URL || 'https://adoptimize.app';
  const url = `${baseUrl}/compare/${comp.slug}`;

  return {
    title: comp.metaTitle,
    description: comp.metaDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: comp.metaTitle,
      description: comp.metaDescription,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: comp.metaTitle,
      description: comp.metaDescription,
    },
  };
}

export default async function ComparisonDetailPage({ params }: Props) {
  const { slug } = await params;
  const comp = PSEO_COMPARISONS.find((c) => c.slug === slug);

  if (!comp) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: comp.title,
        description: comp.metaDescription,
        author: {
          '@type': 'Organization',
          name: 'AdOptimize',
          url: 'https://adoptimize.app',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://adoptimize.app',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Compare',
            item: 'https://adoptimize.app/compare',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: comp.title,
            item: `https://adoptimize.app/compare/${comp.slug}`,
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
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
            <span>Competitive Audit & Breakdown</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {comp.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            {comp.tagline}
          </p>
        </div>

        {/* Head-to-Head Comparison Table */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md">
          <div className="grid grid-cols-3 bg-slate-950 text-white p-5 text-xs font-bold uppercase tracking-wider">
            <div>Feature / Dimension</div>
            <div className="text-[#00d67d]">AdOptimize</div>
            <div className="text-slate-400">{comp.competitorName}</div>
          </div>
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {comp.comparisonPoints.map((row, i) => (
              <div key={i} className="grid grid-cols-3 p-5 items-center gap-3">
                <div className="font-bold text-slate-900">{row.feature}</div>
                <div className="text-emerald-700 font-semibold">{row.adoptimize}</div>
                <div className="text-slate-500">{row.competitor}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict Box */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>The Verdict</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Why Modern Marketers Choose AdOptimize</h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {comp.verdict}
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-3">
            {comp.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-slate-950 text-white rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Experience the AdOptimize Difference Today</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            14-day money-back guarantee. No long-term lock-in contract. Set up your Google Ads audit in 60 seconds.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Get Started Risk-Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
