import { randomUUID } from 'crypto';
import { FREE_AUDITS_PER_MONTH, type AuditUsage } from '@/lib/plans';
import { BillingError, billingEnvironment } from './config';
import { billingDb, hash, hasPaidAccess, subscription } from './store';

function auditPeriod() {
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    period: now.toISOString().slice(0, 7),
    now: Math.floor(now.getTime() / 1000),
    end: Math.floor(resetsAt.getTime() / 1000),
    resetsAt: resetsAt.toISOString(),
  };
}

export async function getAuditUsage(userId: string): Promise<AuditUsage> {
  const window = auditPeriod();
  if (hasPaidAccess(await subscription(userId))) {
    return { plan: 'pro', limit: null, used: 0, remaining: null, resetsAt: window.resetsAt };
  }
  const row = await (await billingDb()).prepare(`SELECT
    COUNT(*) AS occupied,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM free_audit_runs WHERE environment = ? AND user_hash = ? AND period = ?
      AND expires_at > ?`)
    .bind(billingEnvironment(), hash(userId), window.period, window.now)
    .first<{ occupied: number; completed: number | null }>();
  if (!row) throw new BillingError(503, 'Audit allowance is temporarily unavailable.');
  return {
    plan: 'free', limit: FREE_AUDITS_PER_MONTH, used: row.completed ?? 0,
    remaining: Math.max(0, FREE_AUDITS_PER_MONTH - row.occupied), resetsAt: window.resetsAt,
  };
}

export async function reserveAudit(userId: string): Promise<string | null> {
  if (hasPaidAccess(await subscription(userId))) return null;
  const window = auditPeriod();
  const db = await billingDb();
  await db.prepare('DELETE FROM free_audit_runs WHERE expires_at <= ?').bind(window.now).run();
  const id = randomUUID();
  const environment = billingEnvironment();
  const userHash = hash(userId);
  // Expiring reservations prevent concurrent requests from exceeding the quota
  // without charging a slot forever when a Worker is interrupted.
  const reserved = await db.prepare(`INSERT INTO free_audit_runs
    (id, environment, user_hash, period, status, expires_at)
    SELECT ?, ?, ?, ?, 'reserved', ? WHERE (
      SELECT COUNT(*) FROM free_audit_runs
      WHERE environment = ? AND user_hash = ? AND period = ? AND expires_at > ?
    ) < ? RETURNING id`)
    .bind(id, environment, userHash, window.period, window.now + 120,
      environment, userHash, window.period, window.now, FREE_AUDITS_PER_MONTH)
    .first<{ id: string }>();
  if (!reserved) {
    throw new BillingError(429,
      `Your five free Google Ads audits for this month are used or in progress. Your allowance resets on ${window.resetsAt.slice(0, 10)} (UTC). Upgrade to Pro for audits without this monthly quota.`,
      'audit_quota_exceeded', window.end - window.now);
  }
  return reserved.id;
}

export async function completeAudit(id: string, userId: string): Promise<AuditUsage> {
  const window = auditPeriod();
  const completed = await (await billingDb()).prepare(`UPDATE free_audit_runs
    SET status = 'completed', expires_at = CAST(strftime('%s', period || '-01', '+1 month') AS INTEGER)
    WHERE id = ? AND status = 'reserved'
      AND expires_at > ? RETURNING id`)
    .bind(id, window.now).first<{ id: string }>();
  if (!completed) throw new BillingError(503, 'The audit took too long. Please run it again; no audit was charged.');
  return getAuditUsage(userId);
}

export async function releaseAudit(id: string): Promise<void> {
  await (await billingDb()).prepare('DELETE FROM free_audit_runs WHERE id = ?').bind(id).run();
}
