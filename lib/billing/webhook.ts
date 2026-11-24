import { BillingError, billingProducts, organizationId, uuid } from './config';
import { customer, type PaymentUpdate, type SubscriptionUpdate } from './store';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BillingError(400, 'Invalid webhook object.');
  return value as Record<string, unknown>;
}
function string(value: unknown, maximum = 200): string {
  if (typeof value !== 'string' || !value || value.length > maximum) throw new BillingError(400, 'Invalid webhook field.');
  return value;
}
function id(value: unknown): string {
  if (!uuid(value)) throw new BillingError(400, 'Invalid webhook identifier.');
  return value;
}
function timestamp(value: unknown): string {
  const text = string(value, 50);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)$/.test(text) || !Number.isFinite(Date.parse(text)) ||
    new Date(`${text.slice(0, 19)}Z`).toISOString().slice(0, 19) !== text.slice(0, 19)) {
    throw new BillingError(400, 'Invalid webhook timestamp.');
  }
  const fraction = text.match(/\.(\d+)/)?.[1] || '';
  return `${new Date(text).toISOString().slice(0, 19)}.${fraction.padEnd(9, '0')}Z`;
}

export async function webhookUpdate(value: unknown): Promise<{
  type: string; subscription?: SubscriptionUpdate; payment?: PaymentUpdate; ignored?: string;
}> {
  const event = object(value);
  const type = string(event.type);
  timestamp(event.timestamp);
  const data = object(event.data);
  if (type.startsWith('subscription.')) {
    const client = object(data.customer);
    if (client.organization_id !== organizationId() || object(data.product).organization_id !== organizationId()) {
      throw new BillingError(403, 'Webhook organization does not match.');
    }
    const products = Object.values(billingProducts());
    const product_id = id(data.product_id);
    if (!products.includes(product_id)) return { type, ignored: 'unmanaged_product' };
    const user_id = string(client.external_id, 128);
    const customer_id = id(data.customer_id);
    if (id(client.id) !== customer_id) throw new BillingError(400, 'Webhook customer does not match.');
    const owner = await customer(user_id);
    if (!owner) return { type, ignored: 'unmanaged_customer' };
    if (owner.customer_id && owner.customer_id !== customer_id) throw new BillingError(409, 'Webhook customer identity conflict.');
    const allowed = ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'trial_ended'];
    let status = string(data.status, 40);
    if (!allowed.includes(status) || typeof data.cancel_at_period_end !== 'boolean') throw new BillingError(400, 'Invalid subscription state.');
    if (type === 'subscription.revoked') status = 'canceled';
    if (type === 'subscription.past_due') status = 'past_due';
    if (type === 'subscription.paused') status = 'paused';
    let period_end = timestamp(data.current_period_end);
    if (data.ends_at !== null && data.ends_at !== undefined) {
      const end = timestamp(data.ends_at);
      if (end < period_end) period_end = end;
    }
    return {
      type, subscription: {
        id: id(data.id), user_id, customer_id, product_id, status, period_end,
        cancel_at_period_end: Number(data.cancel_at_period_end), source_time: timestamp(data.modified_at ?? data.created_at),
        precedence: ['canceled', 'unpaid'].includes(status) ? 4 : status === 'past_due' || status === 'paused' ? 3 : data.cancel_at_period_end ? 2 : 1,
      },
    };
  }
  if (type.startsWith('order.') || type.startsWith('refund.')) {
    const isRefund = type.startsWith('refund.');
    const organization = isRefund ? data.organization_id : object(data.customer).organization_id;
    if (organization !== organizationId()) throw new BillingError(403, 'Webhook organization does not match.');
    return {
      type, payment: {
        id: id(data.id), kind: isRefund ? 'refund' : 'order',
        customer_id: id(data.customer_id), subscription_id: data.subscription_id === null ? null : id(data.subscription_id),
        status: string(data.status, 60), source_time: timestamp(data.modified_at ?? data.created_at),
      },
    };
  }
  return { type, ignored: 'unhandled_event' };
}
