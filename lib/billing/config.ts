import { createPolar } from '@polar-sh/sdk/2026-10';

export class BillingError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'billing_error',
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function billingEnvironment(): 'sandbox' | 'production' {
  const value = process.env.POLAR_ENVIRONMENT || 'sandbox';
  if (value !== 'sandbox' && value !== 'production') throw new BillingError(503, 'Billing configuration is unavailable.');
  return value;
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new BillingError(503, 'Billing is not configured yet.', 'billing_unavailable');
  return value;
}

export function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
}

export function billingProducts() {
  const monthly = requiredEnv('POLAR_PRODUCT_PRO_MONTHLY');
  const yearly = requiredEnv('POLAR_PRODUCT_PRO_YEARLY');
  if (!uuid(monthly) || !uuid(yearly) || monthly === yearly) throw new BillingError(503, 'Billing product configuration is invalid.');
  return { monthly, yearly };
}

export function organizationId(): string {
  const id = requiredEnv('POLAR_ORGANIZATION_ID');
  if (!uuid(id)) throw new BillingError(503, 'Billing organization configuration is invalid.');
  return id;
}

export function appOrigin(): string {
  const url = new URL(requiredEnv('APP_URL'));
  const localSandbox = billingEnvironment() === 'sandbox' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(localSandbox && url.protocol === 'http:'))) {
    throw new BillingError(503, 'Application URL configuration is invalid.');
  }
  return url.origin;
}

export function polarClient() {
  return createPolar({
    accessToken: requiredEnv('POLAR_ACCESS_TOKEN'),
    environment: billingEnvironment(), organizationId: organizationId(), timeout: 8,
  });
}

export function polarRedirect(value: string): string {
  const url = new URL(value);
  const host = billingEnvironment() === 'sandbox' ? 'sandbox.polar.sh' : 'polar.sh';
  if (url.protocol !== 'https:' || url.host !== host || url.username || url.password) {
    throw new BillingError(502, 'The billing provider returned an invalid redirect.');
  }
  return url.href;
}
