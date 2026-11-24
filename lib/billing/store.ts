import { createHash } from 'crypto';
import { getD1Database } from '@/lib/store';
import type { D1Database, D1PreparedStatement } from '@/lib/store/d1';
import { BillingError, billingEnvironment, billingProducts } from './config';

export interface SubscriptionState {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  period_end: string;
  cancel_at_period_end: number;
  source_time: string;
  precedence: number;
}
export interface SubscriptionUpdate extends SubscriptionState { customer_id: string }
export interface PaymentUpdate {
  id: string; kind: 'order' | 'refund'; customer_id: string; subscription_id: string | null;
  status: string; source_time: string;
}

export function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function billingDb(): Promise<D1Database> {
  const db = await getD1Database();
  if (!db) throw new BillingError(503, 'Durable billing storage is unavailable.', 'billing_unavailable');
  return db;
}

export async function rateLimit(key: string, maximum: number, seconds: number): Promise<void> {
  const db = await billingDb();
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / seconds);
  await db.prepare('DELETE FROM billing_rate_limits WHERE expires_at < ?').bind(now).run();
  const result = await db.prepare(`INSERT INTO billing_rate_limits (key, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET hits = hits + 1 WHERE hits < ? RETURNING hits`)
    .bind(`${billingEnvironment()}:${key}:${bucket}`, (bucket + 1) * seconds, maximum).first<{ hits: number }>();
  if (!result) throw new BillingError(429, 'Too many requests. Please try again shortly.', 'rate_limited', (bucket + 1) * seconds - now);
}

export async function customer(userId: string): Promise<{ customer_id: string | null } | null> {
  return (await billingDb()).prepare('SELECT customer_id FROM billing_customers WHERE environment = ? AND user_id = ?')
    .bind(billingEnvironment(), userId).first<{ customer_id: string | null }>();
}

export async function reserveCustomer(userId: string): Promise<void> {
  await (await billingDb()).prepare('INSERT INTO billing_customers (environment, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .bind(billingEnvironment(), userId).run();
}

export async function subscription(userId: string): Promise<SubscriptionState | null> {
  const products = billingProducts();
  return (await billingDb()).prepare(`SELECT * FROM billing_subscriptions
    WHERE environment = ? AND user_id = ? AND product_id IN (?, ?)
    ORDER BY CASE WHEN status = 'active' AND period_end > ? THEN 0 ELSE 1 END,
      source_time DESC, precedence DESC LIMIT 1`)
    .bind(billingEnvironment(), userId, products.monthly, products.yearly,
      new Date(Date.now()).toISOString().replace('Z', '000000Z')).first<SubscriptionState>();
}

export function hasPaidAccess(state: SubscriptionState | null): boolean {
  return Boolean(state && state.status === 'active' && Date.parse(state.period_end) > Date.now());
}

export async function applyWebhook(input: {
  id: string; bodyHash: string; type: string;
  subscription?: SubscriptionUpdate; payment?: PaymentUpdate;
}): Promise<void> {
  const db = await billingDb();
  const env = billingEnvironment();
  const existing = await db.prepare('SELECT body_hash FROM billing_events WHERE environment = ? AND id = ?')
    .bind(env, input.id).first<{ body_hash: string }>();
  if (existing && existing.body_hash !== input.bodyHash) throw new BillingError(409, 'Webhook identifier conflict.');
  const pending = 'EXISTS (SELECT 1 FROM billing_events WHERE environment = ? AND id = ? AND body_hash = ? AND processed = 0)';
  const eventArgs = [env, input.id, input.bodyHash];
  const statements: D1PreparedStatement[] = [
    db.prepare('INSERT INTO billing_events (environment, id, body_hash, type) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(env, input.id, input.bodyHash, input.type),
  ];
  const state = input.subscription;
  if (state) {
    statements.push(db.prepare(`UPDATE billing_customers SET customer_id = ?
      WHERE environment = ? AND user_id = ? AND (customer_id IS NULL OR customer_id = ?) AND ${pending}`)
      .bind(state.customer_id, env, state.user_id, state.customer_id, ...eventArgs));
    statements.push(db.prepare(`INSERT INTO billing_subscriptions
      (environment, id, user_id, product_id, status, period_end, cancel_at_period_end, source_time, precedence)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${pending}
        AND EXISTS (SELECT 1 FROM billing_customers WHERE environment = ? AND user_id = ? AND customer_id = ?)
      ON CONFLICT(environment, id) DO UPDATE SET product_id = excluded.product_id, status = excluded.status,
        period_end = excluded.period_end, cancel_at_period_end = excluded.cancel_at_period_end,
        source_time = excluded.source_time, precedence = excluded.precedence
      WHERE billing_subscriptions.user_id = excluded.user_id AND
        (excluded.source_time > billing_subscriptions.source_time OR
        (excluded.source_time = billing_subscriptions.source_time AND excluded.precedence >= billing_subscriptions.precedence))`)
      .bind(env, state.id, state.user_id, state.product_id, state.status, state.period_end,
        state.cancel_at_period_end, state.source_time, state.precedence, ...eventArgs, env, state.user_id, state.customer_id));
  }
  const payment = input.payment;
  if (payment) {
    statements.push(db.prepare(`INSERT INTO billing_payments (environment, id, kind, customer_id, subscription_id, status, source_time)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${pending}
      ON CONFLICT(environment, kind, id) DO UPDATE SET status = excluded.status, source_time = excluded.source_time
      WHERE excluded.source_time > billing_payments.source_time`)
      .bind(env, payment.id, payment.kind, payment.customer_id, payment.subscription_id, payment.status, payment.source_time, ...eventArgs));
  }
  statements.push(db.prepare(`UPDATE billing_events SET processed = 1 WHERE environment = ? AND id = ? AND body_hash = ?`).bind(...eventArgs));
  const results = await db.batch(statements);
  if (results.some((result) => !result.success)) throw new BillingError(503, 'Webhook storage failed. Please retry.');
  const saved = await db.prepare('SELECT body_hash FROM billing_events WHERE environment = ? AND id = ?')
    .bind(env, input.id).first<{ body_hash: string }>();
  if (!saved || saved.body_hash !== input.bodyHash) throw new BillingError(409, 'Webhook identifier conflict.');
}
