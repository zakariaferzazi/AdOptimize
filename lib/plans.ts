export const FREE_AUDITS_PER_MONTH = 5;
export const FREE_WORKSPACE_PATHS = ['/audit', '/settings', '/billing'];
export const FREE_PLAN_SUMMARY = 'Free includes five Google Ads audits per calendar month (UTC). Dashboard, campaign viewing, the AI Marketing Agent, reports and optimization tools require Pro.';

export interface AuditUsage {
  plan: 'free' | 'pro';
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}
