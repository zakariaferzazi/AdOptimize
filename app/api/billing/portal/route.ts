import { NextResponse } from 'next/server';
import { appOrigin, BillingError, polarClient, polarRedirect } from '@/lib/billing/config';
import { billingFailure, billingIdentity, checkOrigin, readJson } from '@/lib/billing/http';
import { customer, hash, rateLimit } from '@/lib/billing/store';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`portal:${hash(identity.uid)}`, 10, 600);
    if (Object.keys(await readJson(request)).length) throw new BillingError(400, 'Portal requests do not accept customer identifiers.');
    const owner = await customer(identity.uid);
    if (!owner?.customer_id) throw new BillingError(409, 'No confirmed billing customer yet. Complete checkout and wait for confirmation.');
    const session = await polarClient().customerSessions.create({ customer_id: owner.customer_id, return_url: `${appOrigin()}/settings?tab=billing` });
    return NextResponse.json({ url: polarRedirect(session.customer_portal_url) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingFailure(error); }
}
