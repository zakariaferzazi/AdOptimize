import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export const metadata: Metadata = {
  title: 'Contact | AdOptimize',
  description: 'Contact AdOptimize support about your account, Google Ads connection, or billing.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <div className="site-page"><SiteHeader /><main className="site-container py-20"><div className="mx-auto max-w-2xl"><span className="site-label">GET IN TOUCH</span><h1 className="site-heading">How can we help?</h1><p className="site-intro">For questions about your account, Google Ads connection, or billing, email our support team.</p><div className="site-card mt-8"><div className="site-icon"><Mail className="h-5 w-5" aria-hidden="true" /></div><h2 className="mt-5 text-lg font-bold">Email support</h2><a href="mailto:support@adoptimize.app" className="mt-2 inline-block font-semibold text-indigo-700 underline">support@adoptimize.app</a></div></div></main><SiteFooter /></div>;
}
