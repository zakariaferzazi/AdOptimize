import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUPPORT_EMAIL = 'support@adoptimize.app';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\r?\n/g, ' ').trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    let validOrigin = false;
    try {
      const appOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin;
      const requestOrigin = new URL(request.url).origin;
      const originHost = new URL(origin).host;
      validOrigin = origin === appOrigin || origin === requestOrigin || originHost === request.headers.get('host');
    } catch {
      validOrigin = false;
    }
    if (!validOrigin) {
      return error('This request was not sent from an allowed origin.', 403);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return error('The request body is invalid.');
  }

  if (clean(payload.website, 200)) return NextResponse.json({ ticketId: 'received' });

  const name = clean(payload.name, 80);
  const email = clean(payload.email, 254).toLowerCase();
  const message = typeof payload.message === 'string' ? payload.message.trim().slice(0, 5000) : '';

  if (name.length < 2) return error('Enter your name.');
  if (!EMAIL_PATTERN.test(email)) return error('Enter a valid email address.');
  if (message.length < 10) return error('Enter at least 10 characters in your message.');

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error('[Contact] RESEND_API_KEY or CONTACT_FROM_EMAIL is not configured.');
    return error('Contact delivery is temporarily unavailable. Email support@adoptimize.app directly.', 503);
  }

  const ticketId = `AO-${Date.now().toString(36).toUpperCase()}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': ticketId,
    },
    body: JSON.stringify({
      from,
      to: [SUPPORT_EMAIL],
      reply_to: email,
      subject: `[${ticketId}] AdOptimize support request from ${name}`,
      text: [
        `Ticket: ${ticketId}`,
        `Name: ${name}`,
        `Email: ${email}`,
        '',
        message,
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('[Contact] Email provider rejected the request:', response.status, detail.slice(0, 300));
    return error('Your message could not be sent. Email support@adoptimize.app directly.', 502);
  }

  return NextResponse.json({ ticketId });
}
