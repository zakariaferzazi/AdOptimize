import { NextRequest, NextResponse } from 'next/server';
import { requireIdentity, UnauthorizedError } from '@/lib/ai/identity';
import { AccountBindingError, resolveAccountBinding } from '@/lib/ai/account-binding';
import { getStore, isDurableStore } from '@/lib/store';
import { parseMeta } from '@/lib/ai/proposals';
import type { ActivityEntry, ActivityPage } from '@/lib/activity';
import type { AuditEventRecord } from '@/lib/store/types';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 50;
const eventInfo: Record<string, { title: string; outcome: ActivityEntry['outcome']; actor: string }> = {
  proposal_created: { title: 'Change proposed', outcome: 'proposed', actor: 'AI agent' },
  proposal_revised: { title: 'Proposal revised', outcome: 'proposed', actor: 'AI agent' },
  proposal_approved: { title: 'Change approved', outcome: 'approved', actor: 'You' },
  proposal_cancelled: { title: 'Proposal cancelled', outcome: 'cancelled', actor: 'You' },
  execution_verified: { title: 'Change applied and verified', outcome: 'verified', actor: 'AdOptimize' },
  execution_failed: { title: 'Execution failed', outcome: 'failed', actor: 'AdOptimize' },
  execution_unverified: { title: 'Execution needs verification', outcome: 'unverified', actor: 'AdOptimize' },
};

function objectJson(text: string | null): Record<string, unknown> {
  const parsed: unknown = text ? JSON.parse(text) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid stored activity details.');
  return parsed as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await requireIdentity(req);
    const idToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const binding = await resolveAccountBinding(identity.uid, idToken);
    if (!binding) return NextResponse.json({ error: 'Select a Google Ads account to view its AdOptimize activity.' }, { status: 409 });
    const cursor = new URL(req.url).searchParams.get('cursor');
    let before: { timestamp: string; id: string } | undefined;
    if (cursor) {
      let parsed: unknown;
      try {
        parsed = cursor.length <= 300 ? JSON.parse(cursor) : null;
      } catch {
        parsed = null;
      }
      const value = parsed as { timestamp?: unknown; id?: unknown } | null;
      if (!value || typeof value.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value.timestamp) ||
        !Number.isFinite(Date.parse(value.timestamp)) || typeof value.id !== 'string' || !value.id || value.id.length > 100) {
        return NextResponse.json({ error: 'The activity cursor is invalid. Refresh the history and try again.' }, { status: 400 });
      }
      before = { timestamp: value.timestamp, id: value.id };
    }
    const store = await getStore();
    const records = await store.audit.list(identity.uid, PAGE_SIZE + 1, { accountId: binding.customerId, before });
    const page = records.slice(0, PAGE_SIZE);
    const proposalIds = [...new Set(page.map((event) => event.proposal_id).filter((id): id is string => Boolean(id)))];
    const proposals = new Map(await Promise.all(proposalIds.map(async (id) => [id, await store.proposals.get(id, identity.uid)] as const)));
    const entries: ActivityEntry[] = page.map((event: AuditEventRecord) => {
      const candidate = event.proposal_id ? proposals.get(event.proposal_id) : undefined;
      const proposal = candidate?.account_id === binding.customerId ? candidate : undefined;
      const meta = proposal ? parseMeta(proposal) : undefined;
      const details = objectJson(event.details);
      const info = eventInfo[event.event] || { title: event.event.replace(/_/g, ' '), outcome: 'recorded' as const, actor: 'AdOptimize' };
      const result = event.event.startsWith('execution_') && proposal ? objectJson(proposal.result) : {};
      const executionError = result.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : {};
      return {
        id: event.id, timestamp: event.timestamp, title: info.title, outcome: info.outcome,
        actor: info.actor, source: 'AI workflow',
        target: meta?.target.label || 'Account',
        summary: meta?.summary || 'Recorded AdOptimize workflow event.',
        operation: typeof details.operation === 'string' ? details.operation : proposal?.operation || '',
        changes: meta?.changes || [],
        message: [result.user_message, executionError.message, executionError.next_step].filter((value): value is string => typeof value === 'string').join(' ') || undefined,
        proposalId: event.proposal_id || undefined, conversationId: event.conversation_id || undefined,
        before: result.before, after: result.after,
      };
    });
    const last = page.at(-1);
    const result: ActivityPage = {
      entries, account: { customerId: binding.customerId, name: binding.accountName }, durable: isDurableStore(),
      nextCursor: records.length > PAGE_SIZE && last ? JSON.stringify({ timestamp: last.timestamp, id: last.id }) : null,
    };
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AccountBindingError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('[Activity] Read failed:', error);
    return NextResponse.json({ error: 'Saved activity could not be loaded. Please try again.' }, { status: 500 });
  }
}
