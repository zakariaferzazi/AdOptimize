'use client';

import { useState } from 'react';
import { AppLoader } from '@/components/ui/app-loader';

interface ContactResult {
  error?: string;
  ticketId?: string;
}

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setTicketId('');

    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          website: data.get('website'),
        }),
      });
      const result = await response.json() as ContactResult;
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent.');
      setTicketId(result.ticketId || '');
      form.reset();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your message could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      action="/api/contact"
      method="post"
      onSubmit={(event) => void submit(event)}
      className="space-y-4 border-t border-slate-100 pt-4 text-xs"
    >
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="contact-name" className="mb-1 block font-bold text-slate-700">Your Name</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block font-bold text-slate-700">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@company.com"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block font-bold text-slate-700">Message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="Tell us about your account, billing, Google Ads connection, or privacy question..."
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
        />
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
      {ticketId && (
        <p role="status" className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3 text-[#2E1065]">
          Message sent. Your ticket reference is {ticketId}.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-6 py-3 font-bold text-white transition-colors hover:bg-[#5B21B6] disabled:opacity-50 sm:w-auto"
      >
        {busy && <AppLoader className="h-4 w-4" />}
        {busy ? 'Sending...' : 'Send Message'}
      </button>
      <p className="text-[11px] leading-5 text-slate-500">
        Sent securely to support@adoptimize.app. We only use your email to respond to this request.
      </p>
    </form>
  );
}
