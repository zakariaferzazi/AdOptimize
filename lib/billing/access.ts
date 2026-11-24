import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { BillingError } from './config';
import { billingFailure, billingIdentity } from './http';
import { billingDb, hasPaidAccess, hash, rateLimit, subscription } from './store';

export async function requireSubscription(request: Request): Promise<string> {
  const identity = await billingIdentity(request);
  if (!hasPaidAccess(await subscription(identity.uid))) {
    throw new BillingError(402, 'An active Pro subscription is required.', 'subscription_required');
  }
  await rateLimit(`premium:${hash(identity.uid)}`, 120, 60);
  return identity.uid;
}

export function withSubscription(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try { await requireSubscription(request); }
    catch (error) { return billingFailure(error); }
    return handler(request);
  };
}

export async function requirePageSubscription(path: string): Promise<void> {
  // The sign-up flow resumes at the right step: account for guests, plan for signed-in unpaid users.
  const paywall = `/sign-up?next=${encodeURIComponent(path)}`;
  const token = (await cookies()).get('adoptimize_session')?.value;
  if (!token) redirect(paywall);
  const session = await (await billingDb()).prepare('SELECT user_id FROM app_sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(hash(token), Math.floor(Date.now() / 1000)).first<{ user_id: string }>();
  if (!session || !hasPaidAccess(await subscription(session.user_id))) redirect(paywall);
}
