import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, ExternalLink } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { BLOG_DISCLAIMER, BLOG_POSTS } from '@/lib/blog-data';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { absoluteUrl, buildPageMetadata, serializeJsonLd, SITE_NAME } from '@/lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) return {};

  return buildPageMetadata({
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  if (!post) notFound();

  const relatedComparison = PSEO_COMPARISONS.find((item) => item.slug === post.relatedCompareSlug);
  const postUrl = absoluteUrl(`/blog/${post.slug}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        mainEntityOfPage: postUrl,
        author: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
          { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" aria-label="AdOptimize home"><BrandLogo /></Link>
          <Link href="/sign-up" className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
            Create free account
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link href="/blog" className="hover:text-slate-800">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-slate-900 font-medium">{post.category}</span>
        </nav>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-4">
          <span className="inline-flex items-center rounded-full border border-[#DDD6FE] bg-white px-3 py-1 text-xs font-bold text-[#5B21B6]">{post.category}</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">{post.title}</h1>
          <p className="text-xs text-slate-500">
            Published {formatDate(post.publishedAt)}
            {post.updatedAt !== post.publishedAt ? ` · Updated ${formatDate(post.updatedAt)}` : ''}
          </p>
          <p className="text-base text-slate-700 leading-relaxed">{post.intro}</p>
          <section aria-labelledby="key-facts" className="rounded-xl border border-[#DDD6FE] bg-white p-6 space-y-3">
            <h2 id="key-facts" className="text-sm font-bold text-slate-900">Key facts</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 leading-relaxed">
              {post.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          </section>
        </header>

        {post.sections.map((section) => (
          <section key={section.heading} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm sm:text-base text-slate-700 leading-relaxed">{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base text-slate-700 leading-relaxed">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
          </section>
        ))}

        {post.sources.length > 0 && (
          <section aria-labelledby="sources-heading" className="rounded-xl border border-slate-200/80 bg-white p-6 space-y-3">
            <h2 id="sources-heading" className="text-sm font-bold text-slate-900">Sources checked on {formatDate(post.updatedAt)}</h2>
            <ul className="space-y-2 text-sm">
              {post.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-semibold text-[#5B21B6] hover:underline">
                    {source.label}
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {relatedComparison && (
          <p className="text-sm text-slate-700">
            Read the side-by-side table:{' '}
            <Link href={`/compare/${relatedComparison.slug}`} className="font-semibold text-[#5B21B6] hover:underline">{relatedComparison.title}</Link>
          </p>
        )}

        <div className="rounded-xl bg-[#2E1065] p-8 text-center space-y-4 text-white shadow-xl">
          <h2 className="text-xl font-bold">Delegate your next Google Ads task.</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Build campaigns, manage budgets and turn optimization decisions into action. Explore your dashboard free; Pro unlocks the agent at $29/month or $99/year, plus applicable taxes.
          </p>
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-6 py-3.5 text-xs font-bold text-white transition-colors hover:bg-[#5B21B6]">
            Create free account <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{BLOG_DISCLAIMER}</p>
      </main>
    </div>
  );
}
