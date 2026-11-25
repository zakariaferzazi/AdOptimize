const ALLOWED = ['/dashboard', '/campaigns', '/chat', '/audit', '/reports', '/optimizer', '/activity-log', '/settings', '/billing'];

// Only same-site app paths are accepted, so a crafted ?next= can never send users elsewhere.
export function safeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  return value && ALLOWED.includes(value) ? value : fallback;
}

export type PlanInterval = 'monthly' | 'yearly';

export function parseInterval(value: string | null | undefined): PlanInterval {
  return value === 'yearly' ? 'yearly' : 'monthly';
}
