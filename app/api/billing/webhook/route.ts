import { NextResponse } from 'next/server';
import { webhooks } from '@polar-sh/sdk/2026-10';
import { BillingError, requiredEnv } from '@/lib/billing/config';
import { billingFailure, readBody } from '@/lib/billing/http';
import { applyWebhook, hash, rateLimit } from '@/lib/billing/store';
import { webhookUpdate } from '@/lib/billing/webhook';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const secret = requiredEnv('POLAR_WEBHOOK_SECRET');
    const headers = Object.fromEntries(['webhook-id', 'webhook-timestamp', 'webhook-signature']
      .map((key) => [key, request.headers.get(key) || '']));
    if (!headers['webhook-id'] || headers['webhook-id'].length > 200 ||
      headers['webhook-signature'].length > 2048 || headers['webhook-timestamp'].length > 30) {
      throw new BillingError(403, 'Invalid webhook headers.');
    }
    const raw = await readBody(request, 1024 * 1024);
    const event = await webhooks.validateEvent(raw, headers, secret);
    await rateLimit('verified-webhooks', 300, 60);
    const update = await webhookUpdate(event);
    await applyWebhook({ id: headers['webhook-id'], bodyHash: hash(raw), ...update });
    return NextResponse.json({ received: true, ...(update.ignored ? { ignored: update.ignored } : {}) });
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 403 });
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) return NextResponse.json({ received: true, ignored: 'unknown_event' }, { status: 202 });
    if (error instanceof webhooks.PolarWebhookError) return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
    return billingFailure(error);
  }
}
