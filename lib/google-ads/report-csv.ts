import { toCsv } from '@/lib/csv';
import type { PerformanceReport } from './performance-report';

export function buildPerformanceCsv(campaigns: PerformanceReport['campaigns'], currency: string): string {
  return toCsv([
    ['Campaign', 'Campaign ID', 'Current status', 'Type', `Spend (${currency})`, 'Impressions', 'Clicks',
      'Conversions', `Conversion value (${currency})`, `CPA (${currency})`, 'ROAS'],
    ...campaigns.map((campaign) => [
      campaign.name, campaign.id, campaign.status, campaign.channel,
      campaign.metrics.cost.toFixed(2), String(campaign.metrics.impressions), String(campaign.metrics.clicks),
      String(campaign.metrics.conversions), campaign.metrics.conversionValue.toFixed(2),
      campaign.metrics.cpa?.toFixed(2) ?? '', campaign.metrics.roas?.toFixed(2) ?? '',
    ]),
  ]);
}
