import type { AuditLog } from '@/types/adoptimize';

export const activityOutcomes = {
  proposed: 'Proposed', approved: 'Approved', verified: 'Verified',
  failed: 'Failed', unverified: 'Needs verification', cancelled: 'Cancelled',
  accepted: 'API accepted', recorded: 'App record',
};

export interface ActivityEntry {
  id: string;
  timestamp: string;
  title: string;
  target: string;
  source: 'AI workflow' | 'App record';
  actor: string;
  outcome: keyof typeof activityOutcomes;
  summary: string;
  operation: string;
  changes: string[];
  message?: string;
  proposalId?: string;
  conversationId?: string;
  before?: unknown;
  after?: unknown;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  nextCursor: string | null;
  account: { customerId: string; name: string };
  durable: boolean;
}

export function appLogEntry(log: AuditLog): ActivityEntry {
  const titles: Record<string, string> = {
    CAMPAIGN_STATUS_CHANGE: 'Campaign status changed',
    BUDGET_CHANGE: 'Daily budget changed',
    SETTINGS_UPDATE: 'Campaign settings updated',
    BUDGET_REALLOCATED: 'Budget reallocation recorded',
    REVERT_PREVIOUS_ACTION: 'App rollback recorded',
  };
  return {
    id: `app-${log.id}`, timestamp: log.timestamp,
    title: titles[log.actionType] || log.actionType.replace(/_/g, ' '), target: log.campaignName || 'Account',
    source: 'App record', actor: log.userOrSystem,
    outcome: log.verification === 'api_accepted' ? 'accepted' : 'recorded',
    summary: log.reason, operation: log.actionType,
    changes: [], before: log.previousValue, after: log.newValue,
    message: log.verification === 'api_accepted'
      ? 'Google Ads accepted the request. No read-back verification was recorded.'
      : `Recorded app status: ${log.status}. This is not confirmation that Google Ads was changed or reverted.`,
  };
}
