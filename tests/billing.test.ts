import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import type { D1Database } from '@/lib/store/d1';

const mocks = vi.hoisted(() => ({
  db: undefined as D1Database | undefined,
  cookie: undefined as string | undefined,
  checkout: vi.fn(), portal: vi.fn(), product: vi.fn(),
}));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: async () => ({ env: { DB: mocks.db } }),
}));
vi.mock('@polar-sh/sdk/2026-10', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polar-sh/sdk/2026-10')>();
  return {
    ...actual,
    createPolar: vi.fn(() => ({
      products: { get: mocks.product }, checkouts: { create: mocks.checkout }, customerSessions: { create: mocks.portal },
    })),
  };
});
vi.mock('@/lib/ai/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/identity')>();
  const verify = async (token: string) => {
    if (token !== 'valid-a' && token !== 'valid-b') throw new actual.UnauthorizedError('Invalid token.');
    return { uid: token === 'valid-a' ? 'user-a' : 'user-b', emailVerified: false, expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  };
  return {
    ...actual, verifyFirebaseIdToken: vi.fn(verify),
    requireIdentity: async (request: Request) => verify(actual.extractBearerToken(request) || ''),
  };
});
vi.mock('@/lib/ai/account-binding', () => ({
  resolveAccountBinding: async () => undefined,
  resolveFreshAccessToken: async () => ({ accessToken: 'test-ads-token' }),
  AccountBindingError: class AccountBindingError extends Error {},
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => mocks.cookie ? { value: mocks.cookie } : undefined }) }));
vi.mock('next/navigation', () => ({ redirect: (url: string): never => { throw new Error(`redirect:${url}`); } }));
vi.mock('@/app/chat/chat-client', () => ({ ChatClientView: () => null }));
vi.mock('@/app/audit/audit-client', () => ({ AuditClientView: () => null }));
vi.mock('@/app/reports/reports-client', () => ({ ReportsClientView: () => null }));
vi.mock('@/app/optimizer/optimizer-client', () => ({ OptimizerClientView: () => null }));
vi.mock('@/app/dashboard/dashboard-client', () => ({ DashboardClientView: () => null }));
vi.mock('@/app/campaigns/campaigns-client', () => ({ CampaignsClientView: () => null }));
vi.mock('@/app/activity-log/activity-log-client', () => ({ ActivityLogClientView: () => null }));

import { createPolar } from '@polar-sh/sdk/2026-10';
import { POST as webhook } from '@/app/api/billing/webhook/route';
import { POST as checkout } from '@/app/api/billing/checkout/route';
import { POST as portal } from '@/app/api/billing/portal/route';
import { GET as status } from '@/app/api/billing/status/route';
import { POST as createSession, DELETE as deleteSession } from '@/app/api/auth/session/route';
import { POST as chat } from '@/app/api/ai/chat/route';
import { POST as approve } from '@/app/api/ai/chat/approve/route';
import { POST as execute } from '@/app/api/ai/chat/execute/route';
import { POST as audit, GET as auditUsage } from '@/app/api/google-ads/audit/route';
import { POST as report } from '@/app/api/google-ads/report/route';
import { POST as mutate } from '@/app/api/google-ads/mutate/route';
import { POST as mcp } from '@/app/api/mcp/route';
import ChatPage from '@/app/chat/page';
import AuditPage from '@/app/audit/page';
import ReportsPage from '@/app/reports/page';
import OptimizerPage from '@/app/optimizer/page';
import DashboardPage from '@/app/dashboard/page';
import CampaignsPage from '@/app/campaigns/page';
import ActivityLogPage from '@/app/activity-log/page';
import { requirePageSubscription, withSubscription } from '@/lib/billing/access';
import { hash, hasPaidAccess, rateLimit, reserveCustomer, subscription } from '@/lib/billing/store';
import { completeAudit, getAuditUsage, releaseAudit, reserveAudit } from '@/lib/billing/audit-access';
import { ProPreview } from '@/components/billing/pro-preview';

const organization = '11111111-1111-4111-8111-111111111111';
const monthly = '22222222-2222-4222-8222-222222222222';
const yearly = '33333333-3333-4333-8333-333333333333';
const productionOrganization = '66666666-6666-4666-8666-666666666666';
const productionMonthly = '77777777-7777-4777-8777-777777777777';
const productionYearly = '88888888-8888-4888-8888-888888888888';
const customerId = '44444444-4444-4444-8444-444444444444';
const subscriptionId = '55555555-5555-4555-8555-555555555555';
const signingKey = Buffer.from('local-billing-signature-test-key-only');
const secret = `whsec_${signingKey.toString('base64')}`;
let db: D1Database;
let deploymentOrigin: string;
let dispose: (() => Promise<void>) | undefined;
let clock = Date.now() - 60000;
let delivery = 0;

function request(path: string, body?: Record<string, unknown>, token = 'valid-a'): NextRequest {
  return new NextRequest(`https://app.example.test${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: 'https://app.example.test' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function subscriptionEvent(type = 'subscription.active', changes: Record<string, unknown> = {}) {
  const timestamp = new Date(clock += 1000).toISOString();
  return {
    type, timestamp,
    data: {
      id: subscriptionId, product_id: monthly, customer_id: customerId, status: 'active',
      created_at: timestamp, modified_at: timestamp, current_period_end: new Date(Date.now() + 86400000).toISOString(),
      ends_at: null, cancel_at_period_end: false,
      customer: { id: customerId, external_id: 'user-a', organization_id: organization },
      product: { organization_id: organization }, ...changes,
    },
  };
}
function signedRequest(event: unknown, options: { id?: string; timestamp?: number; tamper?: boolean; pretty?: boolean } = {}) {
  const raw = JSON.stringify(event, null, options.pretty ? 2 : undefined);
  const id = options.id || `delivery-${++delivery}`;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', signingKey).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Request('https://app.example.test/api/billing/webhook', {
    method: 'POST', body: raw + (options.tamper ? ' ' : ''),
    headers: { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${signature}` },
  });
}
async function deliver(event: unknown = subscriptionEvent(), id?: string) {
  const response = await webhook(signedRequest(event, { id }));
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
  return response;
}

beforeAll(async () => {
  const platform = await getPlatformProxy<{ DB: D1Database; APP_URL: string }>({ configPath: 'wrangler.jsonc', persist: false });
  db = platform.env.DB;
  deploymentOrigin = platform.env.APP_URL;
  mocks.db = db;
  dispose = platform.dispose;
  const sql = readFileSync('migrations\\0004_billing.sql', 'utf8') + readFileSync('migrations\\0006_free_audit_usage.sql', 'utf8');
  await db.batch(sql.split(';').map((query) => query.trim()).filter(Boolean).map((query) => db.prepare(query)));
}, 30000);
beforeEach(async () => {
  vi.stubGlobal('React', React);
  vi.stubEnv('POLAR_ENVIRONMENT', 'sandbox');
  vi.stubEnv('APP_URL', 'https://app.example.test');
  vi.stubEnv('POLAR_ORGANIZATION_ID_SANDBOX', organization);
  vi.stubEnv('POLAR_PRODUCT_PRO_MONTHLY_SANDBOX', monthly);
  vi.stubEnv('POLAR_PRODUCT_PRO_YEARLY_SANDBOX', yearly);
  vi.stubEnv('POLAR_WEBHOOK_SECRET_SANDBOX', secret);
  vi.stubEnv('POLAR_ACCESS_TOKEN_SANDBOX', 'unit-test-token-not-a-real-credential');
  // Distinct production values prove the two credential sets are never mixed.
  vi.stubEnv('POLAR_ORGANIZATION_ID', productionOrganization);
  vi.stubEnv('POLAR_PRODUCT_PRO_MONTHLY', productionMonthly);
  vi.stubEnv('POLAR_PRODUCT_PRO_YEARLY', productionYearly);
  vi.stubEnv('POLAR_WEBHOOK_SECRET', 'whsec_production-secret-not-used-by-sandbox-tests');
  vi.stubEnv('POLAR_ACCESS_TOKEN', 'production-token-not-a-real-credential');
  mocks.db = db;
  mocks.cookie = undefined;
  await db.batch(['billing_customers', 'billing_subscriptions', 'billing_events', 'billing_payments', 'billing_rate_limits', 'app_sessions', 'free_audit_runs']
    .map((table) => db.prepare(`DELETE FROM ${table}`)));
  await reserveCustomer('user-a');
  mocks.checkout.mockReset().mockResolvedValue({ url: 'https://sandbox.polar.sh/checkout/example' });
  mocks.portal.mockReset().mockResolvedValue({ customer_portal_url: 'https://sandbox.polar.sh/purchases/subscriptions' });
  mocks.product.mockReset().mockImplementation(async (id: string) => ({
    id, organization_id: organization, is_archived: false, is_recurring: true,
    recurring_interval: id === monthly ? 'month' : 'year', recurring_interval_count: 1,
    prices: [{ is_archived: false, amount_type: 'fixed', price_currency: 'usd', price_amount: id === monthly ? 2900 : 9900 }],
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
afterAll(async () => { await dispose?.(); });

describe('verified Polar webhook lifecycle on real D1', () => {
  it('uses the exact raw body and rejects tampering, missing headers, and stale signatures', async () => {
    const event = subscriptionEvent();
    expect((await webhook(signedRequest(event, { pretty: true }))).status).toBe(200);
    expect((await webhook(signedRequest(event, { tamper: true }))).status).toBe(403);
    expect((await webhook(signedRequest(event, { timestamp: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(403);
    expect((await webhook(new Request('https://app.example.test/api/billing/webhook', { method: 'POST', body: '{}' }))).status).toBe(403);
  });

  it('processes concurrent duplicate deliveries once and rejects conflicting event IDs', async () => {
    const event = subscriptionEvent();
    const responses = await Promise.all(Array.from({ length: 4 }, () => webhook(signedRequest(event, { id: 'same-delivery' }))));
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200]);
    expect((await db.prepare('SELECT * FROM billing_events').all()).results).toHaveLength(1);
    expect((await db.prepare('SELECT * FROM billing_subscriptions').all()).results).toHaveLength(1);
    const changed = subscriptionEvent('subscription.past_due', { status: 'past_due' });
    expect((await webhook(signedRequest(changed, { id: 'same-delivery' }))).status).toBe(409);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
  });

  it('rolls back both state and deduplication marker on failure so a retry succeeds', async () => {
    const event = subscriptionEvent();
    await db.prepare("CREATE TRIGGER fail_billing_insert BEFORE INSERT ON billing_subscriptions BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
    try {
      expect((await webhook(signedRequest(event, { id: 'retry-me' }))).status).toBe(503);
      expect((await db.prepare("SELECT * FROM billing_events WHERE id = 'retry-me'").all()).results).toHaveLength(0);
      expect((await db.prepare('SELECT * FROM billing_subscriptions').all()).results).toHaveLength(0);
    } finally { await db.prepare('DROP TRIGGER fail_billing_insert').run(); }
    await deliver(event, 'retry-me');
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
  });

  it('does not reactivate a revoked subscription from older snapshots, even if the envelope is newer', async () => {
    const old = subscriptionEvent('subscription.created');
    await deliver(subscriptionEvent('subscription.revoked', { status: 'canceled' }));
    old.timestamp = new Date(clock + 60000).toISOString();
    await deliver(old);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
    expect((await subscription('user-a'))?.status).toBe('canceled');
  });

  it('resolves equal-time contradictory events conservatively in either delivery order', async () => {
    const active = subscriptionEvent();
    const revoked = { ...active, type: 'subscription.revoked', data: { ...active.data, status: 'canceled' } };
    await deliver(revoked);
    await deliver(active);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
    await deliver(revoked);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
  });

  it('preserves timestamp precision and permits a genuinely newer recovery', async () => {
    const due = subscriptionEvent('subscription.past_due', { status: 'past_due', modified_at: '2026-11-01T10:00:00.123455Z' });
    const recovery = subscriptionEvent('subscription.updated', { modified_at: '2026-11-01T10:00:00.123456Z' });
    await deliver(recovery);
    await deliver(due);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
  });

  it('keeps scheduled cancellation active only until its paid-through date', async () => {
    await deliver(subscriptionEvent('subscription.canceled', { cancel_at_period_end: true }));
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
    expect(await (await status(request('/api/billing/status'))).json()).toMatchObject({
      status: 'active', cancelAtPeriodEnd: true, hasAccess: true,
    });
    await deliver(subscriptionEvent('subscription.updated', { current_period_end: new Date(Date.now() - 1000).toISOString(), cancel_at_period_end: true }));
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
  });

  it('expires paid access at request time without waiting for another webhook', async () => {
    await deliver();
    const state = await subscription('user-a');
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(state!.period_end) + 1);
    expect((await chat(request('/api/ai/chat', {}))).status).toBe(402);
  });

  it('suspends past-due access immediately and restores it only on a newer active webhook', async () => {
    await deliver();
    await deliver(subscriptionEvent('subscription.past_due', { status: 'past_due' }));
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
    expect((await status(request('/api/billing/status'))).status).toBe(200);
    await deliver(subscriptionEvent('subscription.updated'));
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
    await deliver(subscriptionEvent('subscription.revoked'));
    expect(hasPaidAccess(await subscription('user-a'))).toBe(false);
  });

  it('records orders and refunds without independently changing subscription access', async () => {
    await deliver();
    for (const type of ['order.created', 'order.updated', 'order.paid', 'order.refunded', 'refund.created', 'refund.updated']) {
      await deliver({
        type, timestamp: new Date(clock += 1000).toISOString(),
        data: {
          ...subscriptionEvent().data, id: yearly, status: type.startsWith('refund') ? 'succeeded' : 'paid',
          organization_id: organization, subscription_id: subscriptionId,
        },
      });
    }
    expect((await db.prepare('SELECT * FROM billing_payments').all()).results).toHaveLength(2);
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
  });

  it('isolates customers, products, organizations, users, and sandbox state', async () => {
    await deliver(subscriptionEvent('subscription.active', { product_id: organization }));
    expect(await subscription('user-a')).toBeNull();
    const foreign = subscriptionEvent();
    foreign.data.customer.organization_id = monthly;
    expect((await webhook(signedRequest(foreign))).status).toBe(403);
    await deliver();
    expect(await subscription('user-b')).toBeNull();
    const mismatch = subscriptionEvent('subscription.updated', { customer_id: yearly, customer: { id: yearly, external_id: 'user-a', organization_id: organization } });
    expect((await webhook(signedRequest(mismatch))).status).toBe(409);
    vi.stubEnv('POLAR_ENVIRONMENT', 'production');
    expect(await subscription('user-a')).toBeNull();
  });

  it('ignores future and checkout confirmation events without granting access', async () => {
    expect((await webhook(signedRequest({ type: 'future.event', data: {}, timestamp: new Date().toISOString() }))).status).toBe(202);
    await deliver({ ...subscriptionEvent(), type: 'checkout.updated' });
    expect(await subscription('user-a')).toBeNull();
  });

  it('rejects malformed signed subscription state instead of persisting an invalid entitlement', async () => {
    expect((await webhook(signedRequest(subscriptionEvent('subscription.updated', { current_period_end: 'not-a-date' })))).status).toBe(400);
    expect((await webhook(signedRequest(subscriptionEvent('subscription.updated', { status: 'paid-forever' })))).status).toBe(400);
    expect(await subscription('user-a')).toBeNull();
  });
});

describe('Polar environment switching', () => {
  it('defaults to sandbox and never mixes sandbox and production credentials', async () => {
    vi.stubEnv('POLAR_ENVIRONMENT', undefined);
    expect((await checkout(request('/api/billing/checkout', { interval: 'monthly' }))).status).toBe(200);
    expect(createPolar).toHaveBeenLastCalledWith(expect.objectContaining({
      environment: 'sandbox', accessToken: 'unit-test-token-not-a-real-credential', organizationId: organization,
    }));
    expect(mocks.checkout).toHaveBeenLastCalledWith(expect.objectContaining({ products: [monthly] }));

    vi.stubEnv('POLAR_ENVIRONMENT', 'production');
    mocks.checkout.mockResolvedValue({ url: 'https://polar.sh/checkout/example' });
    mocks.product.mockImplementation(async (id: string) => ({
      id, organization_id: productionOrganization, is_archived: false, is_recurring: true,
      recurring_interval: id === productionMonthly ? 'month' : 'year', recurring_interval_count: 1,
      prices: [{ is_archived: false, amount_type: 'fixed', price_currency: 'usd', price_amount: id === productionMonthly ? 2900 : 9900 }],
    }));
    expect((await checkout(request('/api/billing/checkout', { interval: 'yearly' }))).status).toBe(200);
    expect(createPolar).toHaveBeenLastCalledWith(expect.objectContaining({
      environment: 'production', accessToken: 'production-token-not-a-real-credential', organizationId: productionOrganization,
    }));
    expect(mocks.checkout).toHaveBeenLastCalledWith(expect.objectContaining({ products: [productionYearly] }));
  });

  it('fails closed instead of falling back when the selected environment lacks credentials', async () => {
    vi.stubEnv('POLAR_ACCESS_TOKEN_SANDBOX', undefined);
    const response = await checkout(request('/api/billing/checkout', { interval: 'monthly' }));
    expect(response.status).toBe(503);
    expect(mocks.checkout).not.toHaveBeenCalled();
    vi.stubEnv('POLAR_ENVIRONMENT', 'production');
    vi.stubEnv('POLAR_WEBHOOK_SECRET', undefined);
    expect((await webhook(signedRequest(subscriptionEvent()))).status).toBe(503);
  });
});

describe('server-created checkout and portal', () => {
  it.each([
    [{ organization_id: yearly }, 'different organization'],
    [{ is_archived: true }, 'product is archived'],
    [{ recurring_interval: 'year' }, 'every 1 month'],
    [{ recurring_interval_count: 2 }, 'every 1 month'],
    [{ prices: [] }, 'exactly one non-archived price'],
    [{ prices: [{ is_archived: false, amount_type: 'fixed', price_currency: 'eur', price_amount: 100 }] }, 'price must be $29; currency must be USD'],
    [{ prices: [{ is_archived: false, amount_type: 'custom', price_currency: 'usd' }] }, 'pricing must be fixed-price'],
  ])('explains catalog mismatches without opening checkout or exposing credentials (%j)', async (changes, reason) => {
    mocks.product.mockResolvedValueOnce({
      id: monthly, organization_id: organization, is_archived: false, is_recurring: true,
      recurring_interval: 'month', recurring_interval_count: 1,
      prices: [{ is_archived: false, amount_type: 'fixed', price_currency: 'usd', price_amount: 2900 }],
      ...changes,
    });
    const response = await checkout(request('/api/billing/checkout', { interval: 'monthly' }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.code).toBe('billing_product_mismatch');
    expect(body.error).toContain('sandbox monthly Pro product');
    expect(body.error).toContain(reason);
    expect(body.error).not.toContain(organization);
    expect(body.error).not.toContain('unit-test-token');
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it.each([['monthly', monthly], ['yearly', yearly]])('creates %s checkout with server-owned prices and Firebase identity', async (interval, id) => {
    const checkoutRequest = request('/api/billing/checkout', { interval });
    checkoutRequest.headers.set('cf-connecting-ip', '2001:db8::1');
    expect((await checkout(checkoutRequest)).status).toBe(200);
    expect(createPolar).toHaveBeenCalledWith(expect.objectContaining({ environment: 'sandbox' }));
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({
      products: [id], external_customer_id: 'user-a', allow_trial: false,
      success_url: 'https://app.example.test/billing/success', return_url: `https://app.example.test/sign-up?plan=${interval}`, currency: 'usd',
      customer_ip_address: '2001:db8::1',
    }));
    expect(await subscription('user-a')).toBeNull();
  });

  it('rejects identity, product, amount, and return URL overrides', async () => {
    for (const extra of [{ userId: 'user-b' }, { products: [yearly] }, { amount: 1 }, { success_url: 'https://attacker.test' }]) {
      expect((await checkout(request('/api/billing/checkout', { interval: 'monthly', ...extra }))).status).toBe(400);
    }
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect((await checkout(request('/api/billing/checkout', { interval: 'other' }))).status).toBe(400);
    const limited = await checkout(request('/api/billing/checkout', { interval: 'monthly' }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(Number(limited.headers.get('retry-after'))).toBeLessThanOrEqual(600);
  });

  it('refuses incorrect catalog pricing and existing subscriptions', async () => {
    mocks.product.mockResolvedValueOnce({ recurring_interval: 'month', prices: [], organization_id: organization });
    expect((await checkout(request('/api/billing/checkout', { interval: 'monthly' }))).status).toBe(503);
    await deliver();
    expect((await checkout(request('/api/billing/checkout', { interval: 'yearly' }))).status).toBe(409);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it('opens the portal only for the stored customer, including after failed renewal', async () => {
    await deliver(subscriptionEvent('subscription.past_due', { status: 'past_due' }));
    expect((await portal(request('/api/billing/portal', {}))).status).toBe(200);
    expect(mocks.portal).toHaveBeenCalledWith({ customer_id: customerId, return_url: 'https://app.example.test/billing' });
    expect((await portal(request('/api/billing/portal', { customer_id: monthly }))).status).toBe(400);
    expect((await portal(request('/api/billing/portal', {}, 'valid-b'))).status).toBe(409);
  });

  it('rejects forged identities, cross-origin requests, oversized bodies and unsafe provider redirects', async () => {
    expect((await checkout(request('/api/billing/checkout', { interval: 'monthly' }, 'forged'))).status).toBe(401);
    const foreign = request('/api/billing/checkout', { interval: 'monthly' });
    foreign.headers.set('origin', 'https://attacker.test');
    expect((await checkout(foreign)).status).toBe(403);
    expect((await checkout(request('/api/billing/checkout', { interval: 'monthly', padding: 'x'.repeat(3000) }))).status).toBe(413);
    mocks.checkout.mockResolvedValueOnce({ url: 'https://attacker.test/checkout' });
    expect((await checkout(request('/api/billing/checkout', { interval: 'monthly' }))).status).toBe(502);
  });

  it('does not expose SDK errors or secrets in responses or logs', async () => {
    mocks.checkout.mockRejectedValueOnce(new Error('unit-test-token-not-a-real-credential customer private details'));
    const response = await checkout(request('/api/billing/checkout', { interval: 'monthly' }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private details');
    expect(console.error).toHaveBeenCalledWith('[Billing] Operation failed.');
    expect(vi.mocked(console.error).mock.calls.flat().join(' ')).not.toContain('unit-test-token');
  });
});

describe('server-side Pro enforcement and opaque sessions', () => {
  const premium = [
    ['/api/ai/chat', chat], ['/api/ai/chat/approve', approve], ['/api/ai/chat/execute', execute],
    ['/api/google-ads/report', report], ['/api/google-ads/mutate', mutate], ['/api/mcp', mcp],
  ] as const;
  it('creates and revokes sessions with the deployed origin before Polar is configured', async () => {
    vi.stubEnv('APP_URL', deploymentOrigin);
    for (const name of [
      'POLAR_ENVIRONMENT', 'POLAR_ACCESS_TOKEN', 'POLAR_WEBHOOK_SECRET',
      'POLAR_ORGANIZATION_ID', 'POLAR_PRODUCT_PRO_MONTHLY', 'POLAR_PRODUCT_PRO_YEARLY',
      'POLAR_ACCESS_TOKEN_SANDBOX', 'POLAR_WEBHOOK_SECRET_SANDBOX',
      'POLAR_ORGANIZATION_ID_SANDBOX', 'POLAR_PRODUCT_PRO_MONTHLY_SANDBOX', 'POLAR_PRODUCT_PRO_YEARLY_SANDBOX',
    ]) vi.stubEnv(name, undefined);
    vi.mocked(createPolar).mockClear();
    const response = await createSession(new Request(`${deploymentOrigin}/api/auth/session`, {
      method: 'POST', headers: { Origin: deploymentOrigin, Authorization: 'Bearer valid-a' },
    }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect((await db.prepare('SELECT token_hash FROM app_sessions').all()).results).toHaveLength(1);
    expect((await deleteSession(new Request(`${deploymentOrigin}/api/auth/session`, {
      method: 'DELETE', headers: { Origin: deploymentOrigin, Cookie: cookie },
    }))).status).toBe(200);
    expect((await db.prepare('SELECT token_hash FROM app_sessions').all()).results).toHaveLength(0);
    expect(createPolar).not.toHaveBeenCalled();
  });

  it('denies unpaid and unauthenticated callers on every premium API, including old MCP bypass headers', async () => {
    vi.stubEnv('AI_ALLOW_ANONYMOUS', '1');
    for (const [path, handler] of premium) {
      expect((await handler(request(path, {}))).status, path).toBe(402);
      const forged = request(path, {}, 'adoptimize-internal-mcp-secret');
      forged.headers.set('sec-fetch-site', 'same-origin');
      forged.headers.set('x-mcp-internal-secret', 'adoptimize-internal-mcp-secret');
      expect((await handler(forged)).status, path).toBe(401);
      const anonymous = request(path, {});
      anonymous.headers.delete('authorization');
      expect((await handler(anonymous)).status, path).toBe(401);
    }
    const response = await status(request('/api/billing/status?checkout=complete&hasAccess=true'));
    expect(await response.json()).toMatchObject({ hasAccess: false, status: 'none' });
  });

  it('allows paid requests through every premium guard but never an unpaid second user', async () => {
    await deliver();
    for (const [path, handler] of premium) {
      expect([400, 409]).toContain((await handler(request(path, {}))).status);
      expect((await handler(request(path, {}, 'valid-b'))).status).toBe(402);
    }
    const paid = withSubscription(async () => NextResponse.json({ allowed: true }));
    expect((await paid(request('/api/protected'))).status).toBe(200);
  });

  it('guards all premium server pages and stores only an expiring session hash', async () => {
    const pages = [['/chat', ChatPage, 'chat'], ['/dashboard', DashboardPage, 'dashboard'], ['/campaigns', CampaignsPage, 'campaigns'], ['/activity-log', ActivityLogPage, 'activity_log'], ['/reports', ReportsPage, 'reports'], ['/optimizer', OptimizerPage, 'optimizer']] as const;
    for (const [path, page] of pages) {
      await expect(page()).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent(path)}`);
    }
    const response = await createSession(request('/api/auth/session', {}));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=lax');
    mocks.cookie = cookie.split(';')[0].split('=')[1];
    expect(mocks.cookie).not.toContain('valid-a');
    const stored = await db.prepare('SELECT token_hash, expires_at FROM app_sessions').first<{ token_hash: string; expires_at: number }>();
    expect(stored?.token_hash).toBe(hash(mocks.cookie));
    expect(stored!.expires_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
    await expect(requirePageSubscription('/chat')).rejects.toThrow('redirect:/sign-up?next=%2Fchat');
    await expect(AuditPage()).resolves.toBeDefined();
    for (const [, page, feature] of pages) {
      const preview = await page();
      expect(preview.type).toBe(ProPreview);
      expect(preview.props).toEqual({ feature });
    }
    await deliver();
    await expect(requirePageSubscription('/chat')).resolves.toBeUndefined();
    for (const [, page] of pages) expect((await page()).type).not.toBe(ProPreview);
    await db.prepare('UPDATE billing_subscriptions SET period_end = ?').bind('2020-01-01T00:00:00Z').run();
    for (const [, page] of pages) expect((await page()).type).toBe(ProPreview);
    await db.prepare('UPDATE billing_subscriptions SET period_end = ?').bind(new Date(Date.now() + 86400000).toISOString()).run();
    const logout = new Request('https://app.example.test/api/auth/session', {
      method: 'DELETE', headers: { Origin: 'https://app.example.test', Cookie: `adoptimize_session=${mocks.cookie}` },
    });

    expect((await deleteSession(logout)).status).toBe(200);
    await expect(requirePageSubscription('/chat')).rejects.toThrow('redirect:/sign-up?next=%2Fchat');
    expect(hasPaidAccess(await subscription('user-a'))).toBe(true);
  });

  it('fails closed without durable storage, never falling back to browser or memory state', async () => {
    mocks.db = undefined;
    expect((await chat(request('/api/ai/chat', {}))).status).toBe(503);
    expect((await auditUsage(request('/api/google-ads/audit'))).status).toBe(503);
  });

  it('does not show a paid client or a Free preview when the server cannot verify the plan', async () => {
    const response = await createSession(request('/api/auth/session', {}));
    mocks.cookie = response.headers.get('set-cookie')!.split(';')[0].split('=')[1];
    mocks.db = undefined;
    for (const page of [ChatPage, DashboardPage, CampaignsPage, ActivityLogPage, ReportsPage, OptimizerPage]) {
      await expect(page()).rejects.toMatchObject({ status: 503 });
    }
  });

  it('uses atomic persistent rate limits across concurrent requests', async () => {
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => rateLimit('shared-worker-test', 2, 60)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(4);
    for (const result of rejected) if (result.status === 'rejected') expect(result.reason.status).toBe(429);
  });
});

describe('Free audit access and durable monthly allowance', () => {
  it('requires authentication for audits even when anonymous AI mode is enabled', async () => {
    vi.stubEnv('AI_ALLOW_ANONYMOUS', '1');
    for (const handler of [audit, auditUsage]) {
      const anonymous = request('/api/google-ads/audit', {});
      anonymous.headers.delete('authorization');
      expect((await handler(anonymous)).status).toBe(401);
      expect((await handler(request('/api/google-ads/audit', {}, 'forged'))).status).toBe(401);
    }
    await expect(AuditPage()).rejects.toThrow('redirect:/sign-in?next=%2Faudit');
    expect((await audit(request('/api/google-ads/audit', {}))).status).toBe(409);
  });

  it('lets Free users inspect their allowance without Polar product credentials or a payment', async () => {
    vi.stubEnv('POLAR_PRODUCT_PRO_MONTHLY_SANDBOX', undefined);
    vi.stubEnv('POLAR_PRODUCT_PRO_YEARLY_SANDBOX', undefined);
    expect((await auditUsage(request('/api/google-ads/audit'))).status).toBe(200);
    expect(await getAuditUsage('user-a')).toMatchObject({ plan: 'free', limit: 5, remaining: 5 });
    expect((await status(request('/api/billing/status'))).status).toBe(200);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it('permits exactly five concurrent reservations, counts completed reports and rejects the sixth', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => reserveAudit('user-a')));
    const accepted = attempts.filter((item) => item.status === 'fulfilled');
    expect(accepted).toHaveLength(5);
    const rejected = attempts.find((item) => item.status === 'rejected');
    if (rejected?.status !== 'rejected') throw new Error('Expected quota rejection');
    expect(rejected.reason).toMatchObject({ status: 429, code: 'audit_quota_exceeded' });
    for (const item of accepted) {
      if (item.status === 'fulfilled' && item.value) await completeAudit(item.value, 'user-a');
    }
    expect(await getAuditUsage('user-a')).toMatchObject({ used: 5, remaining: 0 });
    await expect(reserveAudit('user-a')).rejects.toMatchObject({ code: 'audit_quota_exceeded' });
    expect(await getAuditUsage('user-b')).toMatchObject({ remaining: 5 });
  });

  it('does not charge failed or interrupted audits', async () => {
    const first = await reserveAudit('user-a');
    if (!first) throw new Error('Expected Free reservation');
    await releaseAudit(first);
    expect(await getAuditUsage('user-a')).toMatchObject({ used: 0, remaining: 5 });
    const interrupted = await reserveAudit('user-a');
    const now = Date.now();
    vi.setSystemTime(now + 121000);
    expect(await getAuditUsage('user-a')).toMatchObject({ used: 0, remaining: 5 });
    if (!interrupted) throw new Error('Expected Free reservation');
    await expect(completeAudit(interrupted, 'user-a')).rejects.toMatchObject({ status: 503 });
  });

  it('resets at the UTC calendar-month boundary and isolates deployment environments', async () => {
    vi.setSystemTime(new Date('2026-11-30T23:55:00Z'));
    for (let i = 0; i < 5; i++) {
      const id = await reserveAudit('user-a');
      if (!id) throw new Error('Expected Free reservation');
      await completeAudit(id, 'user-a');
    }
    expect(await getAuditUsage('user-a')).toMatchObject({ remaining: 0, resetsAt: '2026-12-01T00:00:00.000Z' });
    vi.stubEnv('POLAR_ENVIRONMENT', 'production');
    expect(await getAuditUsage('user-a')).toMatchObject({ remaining: 5 });
    vi.stubEnv('POLAR_ENVIRONMENT', 'sandbox');
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    expect(await getAuditUsage('user-a')).toMatchObject({ remaining: 5 });
  });

  it('does not apply the Free quota to an active Pro subscription, but restores it after expiration', async () => {
    await deliver();
    for (let i = 0; i < 6; i++) expect(await reserveAudit('user-a')).toBeNull();
    expect(await getAuditUsage('user-a')).toMatchObject({ plan: 'pro', limit: null, remaining: null });
    await db.prepare('UPDATE billing_subscriptions SET period_end = ?').bind('2020-01-01T00:00:00Z').run();
    expect(await getAuditUsage('user-a')).toMatchObject({ plan: 'free', remaining: 5 });
  });

  it('allocates a run spanning midnight to its original UTC month without extending old usage retention', async () => {
    vi.setSystemTime(new Date('2026-11-30T23:59:50Z'));
    const id = await reserveAudit('user-a');
    if (!id) throw new Error('Expected Free reservation');
    vi.setSystemTime(new Date('2026-12-01T00:00:10Z'));
    expect(await completeAudit(id, 'user-a')).toMatchObject({ remaining: 5 });
    const row = await db.prepare('SELECT period, expires_at FROM free_audit_runs WHERE id = ?')
      .bind(id).first<{ period: string; expires_at: number }>();
    expect(row).toMatchObject({ period: '2026-11', expires_at: Date.parse('2026-12-01T00:00:00Z') / 1000 });
  });
});
