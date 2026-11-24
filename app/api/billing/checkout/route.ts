import { NextResponse } from 'next/server';
import { appOrigin, BillingError, billingProducts, organizationId, polarClient, polarRedirect } from '@/lib/billing/config';
import { billingFailure, billingIdentity, checkOrigin, clientIp, readJson } from '@/lib/billing/http';
import { hash, rateLimit, reserveCustomer, subscription } from '@/lib/billing/store';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`checkout:${hash(identity.uid)}`, 5, 600);
    const body = await readJson(request);
    if (Object.keys(body).some((key) => key !== 'interval') || (body.interval !== 'monthly' && body.interval !== 'yearly')) {
      throw new BillingError(400, 'Choose monthly or yearly billing.');
    }
    const current = await subscription(identity.uid);
    if (current && ['active', 'past_due', 'trialing'].includes(current.status)) {
      throw new BillingError(409, 'Use the customer portal to manage your existing subscription.');
    }
    const interval = body.interval;
    const productId = billingProducts()[interval];
    const polar = polarClient();
    const product = await polar.products.get(productId);
    const expected = interval === 'monthly' ? 2900 : 9900;
    const prices = product.prices.filter((price) => !price.is_archived);
    if (product.organization_id !== organizationId() || product.is_archived || !product.is_recurring ||
      product.recurring_interval !== (interval === 'monthly' ? 'month' : 'year') || product.recurring_interval_count !== 1 ||
      prices.length !== 1 || prices[0].amount_type !== 'fixed' || prices[0].price_amount !== expected || prices[0].price_currency !== 'usd') {
      throw new BillingError(503, 'The configured product does not match the advertised Pro plan.');
    }
    await reserveCustomer(identity.uid);
    const checkout = await polar.checkouts.create({
      products: [productId], external_customer_id: identity.uid,
      ...(identity.emailVerified && identity.email ? { customer_email: identity.email } : {}),
      success_url: `${appOrigin()}/billing/success`, return_url: `${appOrigin()}/sign-up?plan=${interval}`,
      currency: 'usd', allow_trial: false, allow_discount_codes: false,
      customer_ip_address: clientIp(request),
    });
    return NextResponse.json({ url: polarRedirect(checkout.url) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}
