import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { BLOG_DISCLAIMER, BLOG_POSTS } from '@/lib/blog-data';
import { absoluteUrl, buildPageMetadata, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Google Ads Tool Comparisons and Guides | AdOptimize Blog',
  description: 'Practical comparisons of Google Ads tools and agencies, plus checklists for finding wasted spend. Sourced from public vendor pages.',
  path: '/blog',
});

const sortedPosts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export default function BlogIndexPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'AdOptimize Blog',
    url: absoluteUrl('/blog'),
    blogPost: sortedPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: post.publishedAt,
    })),
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

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Blog</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Google Ads tools, compared honestly</h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Side-by-side guides to the tools you may be evaluating, and practical checklists for your own account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs hover:border-[#6D28D9] hover:shadow-md transition-all flex flex-col justify-between group space-y-5"
            >
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#5B21B6] bg-[#F5F3FF] px-2.5 py-1 rounded-full border border-[#DDD6FE]">{post.category}</span>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#5B21B6] transition-colors">{post.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{post.description}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#5B21B6]">
                <span>Read article</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{BLOG_DISCLAIMER}</p>
      </main>
    </div>
  );
}
