import type { AuditFinding } from './audit';
import { toCsv } from '@/lib/csv';

export function buildAuditCsv(findings: readonly AuditFinding[]): string {
  const rows = [
    ['Priority', 'Category', 'Campaign', 'Finding', 'Evidence', 'Next step'],
    ...findings.map((finding) => [
      finding.priority, finding.category, finding.campaignName || 'Account',
      finding.title, finding.evidence, finding.recommendation,
    ]),
  ];
  return toCsv(rows);
}
