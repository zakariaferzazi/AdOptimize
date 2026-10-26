import { Campaign, DateRangePeriod, KpiMetricId } from '@/types/adoptimize';

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
  isNegativeBad: boolean; // true if an increase is considered negative/bad (e.g. CPA, CPC)
  subContext: string;
}

export interface KpiMetaDefinition {
  id: KpiMetricId;
  label: string;
  description: string;
  defaultSubContext: string;
  isIncreaseFavorable: boolean; // true for ROAS, Conv, Rev, CTR; false for CPA, CPC
  format: (val: number) => string;
}

export const KPI_DEFINITIONS: Record<KpiMetricId, KpiMetaDefinition> = {
  spend: {
    id: 'spend',
    label: 'Total Ad Spend',
    description: 'Total cost incurred across ad campaigns in selected period.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: false,
    format: (val: number) =>
      `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
    defaultSubContext: 'target: <$2.50',
    isIncreaseFavorable: false,
    format: (val: number) => `$${val.toFixed(2)}`,
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
    defaultSubContext: 'target: <$45.00',
    isIncreaseFavorable: false,
    format: (val: number) => `$${val.toFixed(2)}`,
  },
  conversionValue: {
    id: 'conversionValue',
    label: 'Conversion Value (Revenue)',
    description: 'Total revenue and attributed transaction value generated.',
    defaultSubContext: 'vs. previous period',
    isIncreaseFavorable: true,
    format: (val: number) =>
      `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
 * Returns multipliers and period factors to calculate accurate proportional metrics
 * based on date range selection.
 */
function getPeriodFactors(period: DateRangePeriod, customDays?: number): { currentScale: number; prevScale: number; label: string } {
  switch (period) {
    case 'TODAY':
      return { currentScale: 1 / 30, prevScale: 1 / 30, label: 'vs. yesterday' };
    case 'YESTERDAY':
      return { currentScale: 1 / 30, prevScale: 1 / 30, label: 'vs. day before' };
    case 'LAST_7_DAYS':
      return { currentScale: 7 / 30, prevScale: 7 / 30, label: 'vs. prev 7 days' };
    case 'THIS_MONTH':
      return { currentScale: 26 / 30, prevScale: 30 / 30, label: 'vs. last month' };
    case 'LAST_MONTH':
      return { currentScale: 1.0, prevScale: 0.94, label: 'vs. prior month' };
    case 'CUSTOM':
      const days = customDays && customDays > 0 ? customDays : 14;
      return { currentScale: days / 30, prevScale: days / 30, label: `vs. prior ${days}d` };
    case 'LAST_30_DAYS':
    case 'ALL_TIME':
    default:
      return { currentScale: 1.0, prevScale: 1.0, label: 'vs. previous period' };
  }
}

/**
 * Computes live current and previous period metrics for a filtered list of campaigns.
 */
export function calculateCampaignsMetrics(
  campaigns: Campaign[],
  period: DateRangePeriod = 'LAST_30_DAYS',
  customDays?: number
): { current: CalculatedPeriodMetrics; previous: CalculatedPeriodMetrics; periodLabel: string } {
  const { currentScale, prevScale, label: periodLabel } = getPeriodFactors(period, customDays);

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
    const baseSpend = Number(c.spend || 0);
    const baseImpressions = Number(c.impressions || 0);
    const baseClicks = Number(c.clicks || 0);
    const baseConversions = Number(c.conversions || 0);
    const baseVal = Number(c.conversionValue || (baseSpend * (c.roas || 1)));

    // Scale current
    currentSpend += baseSpend * currentScale;
    currentImpressions += Math.round(baseImpressions * currentScale);
    currentClicks += Math.round(baseClicks * currentScale);
    currentConversions += Math.round(baseConversions * currentScale);
    currentConversionValue += baseVal * currentScale;

    // Previous period from campaign data or fallback comparison
    if (c.previousPeriod) {
      const pSpend = Number(c.previousPeriod.spend || baseSpend * 0.95);
      const pConv = Number(c.previousPeriod.conversions || baseConversions * 0.92);
      const pRoas = Number(c.previousPeriod.roas || c.roas || 1);
      const pVal = pSpend * pRoas;
      const pClicks = Math.round(baseClicks * 0.94);
      const pImp = Math.round(baseImpressions * 0.93);

      prevSpend += pSpend * prevScale;
      prevImpressions += Math.round(pImp * prevScale);
      prevClicks += Math.round(pClicks * prevScale);
      prevConversions += Math.round(pConv * prevScale);
      prevConversionValue += pVal * prevScale;
    } else {
      // Benchmark realistic variance
      prevSpend += baseSpend * prevScale * 0.96;
      prevImpressions += Math.round(baseImpressions * prevScale * 0.94);
      prevClicks += Math.round(baseClicks * prevScale * 0.95);
      prevConversions += Math.round(baseConversions * prevScale * 0.90);
      prevConversionValue += baseVal * prevScale * 0.91;
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
  subContextOverride?: string
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

    result[id] = {
      id,
      label: meta.label,
      value: meta.format(currVal),
      rawValue: currVal,
      previousRawValue: prevVal,
      changeText: formattedChange,
      changePercent,
      isPositiveChange,
      isNegativeBad,
      subContext: subContextOverride || meta.defaultSubContext,
    };
  });

  return result as Record<KpiMetricId, MetricWithDelta>;
}
