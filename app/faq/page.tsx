import type { Metadata } from 'next';
import Link from 'next/link';
import { faqs } from '@/components/landing/faq-data';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export const metadata: Metadata = {
  title: 'Frequently asked questions | AdOptimize',
  description: 'Learn about connecting Google Ads, approving changes, and AdOptimize pricing.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return <div className="site-page"><SiteHeader /><main className="site-container py-20"><div className="mx-auto max-w-3xl"><span className="site-label">GOOD TO KNOW</span><h1 className="site-heading">Questions? Answered.</h1><p className="site-intro">Need more help? <Link href="/contact" className="font-semibold text-indigo-700 underline">Get in touch</Link>.</p><div className="mt-10 space-y-4">{faqs.map(item => <article key={item.question} className="site-card"><h2 className="font-bold">{item.question}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p></article>)}</div></div></main><SiteFooter /></div>;
}
