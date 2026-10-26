import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PSEO_FEATURES } from '@/lib/pseo-data';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface FeaturePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PSEO_FEATURES.map((feature) => ({
    slug: feature.slug,
  }));
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = PSEO_FEATURES.find((f) => f.slug === slug);
  if (!feature) return { title: 'Feature Not Found - AdOptimize' };

  return {
    title: `${feature.metaTitle} | AdOptimize`,
    description: feature.metaDescription,
    alternates: {
      canonical: `https://adoptimize.app/features/${feature.slug}`,
    },
    openGraph: {
      title: `${feature.metaTitle} | AdOptimize`,
      description: feature.metaDescription,
      url: `https://adoptimize.app/features/${feature.slug}`,
      siteName: 'AdOptimize',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: feature.metaTitle,
      description: feature.metaDescription,
    },
  };
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
  const { slug } = await params;
  const feature = PSEO_FEATURES.find((f) => f.slug === slug);

  if (!feature) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `AdOptimize ${feature.title}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '49',
      priceCurrency: 'USD',
    },
    description: feature.metaDescription,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '194',
    },
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Header */}
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

          <div className="flex items-center gap-4">
            <Link
              href="/features"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              All Features
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Open Live App
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-800 transition-colors">
            Features
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate">{feature.title}</span>
        </div>
      </div>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{feature.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            {feature.headline}
          </h1>

          <p className="text-base text-slate-600 leading-relaxed">
            {feature.subheadline}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-slate-950 hover:bg-black text-white text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Launch {feature.title}</span>
              <ArrowRight className="w-4 h-4 text-[#00d67d]" />
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-2xl transition-all"
            >
              View Pricing & Plans
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Key Value &amp; Performance Protection
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feature.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Capabilities Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            How It Works Under the Hood
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {feature.capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs mb-3">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{cap.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently Asked Questions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {feature.faqs.map((faq, idx) => (
              <div key={idx} className="py-4 space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900">{faq.q}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-4 relative overflow-hidden shadow-xl border border-slate-800">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to optimize your Google Ads campaigns?
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
            Connect your Google Ads account securely via OAuth. Eliminate wasted spend and scale high-ROAS volume in minutes.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm rounded-2xl shadow-lg transition-transform hover:scale-105"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
