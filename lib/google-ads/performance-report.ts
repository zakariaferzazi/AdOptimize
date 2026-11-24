import { invalidArgument } from '@/lib/mcp/errors';
import { validateAuditOptions } from './audit';
import { accountToday, previousPeriod, resolveDateRange, type GoogleAdsContext } from './gaql';
import { getAccountInfo, listCampaigns } from './reporting';

export async function runPerformanceReport(context: GoogleAdsContext, input: Record<string, unknown>) {
  const options = validateAuditOptions(input);
  const account = await getAccountInfo(context);
  if (account.isManager) throw invalidArgument('Select a client Google Ads account, not a manager account.');
  const dateRange = resolveDateRange(options, account.timeZone);
  const today = accountToday(account.timeZone).toISOString().slice(0, 10);
  if (dateRange.endDate > today) throw invalidArgument('The report period cannot include future dates in the account time zone.');
  const previousRange = previousPeriod(dateRange);
  const [current, previous] = await Promise.all([
    listCampaigns(context, { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 200 }),
    listCampaigns(context, { startDate: previousRange.startDate, endDate: previousRange.endDate, limit: 200 }),
  ]);
  const warnings = [
    'Performance covers non-removed campaigns only. Campaign status, type and daily budget describe current settings, not historical settings.',
    'Conversions and conversion values are reported by Google Ads and may change with attribution lag. Recorded value is not verified revenue or profit.',
    'Missing CPA or ROAS is shown as unavailable, not zero. Reads may use a shared 60-second cache.',
  ];
  if (current.omitted) warnings.push(`Campaign details show the top 200 by spend; ${current.omitted} additional campaigns are included in account totals only.`);
  if (dateRange.endDate === today) warnings.push('This period includes today and is incomplete.');
  return {
    account, dateRange, previousRange, generatedAt: new Date().toISOString(),
    totals: current.totals, previousTotals: previous.totals,
    campaigns: current.campaigns, totalCampaigns: current.totalCampaigns, warnings,
  };
}

export type PerformanceReport = Awaited<ReturnType<typeof runPerformanceReport>>;
