import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Mail, MessageSquare, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us - AdOptimize | Support & Sales Inquiries',
  description: 'Get in touch with the AdOptimize support and engineering team for Google Ads integration assistance or agency partnerships.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900">
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
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Get In Touch
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Contact AdOptimize Team
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Have questions about Google Ads OAuth setup, custom agency automation rules, or enterprise billing? We are here to help.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs">Email Support</div>
                <div className="text-xs text-slate-600 mt-0.5">support@adoptimize.io</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs">Live Marketing Copilot</div>
                <div className="text-xs text-slate-600 mt-0.5">Available 24/7 inside the app</div>
              </div>
            </div>
          </div>

          <form className="space-y-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Jay Rathod"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                placeholder="jay@company.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Message</label>
              <textarea
                rows={4}
                placeholder="Tell us about your Google Ads spend and optimization goals..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <button
              type="button"
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
