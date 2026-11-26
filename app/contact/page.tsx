import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us - AdOptimize | Support & Sales Inquiries',
  description: 'Get in touch with the AdOptimize support and engineering team for Google Ads integration assistance or agency partnerships.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">
            Get In Touch
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Contact AdOptimize Team
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Questions about Google Ads authorization, Pro billing, AI proposals, or account data? Contact AdOptimize support.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs">Email Support</div>
                <a href="mailto:support@adoptimize.app" className="mt-0.5 block text-xs text-[#6D28D9] underline">support@adoptimize.app</a>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-[#6D28D9] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs">In-App Agent</div>
                <div className="text-xs text-slate-600 mt-0.5">Available to Pro users in the workspace</div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </main>
    </div>
  );
}
