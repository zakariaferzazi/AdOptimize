'use client';

import type { User } from 'firebase/auth';
import type { PlanInterval } from '@/lib/auth-redirect';

export interface BillingStatus {
  environment: 'sandbox' | 'production';
  hasAccess: boolean;
  hasCustomer: boolean;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  interval: PlanInterval | null;
}

export class BillingClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

async function call<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init, cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new BillingClientError(data.error || 'Billing is temporarily unavailable.', response.status, data.code);
  return data as T;
}

export const fetchBillingStatus = (user: User) => call<BillingStatus>(user, '/api/billing/status');

// The server creates the Polar checkout; the browser only ever receives the redirect URL.
export async function startCheckout(user: User, interval: PlanInterval): Promise<void> {
  const { url } = await call<{ url: string }>(user, '/api/billing/checkout', { method: 'POST', body: JSON.stringify({ interval }) });
  window.location.assign(url);
}

export async function openPortal(user: User): Promise<void> {
  const { url } = await call<{ url: string }>(user, '/api/billing/portal', { method: 'POST', body: '{}' });
  window.location.assign(url);
}
