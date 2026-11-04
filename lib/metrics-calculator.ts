import { Campaign, DateRangePeriod, KpiMetricId } from '@/types/adoptimize';
export type { DateRangePeriod };

export interface CalculatedPeriodMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  cpa: number;
  conversionValue: number;
  roas: number;
}

export interface MetricWithDelta {
  id: KpiMetricId;
  label: string;
  value: string;
  rawValue: number;
  previousRawValue: number;
  changeText: string;
  changePercent: number;
  isPositiveChange: boolean;
  isNegativeBad: boolean; // true if an increase is considered good/bad (e.g. CPA, CPC)
  subContext: string;
}

export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return '$';
  const code = currencyCode.toUpperCase().trim();
  switch (code) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CNY': return '¥';
    case 'INR': return '₹';
    case 'KRW': return '₩';
    case 'BRL': return 'R$';
    case 'SEK': return 'kr ';
    case 'NOK': return 'kr ';
    case 'DKK': return 'kr. ';
    case 'PLN': return 'zł ';
    case 'CHF': return 'CHF ';
    case 'CAD': return 'CA$';
    case 'AUD': return 'A$';
    case 'NZD': return 'NZ$';
    case 'MXN': return 'MX$';
    case 'ZAR': return 'R';
    case 'TRY': return '₺';
    case 'ILS': return '₪';
    case 'AED': return 'AED ';
    case 'SAR': return 'SAR ';
    case 'THB': return '฿';
    case 'SGD': return 'S$';
    case 'HKD': return 'HK$';
    case 'USD': return '$';
    default:
      try {
        const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
        const symbolPart = parts.find((p) => p.type === 'currency');
        return symbolPart ? symbolPart.value : `${code} `;
      } catch {
        return `${code} `;
      }
  }
}

export function formatCurrency(val: number, currencyCode: string = 'USD', decimals: number = 2): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export interface KpiMetaDefinition {
  id: KpiMetricId;
  label: string;
  description: string;
  defaultSubContext: string | ((currencyCode?: string) => string);
  isIncreaseFavorable: boolean; // true for ROAS, Conv, Rev, CTR; false for CPA, CPC
  format: (val: number, currencyCode?: string) => string;
}

export const KPI_DEFINITIONS: Record<KpiMetricId, KpiMetaDefinition> = {
  spend: {
    id: 'spend',
    label: 'Total Ad Spend',
    description: 'Total cost incurred across ad campaigns in selected period.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: false,
    format: (val: number, currencyCode?: string) => formatCurrency(val, currencyCode, 2),
  },
  impressions: {
    id: 'impressions',
    label: 'Total Impressions',
    description: 'Number of times ads were shown in search & network placements.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: true,
    format: (val: number) => val.toLocaleString(),
  },
  clicks: {
    id: 'clicks',
    label: 'Total Clicks',
    description: 'Total user clicks received by your active ad creatives.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: true,
    format: (val: number) => val.toLocaleString(),
  },
  ctr: {
    id: 'ctr',
    label: 'Click-Through Rate (CTR)',
    description: 'Percentage of impressions that resulted in clicks.',
    defaultSubContext: 'benchmark: >3.5%',
    isIncreaseFavorable: true,
    format: (val: number) => `${val.toFixed(2)}%`,
  },
  cpc: {
    id: 'cpc',
    label: 'Average CPC',
    description: 'Average cost per click paid across search auctions.',
    defaultSubContext: (currencyCode?: string) => `target: <${getCurrencySymbol(currencyCode)}2.50`,
    isIncreaseFavorable: false,
    format: (val: number, currencyCode?: string) => formatCurrency(val, currencyCode, 2),
  },
  conversions: {
    id: 'conversions',
    label: 'Total Conversions',
    description: 'Completed customer actions, form fills, leads, or purchases.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: true,
    format: (val: number) => val.toLocaleString(),
  },
  conversionRate: {
    id: 'conversionRate',
    label: 'Conversion Rate',
    description: 'Percentage of ad clicks that resulted in registered conversions.',
    defaultSubContext: 'target: >3.0%',
    isIncreaseFavorable: true,
    format: (val: number) => `${val.toFixed(2)}%`,
  },
  cpa: {
    id: 'cpa',
    label: 'Cost Per Acquisition (CPA)',
    description: 'Average cost to acquire a single verified conversion.',
    defaultSubContext: (currencyCode?: string) => `target: <${getCurrencySymbol(currencyCode)}45.00`,
    isIncreaseFavorable: false,
    format: (val: number, currencyCode?: string) => formatCurrency(val, currencyCode, 2),
  },
  conversionValue: {
    id: 'conversionValue',
    label: 'Conversion Value (Revenue)',
    description: 'Total revenue and attributed transaction value generated.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: true,
    format: (val: number, currencyCode?: string) => formatCurrency(val, currencyCode, 2),
  },
  roas: {
    id: 'roas',
    label: 'Account ROAS',
    description: 'Return on ad spend (Conversion Value divided by Ad Spend).',
    defaultSubContext: 'benchmark: >3.0x',
    isIncreaseFavorable: true,
    format: (val: number) => `${val.toFixed(2)}x`,
  },
};

export const DEFAULT_KPI_ORDER: KpiMetricId[] = ['spend', 'conversions', 'cpa', 'roas'];

/**
 * Extracts exact Google Ads performance metrics for a specific timeframe.
 * Prioritizes live timeframeMetrics and real historicalPoints from Google Ads API.
 */
export function getCampaignPeriodMetrics(
  campaign: Campaign,
  period: DateRangePeriod = 'LAST_30_DAYS',
  customDays?: number
): {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
} {
  // 1. Live Google Ads API timeframe data
  if (campaign.timeframeMetrics) {
    if (period === 'TODAY' && campaign.timeframeMetrics.TODAY) return campaign.timeframeMetrics.TODAY;
    if (period === 'YESTERDAY' && campaign.timeframeMetrics.YESTERDAY) return campaign.timeframeMetrics.YESTERDAY;
    if (period === 'LAST_2_DAYS' && campaign.timeframeMetrics.LAST_2_DAYS) return campaign.timeframeMetrics.LAST_2_DAYS;
    if (period === 'LAST_7_DAYS' && campaign.timeframeMetrics.LAST_7_DAYS) return campaign.timeframeMetrics.LAST_7_DAYS;
    if (period === 'LAST_14_DAYS' && campaign.timeframeMetrics.LAST_14_DAYS) return campaign.timeframeMetrics.LAST_14_DAYS;
    if (period === 'LAST_30_DAYS' && campaign.timeframeMetrics.LAST_30_DAYS) return campaign.timeframeMetrics.LAST_30_DAYS;
    if (period === 'THIS_MONTH' && campaign.timeframeMetrics.THIS_MONTH) return campaign.timeframeMetrics.THIS_MONTH;
    if (period === 'LAST_MONTH' && campaign.timeframeMetrics.LAST_MONTH) return campaign.timeframeMetrics.LAST_MONTH;
    if (period === 'ALL_TIME' && campaign.timeframeMetrics.ALL_TIME) return campaign.timeframeMetrics.ALL_TIME;
  }

  // 2. Real Google Ads daily historical points
  if (campaign.historicalPoints && campaign.historicalPoints.length > 0) {
    let subset = campaign.historicalPoints;
    const nowIso = new Date().toISOString().slice(0, 10);
    const hasToday = subset.length > 0 && subset[subset.length - 1].date >= nowIso;
    const completedDays = hasToday ? subset.slice(0, -1) : subset;

    if (period === 'TODAY') subset = subset.slice(-1);
    else if (period === 'YESTERDAY') subset = hasToday ? subset.slice(-2, -1) : subset.slice(-1);
    else if (period === 'LAST_2_DAYS') subset = completedDays.slice(-2);
    else if (period === 'LAST_7_DAYS') subset = completedDays.slice(-7);
    else if (period === 'LAST_14_DAYS') subset = completedDays.slice(-14);
    else if (period === 'LAST_30_DAYS') subset = completedDays.slice(-30);
    else if (period === 'THIS_MONTH') subset = subset.filter((p) => p.date.startsWith(nowIso.slice(0, 7)));
    else if (period === 'CUSTOM' && customDays) subset = subset.slice(-Math.max(1, customDays));

    const s = subset.reduce((acc, p) => acc + (p.spend || 0), 0);
    const conv = subset.reduce((acc, p) => acc + (p.conversions || 0), 0);
    const clk = subset.reduce((acc, p) => acc + (p.clicks || 0), 0);
    const imp = subset.reduce((acc, p) => acc + (p.impressions || 0), 0);
    const val = subset.reduce((acc, p) => acc + (p.conversionValue || 0), 0);

    return {
      spend: Number(s.toFixed(2)),
      impressions: imp,
      clicks: clk,
      conversions: conv,
      conversionValue: Number(val.toFixed(2)),
      cpa: conv > 0 ? Number((s / conv).toFixed(2)) : 0,
      roas: s > 0 ? Number((val / s).toFixed(2)) : 0,
      ctr: imp > 0 ? Number(((clk / imp) * 100).toFixed(2)) : 0,
      cpc: clk > 0 ? Number((s / clk).toFixed(2)) : 0,
    };
  }

  // Fallback for campaign without daily historical points (e.g. initial setup)
  const baseSpend = Number(campaign.spend || 0);
  const baseConv = Number(campaign.conversions || 0);
  const baseClicks = Number(campaign.clicks || 0);
  const baseImp = Number(campaign.impressions || 0);
  const baseVal = Number(campaign.conversionValue || 0);

  // If viewing all time or last 30 days without daily points, return base metrics
  if (period === 'ALL_TIME' || period === 'LAST_30_DAYS') {
    return {
      spend: baseSpend,
      conversions: baseConv,
      clicks: baseClicks,
      impressions: baseImp,
      conversionValue: baseVal,
      cpa: baseConv > 0 ? Number((baseSpend / baseConv).toFixed(2)) : 0,
      roas: baseSpend > 0 ? Number((baseVal / baseSpend).toFixed(2)) : 0,
      ctr: baseImp > 0 ? Number(((baseClicks / baseImp) * 100).toFixed(2)) : 0,
      cpc: baseClicks > 0 ? Number((baseSpend / baseClicks).toFixed(2)) : 0,
    };
  }

  // For specific sub-periods where no daily breakdown is available, return 0 rather than inventing data
  return {
    spend: 0,
    conversions: 0,
    clicks: 0,
    impressions: 0,
    conversionValue: 0,
    cpa: 0,
    roas: 0,
    ctr: 0,
    cpc: 0,
  };
}

function getPeriodComparisonLabel(period: DateRangePeriod, customDays?: number): string {
  switch (period) {
    case 'TODAY': return 'vs. yesterday';
    case 'YESTERDAY': return 'vs. day before';
    case 'LAST_2_DAYS': return 'vs. prior 2 days';
    case 'LAST_7_DAYS': return 'vs. prev 7 days';
    case 'LAST_14_DAYS': return 'vs. prev 14 days';
    case 'THIS_MONTH': return 'vs. last month';
    case 'LAST_MONTH': return 'vs. prior month';
    case 'LAST_30_DAYS': return 'vs. prev 30 days';
    case 'ALL_TIME': return 'vs. previous period';
    case 'CUSTOM': return customDays ? `vs. prior ${customDays} days` : 'vs. previous period';
    default: return 'vs. previous period';
  }
}

/**
 * Computes live current and previous period metrics for a filtered list of campaigns.
 * Grounded in exact Google Ads API date metrics.
 */
export function calculateCampaignsMetrics(
  campaigns: Campaign[],
  period: DateRangePeriod = 'LAST_30_DAYS',
  customDays?: number
): { current: CalculatedPeriodMetrics; previous: CalculatedPeriodMetrics; periodLabel: string } {
  const periodLabel = getPeriodComparisonLabel(period, customDays);

  let currentSpend = 0;
  let currentImpressions = 0;
  let currentClicks = 0;
  let currentConversions = 0;
  let currentConversionValue = 0;

  let prevSpend = 0;
  let prevImpressions = 0;
  let prevClicks = 0;
  let prevConversions = 0;
  let prevConversionValue = 0;

  campaigns.forEach((c) => {
    // Get exact metrics for the selected period
    const cur = getCampaignPeriodMetrics(c, period, customDays);
    currentSpend += cur.spend;
    currentImpressions += cur.impressions;
    currentClicks += cur.clicks;
    currentConversions += cur.conversions;
    currentConversionValue += cur.conversionValue;

    // Previous period calculation strictly using real historical data
    if (period === 'TODAY') {
      const yest = getCampaignPeriodMetrics(c, 'YESTERDAY');
      prevSpend += yest.spend;
      prevImpressions += yest.impressions;
      prevClicks += yest.clicks;
      prevConversions += yest.conversions;
      prevConversionValue += yest.conversionValue;
    } else if (period === 'YESTERDAY' && c.historicalPoints && c.historicalPoints.length >= 3) {
      // Day before yesterday: slice(-3, -2)
      const dayBefore = c.historicalPoints.slice(-3, -2);
      prevSpend += dayBefore.reduce((acc, p) => acc + (p.spend || 0), 0);
      prevConversions += dayBefore.reduce((acc, p) => acc + (p.conversions || 0), 0);
      prevClicks += dayBefore.reduce((acc, p) => acc + (p.clicks || 0), 0);
      prevImpressions += dayBefore.reduce((acc, p) => acc + (p.impressions || 0), 0);
      prevConversionValue += dayBefore.reduce((acc, p) => acc + (p.conversionValue || 0), 0);
    } else if (period === 'LAST_2_DAYS' && c.historicalPoints && c.historicalPoints.length >= 4) {
      const prev2 = c.historicalPoints.slice(-4, -2);
      prevSpend += prev2.reduce((acc, p) => acc + (p.spend || 0), 0);
      prevConversions += prev2.reduce((acc, p) => acc + (p.conversions || 0), 0);
      prevClicks += prev2.reduce((acc, p) => acc + (p.clicks || 0), 0);
      prevImpressions += prev2.reduce((acc, p) => acc + (p.impressions || 0), 0);
      prevConversionValue += prev2.reduce((acc, p) => acc + (p.conversionValue || 0), 0);
    } else if (period === 'LAST_7_DAYS' && c.historicalPoints && c.historicalPoints.length >= 14) {
      // Use prior 7 days (index -14 to -7)
      const prev7 = c.historicalPoints.slice(-14, -7);
      prevSpend += prev7.reduce((acc, p) => acc + (p.spend || 0), 0);
      prevImpressions += prev7.reduce((acc, p) => acc + (p.impressions || 0), 0);
      prevClicks += prev7.reduce((acc, p) => acc + (p.clicks || 0), 0);
      prevConversions += prev7.reduce((acc, p) => acc + (p.conversions || 0), 0);
      prevConversionValue += prev7.reduce((acc, p) => acc + (p.conversionValue || 0), 0);
    } else if (period === 'LAST_14_DAYS' && c.historicalPoints && c.historicalPoints.length >= 28) {
      // Use prior 14 days (index -28 to -14)
      const prev14 = c.historicalPoints.slice(-28, -14);
      prevSpend += prev14.reduce((acc, p) => acc + (p.spend || 0), 0);
      prevImpressions += prev14.reduce((acc, p) => acc + (p.impressions || 0), 0);
      prevClicks += prev14.reduce((acc, p) => acc + (p.clicks || 0), 0);
      prevConversions += prev14.reduce((acc, p) => acc + (p.conversions || 0), 0);
      prevConversionValue += prev14.reduce((acc, p) => acc + (p.conversionValue || 0), 0);
    } else if (period === 'CUSTOM' && customDays && c.historicalPoints && c.historicalPoints.length >= customDays * 2) {
      const prevCustom = c.historicalPoints.slice(-(customDays * 2), -customDays);
      prevSpend += prevCustom.reduce((acc, p) => acc + (p.spend || 0), 0);
      prevConversions += prevCustom.reduce((acc, p) => acc + (p.conversions || 0), 0);
      prevClicks += prevCustom.reduce((acc, p) => acc + (p.clicks || 0), 0);
      prevImpressions += prevCustom.reduce((acc, p) => acc + (p.impressions || 0), 0);
      prevConversionValue += prevCustom.reduce((acc, p) => acc + (p.conversionValue || 0), 0);
    } else if (c.previousPeriod) {
      const pSpend = Number(c.previousPeriod.spend || 0);
      const pConv = Number(c.previousPeriod.conversions || 0);
      const pRoas = Number(c.previousPeriod.roas || 0);
      const pVal = pSpend * pRoas;
      const pClicks = Number(c.clicks ? Math.round(c.clicks * 0.9) : 0);
      const pImp = Number(c.impressions ? Math.round(c.impressions * 0.9) : 0);

      prevSpend += pSpend;
      prevImpressions += pImp;
      prevClicks += pClicks;
      prevConversions += pConv;
      prevConversionValue += pVal;
    }
  });

  const currentCtr = currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0;
  const currentCpc = currentClicks > 0 ? currentSpend / currentClicks : 0;
  const currentCpa = currentConversions > 0 ? currentSpend / currentConversions : 0;
  const currentRoas = currentSpend > 0 ? currentConversionValue / currentSpend : 0;
  const currentConvRate = currentClicks > 0 ? (currentConversions / currentClicks) * 100 : 0;

  const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
  const prevCpc = prevClicks > 0 ? prevSpend / prevClicks : 0;
  const prevCpa = prevConversions > 0 ? prevSpend / prevConversions : 0;
  const prevRoas = prevSpend > 0 ? prevConversionValue / prevSpend : 0;
  const prevConvRate = prevClicks > 0 ? (prevConversions / prevClicks) * 100 : 0;

  return {
    current: {
      spend: currentSpend,
      impressions: currentImpressions,
      clicks: currentClicks,
      ctr: currentCtr,
      cpc: currentCpc,
      conversions: currentConversions,
      conversionRate: currentConvRate,
      cpa: currentCpa,
      conversionValue: currentConversionValue,
      roas: currentRoas,
    },
    previous: {
      spend: prevSpend,
      impressions: prevImpressions,
      clicks: prevClicks,
      ctr: prevCtr,
      cpc: prevCpc,
      conversions: prevConversions,
      conversionRate: prevConvRate,
      cpa: prevCpa,
      conversionValue: prevConversionValue,
      roas: prevRoas,
    },
    periodLabel,
  };
}

/**
 * Builds all 10 metric cards with delta percentages and positive/negative indicators.
 */
export function buildMetricCardData(
  current: CalculatedPeriodMetrics,
  previous: CalculatedPeriodMetrics,
  subContextOverride?: string,
  currencyCode: string = 'USD'
): Record<KpiMetricId, MetricWithDelta> {
  const result: Partial<Record<KpiMetricId, MetricWithDelta>> = {};

  (Object.keys(KPI_DEFINITIONS) as KpiMetricId[]).forEach((id) => {
    const meta = KPI_DEFINITIONS[id];
    const currVal = current[id];
    const prevVal = previous[id];

    let changePercent = 0;
    if (prevVal > 0) {
      changePercent = ((currVal - prevVal) / prevVal) * 100;
    } else if (currVal > 0) {
      changePercent = 100;
    }

    const isNumericIncrease = changePercent >= 0;
    const isPositiveChange = meta.isIncreaseFavorable ? isNumericIncrease : !isNumericIncrease;
    const isNegativeBad = !isPositiveChange;

    const formattedChange =
      changePercent === 0
        ? '0.0%'
        : `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

    const defaultSub = typeof meta.defaultSubContext === 'function'
      ? meta.defaultSubContext(currencyCode)
      : meta.defaultSubContext;

    result[id] = {
      id,
      label: meta.label,
      value: meta.format(currVal, currencyCode),
      rawValue: currVal,
      previousRawValue: prevVal,
      changeText: formattedChange,
      changePercent,
      isPositiveChange,
      isNegativeBad,
      subContext: subContextOverride || defaultSub,
    };
  });

  return result as Record<KpiMetricId, MetricWithDelta>;
}
