import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrendingUp, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, ChevronRight, HelpCircle } from 'lucide-react';
import { PSEO_SOLUTIONS } from '@/lib/pseo-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PSEO_SOLUTIONS.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sol = PSEO_SOLUTIONS.find((s) => s.slug === slug);
  if (!sol) return {};

  const baseUrl = process.env.APP_URL || 'https://adoptimize.app';
  const url = `${baseUrl}/solutions/${sol.slug}`;

  return {
    title: sol.metaTitle,
    description: sol.metaDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: sol.metaTitle,
      description: sol.metaDescription,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: sol.metaTitle,
      description: sol.metaDescription,
    },
  };
}

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params;
  const sol = PSEO_SOLUTIONS.find((s) => s.slug === slug);

  if (!sol) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: sol.headline,
        description: sol.metaDescription,
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
            name: 'Solutions',
            item: 'https://adoptimize.app/solutions',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: sol.industry,
            item: `https://adoptimize.app/solutions/${sol.slug}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: sol.faqs.map((faq) => ({
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
          <Link href="/solutions" className="hover:text-slate-800">Solutions</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium">{sol.industry}</span>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
            <span>Industry Playbook: {sol.industry}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {sol.headline}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            {sol.subheadline}
          </p>
        </div>

        {/* Benchmarks strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500">Target Benchmark CPA</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{sol.avgCpa}</div>
            <div className="text-[11px] text-slate-400">Industry average for {sol.industry}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500">Target Benchmark ROAS</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{sol.avgRoas}</div>
            <div className="text-[11px] text-slate-400">Blended across search & PMax</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs text-slate-500">Expected Search CTR</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{sol.avgCtr}</div>
            <div className="text-[11px] text-slate-400">High-intent exact & phrase match</div>
          </div>
        </div>

        {/* Common Bleeds */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Top Ad Spend Bleeds in {sol.industry}</span>
          </h2>
          <div className="space-y-2.5">
            {sol.commonBleeds.map((bleed, i) => (
              <div key={i} className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100/80 text-xs sm:text-sm text-rose-950 flex items-start gap-2.5">
                <span className="font-bold text-rose-600 shrink-0">•</span>
                <span>{bleed}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Automated Guardrails */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Recommended AdOptimize Guardrails</span>
          </h2>
          <div className="space-y-2.5">
            {sol.recommendedRules.map((rule, i) => (
              <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5 text-xs sm:text-sm text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Deep Dive */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Optimization Strategies That Work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {sol.keyStrategies.map((strat, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{strat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{strat.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-3">
            {sol.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-slate-950 text-white rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-2xl font-bold">Audit Your {sol.industry} Account in 60 Seconds</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Connect your Google Ads account to uncover immediate negative keyword leaks and shift capital to top-performing campaigns.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Start Free 14-Day Audit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
