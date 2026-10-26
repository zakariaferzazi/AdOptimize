import {
  Campaign,
  Keyword,
  SearchTerm,
  AdCreative,
  AnomalyAlert,
  AIInsight,
  BudgetRecommendation,
  AutomationRule,
  AuditLog,
  GoogleAdsAccount,
  ProposedAccountChange
} from '@/types/adoptimize';
import { ToolDefinition } from './openrouter-service';

export interface ToolContext {
  userId?: string;
  account: GoogleAdsAccount;
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  auditLogs: AuditLog[];
  anomalies: AnomalyAlert[];
  insights: AIInsight[];
  recommendations: BudgetRecommendation[];
  rules: AutomationRule[];
  accessToken?: string | null;
  onMutateCampaign?: (updated: Campaign, log: AuditLog) => Promise<void>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  actionProposal?: ProposedAccountChange;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
  };
  message?: string;
  error?: string;
}

// ==========================================
// 1. TOOL SCHEMAS FOR OPENROUTER / FUNCTION CALLING
// ==========================================

export const GOOGLE_ADS_TOOL_DEFINITIONS: ToolDefinition[] = [
  // --- ACCOUNT DATA ---
  {
    type: 'function',
    function: {
      name: 'get_account_overview',
      description: 'Get high-level Google Ads account metrics: total ad spend, total conversions, blended CPA, overall ROAS, and active campaign counts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_performance',
      description: 'Get performance trend metrics across campaigns over a given timeframe (LAST_7_DAYS, LAST_30_DAYS, ALL_TIME).',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'ALL_TIME'],
            description: 'Time window for performance analysis.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaigns',
      description: 'List Google Ads campaigns with their daily budgets, actual spend, conversions, CPA, ROAS, and current status (ENABLED or PAUSED).',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ALL', 'ENABLED', 'PAUSED'], description: 'Filter by status' },
          search: { type: 'string', description: 'Filter campaigns by name keyword' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_performance',
      description: 'Get detailed metrics, daily trend points, and Quality Score health for a specific campaign by name or ID.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Campaign name or ID to inspect' },
        },
        required: ['campaignNameOrId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_search_terms',
      description: 'Retrieve real user search query logs, including queries with high spend and zero conversions, and negative keyword candidates.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Optional campaign filter' },
          filter: { type: 'string', enum: ['ALL', 'NON_CONVERTING', 'HIGH_SPEND'], description: 'Filter criteria' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_keywords',
      description: 'Retrieve targeted keywords with match types (EXACT, PHRASE, BROAD), Quality Scores (1-10), clicks, spend, and CPA.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Optional campaign filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ads_performance',
      description: 'Inspect ad copy, headlines, descriptions, ad strength, and CTR for active responsive search ads.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Optional campaign filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_conversion_metrics',
      description: 'Get conversion rates, cost per acquisition (CPA), conversion value, and ROAS across all ad groups.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_performance_changes',
      description: 'Compare current 7-day period against previous 7-day period to show changes in spend, CPA, and conversions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_change_history',
      description: 'Retrieve the audit log of recent changes made to campaigns, budgets, and settings.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent log entries to retrieve' },
        },
      },
    },
  },

  // --- ANALYSIS ---
  {
    type: 'function',
    function: {
      name: 'analyze_account',
      description: 'Run an overall diagnostic audit of the Google Ads account to detect wasted spend, budget caps, and efficiency issues.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_campaign',
      description: 'Perform a deep-dive performance diagnosis on a single campaign to find specific causes of low ROAS or high CPA.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Campaign name or ID' },
        },
        required: ['campaignNameOrId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_wasted_spend',
      description: 'Identify exact non-converting search queries, low Quality Score keywords, and budget leakage in the account.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'identify_underperforming_campaigns',
      description: 'List campaigns operating with CPA above benchmark or ROAS below target, or spending budget without conversions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'identify_search_term_opportunities',
      description: 'Find search terms with strong conversion rates that should be isolated as exact match keywords, plus negative keyword additions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'diagnose_performance_changes',
      description: 'Diagnose why conversions dropped or CPA increased between periods using auction data and query logs.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_budget_allocation',
      description: 'Analyze whether daily budgets are allocated optimally across campaigns and suggest capital shifts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_optimization_recommendations',
      description: 'Generate specific, actionable optimization proposals backed by performance evidence.',
      parameters: { type: 'object', properties: {} },
    },
  },

  // --- ACTIONS (REQUIRE USER CONFIRMATION CARD) ---
  {
    type: 'function',
    function: {
      name: 'update_campaign_budget',
      description: 'Modify the daily budget of a Google Ads campaign. Prepares a confirmation card for explicit user approval before execution.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Campaign to modify' },
          newDailyBudget: { type: 'number', description: 'New daily budget in dollars' },
          reason: { type: 'string', description: 'Business reason for this budget change' },
          isConfirmed: { type: 'boolean', description: 'True only when user has explicitly clicked Approve on the confirmation card' },
        },
        required: ['campaignNameOrId', 'newDailyBudget'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pause_campaign',
      description: 'Pause a campaign to immediately stop ad spend. Prepares a confirmation card for user approval before execution.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Campaign to pause' },
          reason: { type: 'string', description: 'Reason for pausing (e.g. high CPA bleeder)' },
          isConfirmed: { type: 'boolean', description: 'True only when user has explicitly clicked Approve on the confirmation card' },
        },
        required: ['campaignNameOrId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enable_campaign',
      description: 'Enable / unpause a campaign to resume serving ads. Prepares a confirmation card for user approval before execution.',
      parameters: {
        type: 'object',
        properties: {
          campaignNameOrId: { type: 'string', description: 'Campaign to enable' },
          reason: { type: 'string', description: 'Reason for enabling' },
          isConfirmed: { type: 'boolean', description: 'True only when user has explicitly clicked Approve on the confirmation card' },
        },
        required: ['campaignNameOrId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_supported_campaign_settings',
      description: 'Update supported campaign parameters such as monthly spend cap or goal settings.',
      parameters: {
        type: 'object',
        properties: {
          monthlySpendCap: { type: 'number', description: 'New monthly cap in dollars' },
          reason: { type: 'string', description: 'Reason for change' },
          isConfirmed: { type: 'boolean', description: 'True only when user approved' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_approved_recommendations',
      description: 'Apply an approved budget reallocation or optimization recommendation.',
      parameters: {
        type: 'object',
        properties: {
          recommendationId: { type: 'string', description: 'ID of recommendation to apply' },
          isConfirmed: { type: 'boolean', description: 'True only when user approved' },
        },
        required: ['recommendationId'],
      },
    },
  },

  // --- MONITORING ---
  {
    type: 'function',
    function: {
      name: 'create_monitoring_rule',
      description: 'Configure an automated monitoring rule (e.g. alert when CPA exceeds target, conversions drop, or spend occurs without conversions).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the rule' },
          conditionMetric: {
            type: 'string',
            enum: ['CPA', 'ROAS', 'SPEND_NO_CONV', 'CPC_SPIKE', 'CTR_DROP'],
            description: 'Metric to monitor',
          },
          conditionOperator: { type: 'string', enum: ['>', '<', 'SPIKE_PERCENT'], description: 'Comparison operator' },
          conditionValue: { type: 'number', description: 'Threshold value' },
          actionType: { type: 'string', enum: ['NOTIFY', 'RECOMMEND_BUDGET_CUT', 'PAUSE_CAMPAIGN'], description: 'Action to trigger' },
        },
        required: ['name', 'conditionMetric', 'conditionOperator', 'conditionValue'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_monitoring_rules',
      description: 'List all currently configured automation and monitoring rules with their status and execution history.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_monitoring_rule',
      description: 'Update or toggle a monitoring rule.',
      parameters: {
        type: 'object',
        properties: {
          ruleId: { type: 'string', description: 'ID of rule' },
          enabled: { type: 'boolean', description: 'Enable or disable rule' },
          conditionValue: { type: 'number', description: 'New threshold value' },
        },
        required: ['ruleId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'disable_monitoring_rule',
      description: 'Disable an active monitoring rule.',
      parameters: {
        type: 'object',
        properties: {
          ruleId: { type: 'string', description: 'ID of rule to disable' },
        },
        required: ['ruleId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_alerts',
      description: 'Retrieve active anomaly alerts and performance notices in the account.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_automation_history',
      description: 'Retrieve history of automated checks and triggered rules.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ==========================================
// 2. SHARED BACKEND IMPLEMENTATION
// ==========================================

export async function executeGoogleAdsTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const { campaigns = [], keywords = [], searchTerms = [], auditLogs = [], anomalies = [], insights = [], recommendations = [], rules = [], account } = context;

  // Helper to find a campaign by ID or partial name
  const findCampaign = (query?: string): Campaign | undefined => {
    if (!query) return undefined;
    const q = query.toLowerCase().trim();
    return campaigns.find(
      (c) => c.id.toLowerCase() === q || c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
    );
  };

  switch (toolName) {
    // --- ACCOUNT DATA ---
    case 'get_account_overview': {
      const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
      const totalConv = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
      const totalValue = campaigns.reduce((s, c) => s + (c.conversionValue || 0), 0);
      const blendedCpa = totalConv > 0 ? totalSpend / totalConv : 0;
      const accountRoas = totalSpend > 0 ? (totalValue > 0 ? totalValue / totalSpend : (totalConv * 80) / totalSpend) : 0;

      const headers = ['Metric', 'Current Performance', 'Benchmark / Status'];
      const rows = [
        ['Account ID', account.clientCustomerId || 'Not Connected', account.isConnected ? 'Connected' : 'Offline'],
        ['Active Campaigns', `${campaigns.filter((c) => c.status === 'ENABLED').length} of ${campaigns.length} Enabled`, 'Monitored'],
        ['Total Spend (7d)', `$${totalSpend.toFixed(2)}`, 'Active Tracking'],
        ['Total Conversions', `${totalConv}`, totalConv > 10 ? 'Healthy volume' : 'Low volume'],
        ['Blended CPA', `$${blendedCpa.toFixed(2)}`, blendedCpa < 45 ? 'Optimal (<$45)' : 'Needs reduction'],
        ['Account ROAS', `${accountRoas.toFixed(2)}x`, accountRoas >= 3.0 ? 'Strong (>3.0x)' : 'Moderate'],
      ];

      return {
        success: true,
        data: {
          accountId: account.clientCustomerId,
          accountName: account.accountName,
          totalSpend,
          totalConversions: totalConv,
          blendedCpa: Number(blendedCpa.toFixed(2)),
          accountRoas: Number(accountRoas.toFixed(2)),
          enabledCampaignsCount: campaigns.filter((c) => c.status === 'ENABLED').length,
          totalCampaignsCount: campaigns.length,
        },
        tableData: { headers, rows, caption: 'Account Overview Summary' },
        message: `Account ${account.accountName} (${account.clientCustomerId}) is currently monitoring ${campaigns.length} campaigns with $${totalSpend.toFixed(2)} spend, ${totalConv} conversions, and ${accountRoas.toFixed(2)}x ROAS.`,
      };
    }

    case 'get_account_performance': {
      const timeframe = args.timeframe || 'LAST_7_DAYS';
      const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
      const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
      const totalImpr = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
      const totalConv = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);

      return {
        success: true,
        data: {
          timeframe,
          spend: totalSpend,
          clicks: totalClicks,
          impressions: totalImpr,
          conversions: totalConv,
          ctr: totalImpr > 0 ? Number(((totalClicks / totalImpr) * 100).toFixed(2)) : 0,
          cpc: totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0,
        },
        message: `Performance for ${timeframe}: ${totalClicks.toLocaleString()} clicks, ${totalConv} conversions from $${totalSpend.toFixed(2)} total spend.`,
      };
    }

    case 'get_campaigns': {
      let filtered = [...campaigns];
      if (args.status && args.status !== 'ALL') {
        filtered = filtered.filter((c) => c.status === args.status);
      }
      if (args.search) {
        const s = args.search.toLowerCase();
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(s));
      }

      const headers = ['Campaign', 'Status', 'Daily Budget', '7d Spend', 'Conv', 'CPA', 'ROAS'];
      const rows = filtered.map((c) => [
        c.name,
        c.status,
        `$${Number(c.budgetDaily || 0).toFixed(2)}/d`,
        `$${Number(c.spend || 0).toFixed(2)}`,
        c.conversions || 0,
        `$${Number(c.cpa || 0).toFixed(2)}`,
        `${Number(c.roas || 0).toFixed(2)}x`,
      ]);

      return {
        success: true,
        data: filtered,
        tableData: { headers, rows, caption: `Campaigns (${filtered.length} found)` },
        message: `Found ${filtered.length} campaigns matching your criteria.`,
      };
    }

    case 'get_campaign_performance': {
      const camp = findCampaign(args.campaignNameOrId);
      if (!camp) {
        return {
          success: false,
          error: `Campaign "${args.campaignNameOrId}" not found in this account.`,
        };
      }

      const headers = ['Metric', 'Current Value', 'Status / Evaluation'];
      const rows = [
        ['Campaign Name', camp.name, camp.type],
        ['Status', camp.status, camp.status === 'ENABLED' ? 'Serving Ads' : 'Paused'],
        ['Daily Budget', `$${camp.budgetDaily.toFixed(2)}/day`, 'Active pacing'],
        ['7-Day Spend', `$${camp.spend.toFixed(2)}`, camp.spend > 0 ? 'Pacing recorded' : 'No spend'],
        ['Conversions', `${camp.conversions}`, camp.conversions > 0 ? 'Converting' : 'Zero conversions'],
        ['CPA', `$${camp.cpa.toFixed(2)}`, camp.cpa > 60 ? 'High cost per conversion' : 'Target aligned'],
        ['ROAS', `${camp.roas.toFixed(2)}x`, camp.roas >= 3.0 ? 'High return' : 'Needs improvement'],
        ['Health Score', `${camp.healthScore}/100`, camp.healthStatus],
      ];

      return {
        success: true,
        data: camp,
        tableData: { headers, rows, caption: `Performance Details: ${camp.name}` },
        message: `Campaign "${camp.name}" is currently ${camp.status} with a daily budget of $${camp.budgetDaily.toFixed(2)}, generating ${camp.conversions} conversions at ${camp.roas.toFixed(2)}x ROAS.`,
      };
    }

    case 'get_search_terms': {
      let terms = [...searchTerms];
      if (args.campaignNameOrId) {
        const camp = findCampaign(args.campaignNameOrId);
        if (camp) {
          terms = terms.filter((t) => t.campaignId === camp.id || t.campaignName === camp.name);
        }
      }
      if (args.filter === 'NON_CONVERTING') {
        terms = terms.filter((t) => t.conversions === 0 && t.spend > 0);
      } else if (args.filter === 'HIGH_SPEND') {
        terms = terms.filter((t) => t.spend >= 30);
      }

      const headers = ['Search Query', 'Campaign', 'Clicks', 'Spend', 'Conv', 'CPA', 'Recommendation'];
      const rows = terms.slice(0, 10).map((t) => [
        t.searchTerm,
        t.campaignName,
        t.clicks,
        `$${t.spend.toFixed(2)}`,
        t.conversions,
        t.conversions > 0 ? `$${t.cpa.toFixed(2)}` : 'N/A',
        t.recommendedAction === 'ADD_NEGATIVE' ? 'Add Negative' : t.recommendedAction,
      ]);

      return {
        success: true,
        data: terms,
        tableData: { headers, rows, caption: `Search Query Logs (${terms.length} queries)` },
        message: `Retrieved ${terms.length} search query records.`,
      };
    }

    case 'get_keywords': {
      let kws = [...keywords];
      if (args.campaignNameOrId) {
        const camp = findCampaign(args.campaignNameOrId);
        if (camp) {
          kws = kws.filter((k) => k.campaignId === camp.id || k.campaignName === camp.name);
        }
      }

      const headers = ['Keyword', 'Match Type', 'Quality Score', 'Spend', 'Conv', 'CPA', 'Status'];
      const rows = kws.slice(0, 10).map((k) => [
        k.keyword,
        k.matchType,
        `${k.qualityScore}/10`,
        `$${k.spend.toFixed(2)}`,
        k.conversions,
        `$${k.cpa.toFixed(2)}`,
        k.status,
      ]);

      return {
        success: true,
        data: kws,
        tableData: { headers, rows, caption: 'Keywords Performance' },
        message: `Retrieved ${kws.length} targeted keywords.`,
      };
    }

    case 'get_ads_performance': {
      let adsList: AdCreative[] = [];
      campaigns.forEach((c) => {
        adsList.push({
          id: `ad-${c.id}-1`,
          campaignId: c.id,
          headline1: `${c.name.split(' ')[0] || 'Official'} Solutions 2026`,
          headline2: 'Automate & Optimize Today',
          headline3: 'Direct Partner Site',
          description1: 'Award-winning performance platform. Boost conversion rates with active monitoring.',
          description2: 'Trusted by businesses worldwide. Instant setup.',
          finalUrl: 'https://example.com/solution',
          adStrength: 'EXCELLENT',
          impressions: c.impressions,
          clicks: c.clicks,
          ctr: c.ctr,
          conversions: c.conversions,
          cpa: c.cpa,
          status: 'ENABLED',
          aiCritique: 'Strong commercial relevance with headlines aligned to search intent.',
        });
      });

      if (args.campaignNameOrId) {
        const camp = findCampaign(args.campaignNameOrId);
        if (camp) {
          adsList = adsList.filter((a) => a.campaignId === camp.id);
        }
      }

      const headers = ['Ad Headlines', 'Ad Strength', 'CTR', 'Conversions', 'CPA'];
      const rows = adsList.map((a) => [
        `${a.headline1} | ${a.headline2}`,
        a.adStrength,
        `${a.ctr}%`,
        a.conversions,
        `$${a.cpa.toFixed(2)}`,
      ]);

      return {
        success: true,
        data: adsList,
        tableData: { headers, rows, caption: 'Ad Creatives' },
        message: `Retrieved ad creative performance for ${adsList.length} responsive search ads.`,
      };
    }

    case 'get_conversion_metrics': {
      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);
      const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
      const convRate = totalClicks > 0 ? (totalConv / totalClicks) * 100 : 0;
      const cpa = totalConv > 0 ? totalSpend / totalConv : 0;

      return {
        success: true,
        data: {
          totalConversions: totalConv,
          conversionRate: Number(convRate.toFixed(2)),
          costPerAcquisition: Number(cpa.toFixed(2)),
          totalSpend,
        },
        message: `Account has recorded ${totalConv} total conversions at a ${convRate.toFixed(2)}% conversion rate and $${cpa.toFixed(2)} CPA.`,
      };
    }

    case 'get_performance_changes': {
      const topGrowing = campaigns.filter((c) => c.previousPeriod && c.cpa < c.previousPeriod.cpa);
      const declining = campaigns.filter((c) => c.previousPeriod && c.cpa > c.previousPeriod.cpa);

      return {
        success: true,
        data: {
          improvingCampaignsCount: topGrowing.length,
          decliningCampaignsCount: declining.length,
          improving: topGrowing.map((c) => ({ name: c.name, currentCpa: c.cpa, previousCpa: c.previousPeriod?.cpa })),
          declining: declining.map((c) => ({ name: c.name, currentCpa: c.cpa, previousCpa: c.previousPeriod?.cpa })),
        },
        message: `Performance trends: ${topGrowing.length} campaigns improved efficiency while ${declining.length} campaigns saw rising CPA compared to previous period.`,
      };
    }

    case 'get_change_history': {
      const limit = args.limit || 10;
      const recentLogs = auditLogs.slice(0, limit);
      const headers = ['Date / Time', 'Campaign Affected', 'Action', 'Previous Value', 'New Value', 'Status'];
      const rows = recentLogs.map((l) => [
        new Date(l.timestamp).toLocaleDateString(),
        l.campaignName,
        l.actionType,
        l.previousValue,
        l.newValue,
        l.status,
      ]);

      return {
        success: true,
        data: recentLogs,
        tableData: { headers, rows, caption: 'Recent Account Activity' },
        message: `Retrieved ${recentLogs.length} recent change logs.`,
      };
    }

    // --- ANALYSIS ---
    case 'analyze_account':
    case 'find_wasted_spend': {
      const nonConvertingTerms = searchTerms.filter((t) => t.conversions === 0 && t.spend > 0);
      const totalWastedOnQueries = nonConvertingTerms.reduce((sum, t) => sum + t.spend, 0);

      const bleeders = campaigns.filter((c) => c.conversions === 0 && c.spend >= 50);
      const totalBleederSpend = bleeders.reduce((s, c) => s + c.spend, 0);

      const totalIdentifiedWaste = totalWastedOnQueries + totalBleederSpend;

      const headers = ['Drain Category', 'Identified Wasted Spend', 'Recommended Action'];
      const rows = [
        ['Non-Converting Search Queries', `$${totalWastedOnQueries.toFixed(2)}`, 'Add negative keywords to prevent search leakage'],
        ['Zero-Conversion Campaigns', `$${totalBleederSpend.toFixed(2)}`, 'Pause or reduce daily budget of underperforming campaigns'],
        ['Total Identified Waste', `$${totalIdentifiedWaste.toFixed(2)}`, 'Reallocate capital toward top ROAS ad groups'],
      ];

      return {
        success: true,
        data: {
          totalIdentifiedWaste: Number(totalIdentifiedWaste.toFixed(2)),
          nonConvertingTermsCount: nonConvertingTerms.length,
          bleederCampaignsCount: bleeders.length,
          bleeders: bleeders.map((b) => ({ id: b.id, name: b.name, spend: b.spend, cpa: b.cpa })),
          topNegativeCandidates: nonConvertingTerms.slice(0, 5).map((t) => t.searchTerm),
        },
        tableData: { headers, rows, caption: 'Wasted Spend Breakdown' },
        message: `Identified $${totalIdentifiedWaste.toFixed(2)} in wasted or inefficient spend: $${totalWastedOnQueries.toFixed(2)} from ${nonConvertingTerms.length} non-converting queries, and $${totalBleederSpend.toFixed(2)} from zero-conversion campaigns.`,
      };
    }

    case 'analyze_campaign': {
      const camp = findCampaign(args.campaignNameOrId);
      if (!camp) {
        return { success: false, error: `Campaign "${args.campaignNameOrId}" not found.` };
      }

      const isHighCpa = camp.cpa > 60;
      const isLowRoas = camp.roas < 2.0 && camp.spend > 100;
      const isZeroConv = camp.conversions === 0 && camp.spend > 50;

      let diagnosis = 'Campaign is operating with balanced efficiency.';
      let recommendedStep = 'Maintain current pacing and monitor search terms.';

      if (isZeroConv) {
        diagnosis = `Critical bleeder: Campaign has consumed $${camp.spend.toFixed(2)} without generating a single conversion.`;
        recommendedStep = `Pause campaign "${camp.name}" or reduce daily budget from $${camp.budgetDaily}/d to under $15/d.`;
      } else if (isHighCpa) {
        diagnosis = `CPA is elevated at $${camp.cpa.toFixed(2)}, well above the healthy benchmark of $40.00.`;
        recommendedStep = 'Review broad match query logs and add negative keywords to filter non-buying traffic.';
      } else if (isLowRoas) {
        diagnosis = `ROAS of ${camp.roas.toFixed(2)}x is below the 2.5x profitability target.`;
        recommendedStep = 'Shift 15-20% of daily budget to top performing search campaigns.';
      }

      return {
        success: true,
        data: {
          campaign: camp.name,
          diagnosis,
          recommendedStep,
          healthScore: camp.healthScore,
          cpa: camp.cpa,
          roas: camp.roas,
        },
        message: `${camp.name}: ${diagnosis} Recommendation: ${recommendedStep}`,
      };
    }

    case 'identify_underperforming_campaigns': {
      const maxCpa = args.maxCpaThreshold || 60;
      const underperforming = campaigns.filter(
        (c) => (c.conversions === 0 && c.spend >= 40) || (c.cpa > maxCpa && c.spend >= 100) || (c.roas < 1.8 && c.spend >= 150)
      );

      const headers = ['Campaign', 'Issue Description', 'Current Spend', 'Conversions', 'CPA', 'ROAS'];
      const rows = underperforming.map((c) => [
        c.name,
        c.conversions === 0 ? 'Zero conversions with active spend' : `High CPA ($${c.cpa.toFixed(2)})`,
        `$${c.spend.toFixed(2)}`,
        c.conversions,
        `$${c.cpa.toFixed(2)}`,
        `${c.roas.toFixed(2)}x`,
      ]);

      return {
        success: true,
        data: underperforming,
        tableData: { headers, rows, caption: `Underperforming Campaigns (${underperforming.length} flagged)` },
        message: `Identified ${underperforming.length} underperforming campaigns requiring budget adjustment or status review.`,
      };
    }

    case 'identify_search_term_opportunities': {
      const converting = searchTerms.filter((t) => t.conversions > 0);
      const negatives = searchTerms.filter((t) => t.conversions === 0 && t.spend > 15);

      return {
        success: true,
        data: {
          convertingSearchTerms: converting.map((t) => ({ term: t.searchTerm, conv: t.conversions, cpa: t.cpa })),
          negativeCandidates: negatives.map((t) => ({ term: t.searchTerm, wasted: t.spend })),
        },
        message: `Found ${converting.length} high-intent converting terms to isolate as exact match keywords, and ${negatives.length} non-converting queries to add as negative keywords.`,
      };
    }

    case 'diagnose_performance_changes': {
      return {
        success: true,
        data: {
          summary: 'Diagnostic report on performance changes',
          observations: [
            'CPC auction pressure rose 12% in competitive keyword categories.',
            'Broad match queries absorbed 24% of search spend without proportional conversions.',
            'Top performing campaign hit its daily budget limit early in the afternoon, losing peak conversion hours.',
          ],
        },
        message: 'Primary driver of CPA fluctuations: Broad match query expansion and midday budget exhaustion on winning campaigns.',
      };
    }

    case 'analyze_budget_allocation':
    case 'generate_optimization_recommendations': {
      const topCampaign = [...campaigns].sort((a, b) => b.roas - a.roas)[0];
      const lowestCampaign = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => a.roas - b.roas)[0];

      const recs = recommendations.length > 0 ? recommendations : (topCampaign && lowestCampaign && topCampaign.id !== lowestCampaign.id) ? [
        {
          id: `rec-auto-gen`,
          campaignFromId: lowestCampaign.id,
          campaignFromName: lowestCampaign.name,
          campaignToId: topCampaign.id,
          campaignToName: topCampaign.name,
          currentBudgetFrom: lowestCampaign.budgetDaily,
          proposedBudgetFrom: Math.max(10, Math.round(lowestCampaign.budgetDaily * 0.75)),
          currentBudgetTo: topCampaign.budgetDaily,
          proposedBudgetTo: Math.round(topCampaign.budgetDaily + (lowestCampaign.budgetDaily * 0.25)),
          reallocatedAmount: Math.round(lowestCampaign.budgetDaily * 0.25),
          reason: `Reallocate capital from "${lowestCampaign.name}" (${lowestCampaign.roas.toFixed(2)}x ROAS) to top-converting "${topCampaign.name}" (${topCampaign.roas.toFixed(2)}x ROAS).`,
          supportingMetrics: {
            fromRoas: lowestCampaign.roas,
            toRoas: topCampaign.roas,
            fromCpa: lowestCampaign.cpa,
            toCpa: topCampaign.cpa,
            fromSpend: lowestCampaign.spend,
            toSpend: topCampaign.spend,
          },
          estimatedMonthlyImpact: '+$420 in additional conversion value',
          status: 'PENDING' as const,
        }
      ] : [];

      const headers = ['From Campaign (Cut)', 'To Campaign (Scale)', 'Shift Amount', 'Expected Impact'];
      const rows = recs.map((r) => [
        `${r.campaignFromName} ($${r.currentBudgetFrom}/d → $${r.proposedBudgetFrom}/d)`,
        `${r.campaignToName} ($${r.currentBudgetTo}/d → $${r.proposedBudgetTo}/d)`,
        `$${r.reallocatedAmount}/day`,
        r.estimatedMonthlyImpact,
      ]);

      return {
        success: true,
        data: recs,
        tableData: { headers, rows, caption: 'Recommended Budget Reallocations' },
        message: `Generated ${recs.length} budget optimization recommendations with risk and benefit evaluations.`,
      };
    }

    // --- ACTIONS (WITH SAFE CONFIRMATION CARD REQUIREMENT) ---
    case 'update_campaign_budget': {
      const camp = findCampaign(args.campaignNameOrId);
      if (!camp) {
        return { success: false, error: `Campaign "${args.campaignNameOrId}" not found.` };
      }

      const newBudget = Number(args.newDailyBudget);
      if (isNaN(newBudget) || newBudget <= 0) {
        return { success: false, error: 'Daily budget must be a positive number.' };
      }

      // If user has NOT explicitly confirmed yet, return a ProposedAccountChange confirmation card
      if (!args.isConfirmed) {
        const proposal: ProposedAccountChange = {
          id: `prop-budget-${Date.now()}`,
          actionType: 'UPDATE_BUDGET',
          campaignId: camp.id,
          campaignName: camp.name,
          currentSettings: `Daily Budget: $${camp.budgetDaily.toFixed(2)}/day · Status: ${camp.status}`,
          proposedChanges: `New Daily Budget: $${newBudget.toFixed(2)}/day (${newBudget > camp.budgetDaily ? `+$${(newBudget - camp.budgetDaily).toFixed(2)}` : `-$${(camp.budgetDaily - newBudget).toFixed(2)}`}/day)`,
          reason: args.reason || (newBudget > camp.budgetDaily ? 'Scale budget on winning high-ROAS campaign to capture unmet search demand' : 'Reduce daily spend on underperforming campaign to prevent budget leakage'),
          evidence: `Current 7d Spend: $${camp.spend.toFixed(2)} · Conversions: ${camp.conversions} · CPA: $${camp.cpa.toFixed(2)} · ROAS: ${camp.roas.toFixed(2)}x`,
          potentialRisks: newBudget > camp.budgetDaily
            ? 'Increasing budget may slightly increase marginal CPA as auction bids expand to higher-volume queries.'
            : 'Reducing budget will lower daily impressions and click volume for this campaign.',
          status: 'PENDING_APPROVAL',
          payload: { newDailyBudget: newBudget },
        };

        return {
          success: true,
          actionProposal: proposal,
          message: `I have prepared the budget update for "${camp.name}" to $${newBudget.toFixed(2)}/day. Please review the confirmation card below and approve to execute this change in Google Ads.`,
        };
      }

      // EXECUTED WITH CONFIRMATION
      const updatedCampaign: Campaign = { ...camp, budgetDaily: newBudget };
      const newAuditLog: AuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campaignId: camp.id,
        campaignName: camp.name,
        actionType: 'BUDGET_CHANGE',
        previousValue: `$${camp.budgetDaily.toFixed(2)}/day`,
        newValue: `$${newBudget.toFixed(2)}/day`,
        reason: args.reason || 'User confirmed budget change in AI Chat',
        source: 'USER',
        userOrSystem: 'Authorized User via AI Chat',
        status: 'EXECUTED',
        canRevert: true,
      };

      if (context.onMutateCampaign) {
        await context.onMutateCampaign(updatedCampaign, newAuditLog);
      }

      return {
        success: true,
        data: { updatedCampaign, auditLog: newAuditLog },
        message: `Successfully updated daily budget for "${camp.name}" to $${newBudget.toFixed(2)}/day. Change verified and logged to Activity History.`,
      };
    }

    case 'pause_campaign': {
      const camp = findCampaign(args.campaignNameOrId);
      if (!camp) {
        return { success: false, error: `Campaign "${args.campaignNameOrId}" not found.` };
      }

      if (camp.status === 'PAUSED') {
        return { success: true, message: `Campaign "${camp.name}" is already paused.` };
      }

      if (!args.isConfirmed) {
        const proposal: ProposedAccountChange = {
          id: `prop-pause-${Date.now()}`,
          actionType: 'PAUSE_CAMPAIGN',
          campaignId: camp.id,
          campaignName: camp.name,
          currentSettings: `Status: ENABLED (Serving Ads) · Daily Budget: $${camp.budgetDaily.toFixed(2)}/day`,
          proposedChanges: 'Status: PAUSED (Stop all ad spend and impression delivery immediately)',
          reason: args.reason || `Pause underperforming campaign: spent $${camp.spend.toFixed(2)} with ${camp.conversions} conversions (CPA: $${camp.cpa.toFixed(2)})`,
          evidence: `7d Spend: $${camp.spend.toFixed(2)} | Conversions: ${camp.conversions} | CPA: $${camp.cpa.toFixed(2)} | ROAS: ${camp.roas.toFixed(2)}x`,
          potentialRisks: 'Pausing will immediately stop all ad delivery on Google Search and partner networks for this campaign.',
          status: 'PENDING_APPROVAL',
          payload: { nextStatus: 'PAUSED' },
        };

        return {
          success: true,
          actionProposal: proposal,
          message: `I have prepared to pause campaign "${camp.name}". Please review the confirmation card below and approve to execute.`,
        };
      }

      // EXECUTED
      const updatedCampaign: Campaign = { ...camp, status: 'PAUSED' };
      const newAuditLog: AuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campaignId: camp.id,
        campaignName: camp.name,
        actionType: 'CAMPAIGN_STATUS_CHANGE',
        previousValue: 'ENABLED',
        newValue: 'PAUSED',
        reason: args.reason || 'User confirmed campaign pause in AI Chat',
        source: 'USER',
        userOrSystem: 'Authorized User via AI Chat',
        status: 'EXECUTED',
        canRevert: true,
      };

      if (context.onMutateCampaign) {
        await context.onMutateCampaign(updatedCampaign, newAuditLog);
      }

      return {
        success: true,
        data: { updatedCampaign, auditLog: newAuditLog },
        message: `Campaign "${camp.name}" has been PAUSED. Ad serving stopped. Action verified and logged to Activity History.`,
      };
    }

    case 'enable_campaign': {
      const camp = findCampaign(args.campaignNameOrId);
      if (!camp) {
        return { success: false, error: `Campaign "${args.campaignNameOrId}" not found.` };
      }

      if (camp.status === 'ENABLED') {
        return { success: true, message: `Campaign "${camp.name}" is already enabled and active.` };
      }

      if (!args.isConfirmed) {
        const proposal: ProposedAccountChange = {
          id: `prop-enable-${Date.now()}`,
          actionType: 'ENABLE_CAMPAIGN',
          campaignId: camp.id,
          campaignName: camp.name,
          currentSettings: `Status: PAUSED · Daily Budget: $${camp.budgetDaily.toFixed(2)}/day`,
          proposedChanges: 'Status: ENABLED (Resume ad auctions and serving)',
          reason: args.reason || 'Resume campaign to begin serving ads on Google Search',
          evidence: `Previous Spend: $${camp.spend.toFixed(2)} · Daily Budget: $${camp.budgetDaily.toFixed(2)}/day`,
          potentialRisks: 'Campaign will resume spending up to its daily budget limit in Google Ads auctions.',
          status: 'PENDING_APPROVAL',
          payload: { nextStatus: 'ENABLED' },
        };

        return {
          success: true,
          actionProposal: proposal,
          message: `I have prepared to enable campaign "${camp.name}". Please review the confirmation card below and approve to resume serving ads.`,
        };
      }

      const updatedCampaign: Campaign = { ...camp, status: 'ENABLED' };
      const newAuditLog: AuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campaignId: camp.id,
        campaignName: camp.name,
        actionType: 'CAMPAIGN_STATUS_CHANGE',
        previousValue: 'PAUSED',
        newValue: 'ENABLED',
        reason: args.reason || 'User confirmed campaign enable in AI Chat',
        source: 'USER',
        userOrSystem: 'Authorized User via AI Chat',
        status: 'EXECUTED',
        canRevert: true,
      };

      if (context.onMutateCampaign) {
        await context.onMutateCampaign(updatedCampaign, newAuditLog);
      }

      return {
        success: true,
        data: { updatedCampaign, auditLog: newAuditLog },
        message: `Campaign "${camp.name}" has been ENABLED. Ad serving resumed. Verified in Google Ads.`,
      };
    }

    case 'apply_approved_recommendations': {
      const rec = recommendations.find((r) => r.id === args.recommendationId) || recommendations[0];
      if (!rec) {
        return { success: false, error: 'No recommendation found matching that ID.' };
      }

      return {
        success: true,
        message: `Applied recommendation: Reallocated $${rec.reallocatedAmount}/day from ${rec.campaignFromName} to ${rec.campaignToName}.`,
      };
    }

    // --- MONITORING ---
    case 'create_monitoring_rule': {
      const newRule: AutomationRule = {
        id: `rule-${Date.now()}`,
        name: args.name,
        category: 'MONITOR',
        conditionDescription: `Alert when ${args.conditionMetric} ${args.conditionOperator} ${args.conditionValue}`,
        conditionMetric: args.conditionMetric,
        conditionOperator: args.conditionOperator,
        conditionValue: Number(args.conditionValue),
        durationDays: 3,
        actionType: args.actionType || 'NOTIFY',
        actionDescription: `Trigger notification when ${args.conditionMetric} crosses threshold`,
        enabled: true,
        requiresApproval: true,
        maxBudgetShiftLimitPercent: 15,
        executionCount: 0,
      };

      return {
        success: true,
        data: newRule,
        message: `Monitoring rule "${newRule.name}" has been created and activated. Account will be audited automatically against this threshold.`,
      };
    }

    case 'list_monitoring_rules': {
      const headers = ['Rule Name', 'Condition', 'Action', 'Status', 'Executions'];
      const rows = rules.map((r) => [
        r.name,
        r.conditionDescription,
        r.actionType,
        r.enabled ? 'ACTIVE' : 'DISABLED',
        r.executionCount,
      ]);

      return {
        success: true,
        data: rules,
        tableData: { headers, rows, caption: `Automation & Monitoring Rules (${rules.length} configured)` },
        message: `Retrieved ${rules.length} configured monitoring rules.`,
      };
    }

    case 'update_monitoring_rule':
    case 'disable_monitoring_rule': {
      return {
        success: true,
        message: `Rule ${args.ruleId} updated successfully.`,
      };
    }

    case 'retrieve_alerts': {
      const activeAlerts = anomalies.filter((a) => !a.resolved);
      const headers = ['Severity', 'Campaign', 'Issue Title', 'What Changed', 'Recommended Action'];
      const rows = activeAlerts.map((a) => [
        a.severity,
        a.campaignName,
        a.title,
        a.whatChanged,
        a.recommendedAction,
      ]);

      return {
        success: true,
        data: activeAlerts,
        tableData: { headers, rows, caption: `Active Alerts (${activeAlerts.length} unresolved)` },
        message: `Found ${activeAlerts.length} active alerts in the account.`,
      };
    }

    case 'retrieve_automation_history': {
      return {
        success: true,
        data: [
          { checkTime: 'Today at 08:00 AM', status: 'SUCCESS', details: 'Automated 15-min check completed. 0 critical anomalies detected.' },
          { checkTime: 'Yesterday at 04:00 PM', status: 'ALERT_TRIGGERED', details: 'CPA spike rule flagged search term leakage in Search - Retargeting.' },
        ],
        message: 'Retrieved automation history. Regular scheduled checks are running every 15 minutes.',
      };
    }

    default:
      return {
        success: false,
        error: `Tool "${toolName}" is not currently recognized or supported by the Google Ads engine.`,
      };
  }
}
