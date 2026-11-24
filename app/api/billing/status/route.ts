import { NextResponse } from 'next/server';
import { billingEnvironment, billingProducts } from '@/lib/billing/config';
import { billingFailure, billingIdentity } from '@/lib/billing/http';
import { customer, hasPaidAccess, hash, rateLimit, subscription } from '@/lib/billing/store';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const identity = await billingIdentity(request);
    await rateLimit(`status:${hash(identity.uid)}`, 60, 60);
    const [state, owner] = await Promise.all([subscription(identity.uid), customer(identity.uid)]);
    return NextResponse.json({
      environment: billingEnvironment(), hasAccess: hasPaidAccess(state), hasCustomer: Boolean(owner?.customer_id),
      status: state?.status || 'none', periodEnd: state?.period_end || null,
      cancelAtPeriodEnd: Boolean(state?.cancel_at_period_end),
      interval: state ? state.product_id === billingProducts().monthly ? 'monthly' : 'yearly' : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}
