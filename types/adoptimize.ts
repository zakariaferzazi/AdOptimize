export type CampaignType = 'SEARCH' | 'PERFORMANCE_MAX' | 'DISPLAY' | 'SHOPPING';
export type CampaignStatus = 'ENABLED' | 'PAUSED';
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OPPORTUNITY';

export interface PerformanceMetric {
  spend: number;
  conversions: number;
  conversionValue: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
}

export interface MetricComparison {
  current: PerformanceMetric;
  previous: PerformanceMetric;
  deltas: {
    spend: number;
    conversions: number;
    conversionValue: number;
    cpa: number;
    roas: number;
    ctr: number;
    cpc: number;
    impressions: number;
    clicks: number;
    conversionRate: number;
  };
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  budgetDaily: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  conversionValue: number;
  roas: number;
  conversionRate: number;
  healthStatus: HealthStatus;
  healthScore: number; // 0 to 100
  trendPoints: number[]; // sparkline data
  historicalPoints: { date: string; spend: number; conversions: number; cpa: number; roas: number }[];
  previousPeriod: {
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
  };
  keywordsCount: number;
  activeAdsCount: number;
  primaryGoal: 'MAXIMIZE_CONVERSIONS' | 'TARGET_CPA' | 'TARGET_ROAS' | 'MAXIMIZE_VALUE';
}

export interface Keyword {
  id: string;
  campaignId: string;
  campaignName: string;
  keyword: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  qualityScore: number; // 1 to 10
  status: 'ENABLED' | 'PAUSED';
  flag: 'HIGH_SPEND_ZERO_CONV' | 'TOP_PERFORMER' | 'RISING_CPA' | 'LOW_QUALITY_SCORE' | 'NORMAL';
}

export interface SearchTerm {
  id: string;
  campaignId: string;
  campaignName: string;
  searchTerm: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpa: number;
  recommendedAction: 'ADD_NEGATIVE' | 'ADD_KEYWORD' | 'MONITOR' | 'NONE';
  wastedSpendEstimate: number;
  intentRelevance: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'ADDED_AS_NEGATIVE' | 'DISMISSED';
}

export interface AdCreative {
  id: string;
  campaignId: string;
  headline1: string;
  headline2: string;
  headline3: string;
  description1: string;
  description2: string;
  finalUrl: string;
  adStrength: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT';
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  status: 'ENABLED' | 'PAUSED';
  aiCritique: string;
}

export interface BreakdownItem {
  name: string;
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
  sharePercent: number;
}

export interface AnomalyAlert {
  id: string;
  campaignId: string;
  campaignName: string;
  metric: 'CPA' | 'ROAS' | 'SPEND' | 'CONVERSIONS' | 'CTR' | 'CPC';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  whatChanged: string;
  whenChanged: string;
  whyItMatters: string;
  recommendedAction: string;
  detectedAt: string;
  resolved: boolean;
  autoExecutable: boolean;
}

export interface AIInsight {
  id: string;
  campaignId?: string;
  campaignName?: string;
  category: 'CRITICAL_ISSUE' | 'BUDGET_OPPORTUNITY' | 'PERFORMANCE_IMPROVEMENT' | 'WASTED_SPEND' | 'GROWTH_OPPORTUNITY' | 'ANOMALY';
  problem: string;
  whyItMatters: string;
  evidence: {
    metric: string;
    before: string;
    current: string;
    changePercent: string;
    context: string;
  };
  recommendedAction: string;
  expectedImpact: string;
  confidence: number; // 0-100
  status: 'NEW' | 'REVIEWED' | 'DISMISSED' | 'APPLIED';
  createdAt: string;
  actionPayload?: {
    type: 'BUDGET_CHANGE' | 'PAUSE_KEYWORD' | 'ADD_NEGATIVE_KEYWORD' | 'BID_STRATEGY_ADJUST';
    targetId: string;
    targetName: string;
    oldValue: string | number;
    newValue: string | number;
  };
}

export interface BudgetRecommendation {
  id: string;
  campaignFromId: string;
  campaignFromName: string;
  campaignToId: string;
  campaignToName: string;
  currentBudgetFrom: number;
  proposedBudgetFrom: number;
  currentBudgetTo: number;
  proposedBudgetTo: number;
  reallocatedAmount: number;
  reason: string;
  supportingMetrics: {
    fromRoas: number;
    toRoas: number;
    fromCpa: number;
    toCpa: number;
    fromSpend: number;
    toSpend: number;
  };
  estimatedMonthlyImpact: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  category: 'MONITOR' | 'RECOMMEND' | 'AUTO_OPTIMIZE';
  conditionDescription: string;
  conditionMetric: 'CPA' | 'ROAS' | 'SPEND_NO_CONV' | 'CPC_SPIKE' | 'CTR_DROP';
  conditionOperator: '>' | '<' | 'SPIKE_PERCENT';
  conditionValue: number;
  durationDays: number;
  actionType: 'NOTIFY' | 'RECOMMEND_BUDGET_CUT' | 'FLAG_KEYWORD' | 'PAUSE_SEARCH_TERM' | 'PAUSE_CAMPAIGN';
  actionDescription: string;
  enabled: boolean;
  requiresApproval: boolean;
  maxBudgetShiftLimitPercent: number; // safeguard e.g. 15%
  lastTriggeredAt?: string;
  executionCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  campaignId: string;
  campaignName: string;
  actionType: string;
  previousValue: string;
  newValue: string;
  reason: string;
  source: 'USER' | 'AUTOMATION_RULE' | 'AI_RECOMMENDATION';
  userOrSystem: string;
  status: 'EXECUTED' | 'REVERTED' | 'SCHEDULED';
  canRevert: boolean;
}

export interface GoogleAdsAccount {
  id: string;
  clientCustomerId: string;
  accountName: string;
  currency: string;
  timezone: string;
  isConnected: boolean;
  lastSyncAt: string;
  syncStatus: 'SYNCED' | 'SYNCING' | 'ERROR' | 'IDLE';
  isDemo: boolean;
  totalCampaignsCount: number;
  monthlySpendCap: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citedCampaigns?: string[];
  suggestedAction?: {
    label: string;
    type: string;
    targetId?: string;
  };
}

export type DateRangePeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'PREVIOUS_PERIOD' | 'CUSTOM';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

export interface SubscriptionPlan {
  id: 'FREE' | 'PRO' | 'BUSINESS';
  name: string;
  description: string;
  monthlyPrice: number;
  annualPriceMonthly: number;
  badge?: string;
  popular?: boolean;
  accountLimit: string;
  spendLimit: string;
  features: string[];
}
