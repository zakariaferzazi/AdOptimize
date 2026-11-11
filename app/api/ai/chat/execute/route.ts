import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import {
  AccountBindingError,
  assertProposalAccount,
  resolveAccountBinding,
  resolveFreshAccessToken,
} from '@/lib/ai/account-binding';
import { executeProposal } from '@/lib/ai/execution';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Execute an approved proposal.
 *
 * The browser supplies only the proposal identity. Identity, account binding and
 * Google Ads credentials are all resolved server-side, so a forged request
 * cannot reach another account.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const body = await req.json();

    const proposalId = String(body?.proposal_id || body?.proposalId || '');
    const revision = Number(body?.revision);
    const payloadHash = String(body?.payload_hash || body?.payloadHash || '');

    if (!proposalId || !Number.isInteger(revision) || !payloadHash) {
      return NextResponse.json({ error: 'proposal_id, revision and payload_hash are required.' }, { status: 400 });
    }

    const store = await getStore();
    const record = await store.proposals.get(proposalId, identity.uid);
    if (!record) {
      return NextResponse.json({ error: 'This proposal was not found.' }, { status: 404 });
    }

    const binding = await resolveAccountBinding(identity.uid, idToken);
    if (!binding) {
      return NextResponse.json({ error: 'Connect a Google Ads account before executing a change.' }, { status: 409 });
    }

    // The proposal must belong to the account this login is bound to.
    assertProposalAccount(record.account_id, binding);

    const { accessToken } = await resolveFreshAccessToken(identity.uid, idToken);
    if (!accessToken) {
      return NextResponse.json({ error: 'Google Ads access has expired. Reconnect the account and try again.' }, { status: 401 });
    }

    const outcome = await executeProposal({
      userId: identity.uid,
      proposalId,
      revision,
      payloadHash,
      customerId: binding.customerId,
      accessToken,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      loginCustomerId: binding.loginCustomerId,
      currency: binding.currency,
      accountName: binding.accountName,
    });

    const status =
      outcome.status === 'succeeded' || outcome.status === 'executed_unverified'
        ? 200
        : outcome.error?.type === 'conflict' || outcome.error?.type === 'drift'
        ? 409
        : outcome.error?.type === 'permission'
        ? 403
        : outcome.error?.type === 'invalid_argument' || outcome.error?.type === 'policy'
        ? 422
        : outcome.error?.type === 'not_found'
        ? 404
        : 502;

    return NextResponse.json(
      {
        success: outcome.status === 'succeeded',
        status: outcome.status,
        message: outcome.user_message,
        error:
          outcome.status === 'failed'
            ? [outcome.user_message, outcome.error?.message].filter(Boolean).join(' ')
            : undefined,
        result: outcome,
        data: outcome.realIds?.campaignId ? { campaignId: outcome.realIds.campaignId } : undefined,
        proposalId,
      },
      { status }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AccountBindingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[AI Chat] Execution failed:', error);
    return NextResponse.json(
      { error: 'The change could not be executed safely. No Google Ads changes were confirmed.' },
      { status: 500 }
    );
  }
}
