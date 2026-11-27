export const FREE_AUDITS_PER_MONTH = 5;
export const FREE_WORKSPACE_PATHS = ['/audit', '/settings', '/billing', '/dashboard', '/campaigns', '/chat', '/reports', '/optimizer', '/activity-log'];
export const FREE_PLAN_SUMMARY = '5 monthly free google ads audits.';

export interface AuditUsage {
  plan: 'free' | 'pro';
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}
