export interface PSEOTool {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  searchVolumeEstimate: string;
  headline: string;
  subheadline: string;
  toolType: 'audit' | 'negative-keywords' | 'cpa-calc' | 'roas-calc' | 'wasted-spend' | 'quality-score';
  keyBenefits: string[];
  benchmarks: { label: string; value: string; hint: string }[];
  faqs: { q: string; a: string }[];
}

export interface PSEOSolution {
  slug: string;
  industry: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  searchVolumeEstimate: string;
  headline: string;
  subheadline: string;
  avgCpa: string;
  avgRoas: string;
  avgCtr: string;
  commonBleeds: string[];
  recommendedRules: string[];
  keyStrategies: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
}

export const PSEO_TOOLS: PSEOTool[] = [
  {
    slug: 'google-ads-audit',
    title: 'Google Ads Audit Tool',
    metaTitle: 'Google Ads Audit Tool - Find Wasted Spend & CPA Spikes',
    metaDescription: 'Analyze connected Google Ads account data. Detect wasted ad spend, negative keyword opportunities, and budget bottlenecks. Limited connected-account access; advanced audits require Pro.',
    targetKeyword: 'Google Ads audit tool',
    searchVolumeEstimate: '18,100 / mo',
    headline: 'Google Ads Account Audit',
    subheadline: 'Scan your campaigns, ad groups, and search terms to uncover wasted spend, negative keyword leaks, and budget bottlenecks.',
    toolType: 'audit',
    keyBenefits: [
      'Identifies zero-conversion search queries draining budget',
      'Calculates impression share lost to daily budget limits',
      'Pinpoints acute CPA spikes and underperforming match types',
      'Changes require your approval before execution',
    ],
    benchmarks: [
      { label: 'Potential waste', value: 'Account-specific', hint: 'Calculated from connected data' },
      { label: 'CPA outcome', value: 'Varies', hint: 'No performance result is guaranteed' },
      { label: 'Budget headroom', value: 'Review required', hint: 'Based on approved account data' },
    ],
    faqs: [
      {
        q: 'How does this Google Ads audit tool analyze my account?',
        a: 'The audit connects securely through Google Ads with direct authorization. It analyzes your recent search queries, Quality Scores, impression share metrics, and conversion tracking data.',
      },
      {
        q: 'Does running an audit change my active ads or bids?',
        a: 'No. The initial scan reviews your account without modifying anything. You maintain complete control over every campaign edit, negative keyword, and budget reallocation with one-click approval.',
      },
      {
        q: 'What campaign types are audited?',
        a: 'We audit Google Search campaigns, Performance Max (PMax), Display remarketing, and Google Shopping campaigns.',
      },
    ],
  },
  {
    slug: 'negative-keywords-finder',
    title: 'Negative Keywords Finder',
    metaTitle: 'Negative Keywords Finder - Stop Paying for Irrelevant Google Clicks',
    metaDescription: 'Find non-converting, low-intent search terms in your Google Ads account. Export negative keyword lists and review waste before approving supported changes.',
    targetKeyword: 'negative keywords finder',
    searchVolumeEstimate: '14,800 / mo',
    headline: 'Negative Keywords Finder for Google Ads',
    subheadline: 'Review irrelevant search queries and prepare negative-keyword proposals for approval.',
    toolType: 'negative-keywords',
    keyBenefits: [
      'Surfaces job-seeker, login, and free download search terms',
      'Flags search queries with 50+ clicks and 0 conversions',
      'Groups negatives by campaign level, ad group, or account list',
      'Protects broad match and broad-match-modified campaigns',
    ],
    benchmarks: [
      { label: 'Query spend', value: 'Account-specific', hint: 'Calculated from search-term data' },
      { label: 'Savings outcome', value: 'Not guaranteed', hint: 'Depends on your data and approved changes' },
      { label: 'Quality Score', value: 'May vary', hint: 'Many account factors affect results' },
    ],
    faqs: [
      {
        q: 'Why are negative keywords crucial in Google Ads?',
        a: 'Google’s broad match and phrase match algorithms frequently match user searches with loose intent, such as "careers", "free", "crack", or competitor technical support. Negative keywords prevent your ads from displaying for these non-converting queries.',
      },
      {
        q: 'How does AdOptimize find negative keywords?',
        a: 'AdOptimize parses actual search query reports, calculates spend per conversion for each query cluster, and tags queries that burn capital without delivering leads or sales.',
      },
      {
        q: 'Can I add negative keywords directly from the app?',
        a: 'AdOptimize can prepare supported negative-keyword changes for your approval. An approved change is then executed in Google Ads.',
      },
    ],
  },
  {
    slug: 'cpa-calculator',
    title: 'Google Ads CPA Calculator',
    metaTitle: 'Google Ads CPA Calculator - Calculate & Lower Cost Per Acquisition',
    metaDescription: 'Calculate target CPA, blended cost per conversion, and break-even acquisition cost for Google Ads. Free interactive calculator.',
    targetKeyword: 'Google Ads CPA calculator',
    searchVolumeEstimate: '12,200 / mo',
    headline: 'Cost Per Acquisition (CPA) Calculator',
    subheadline: 'Determine your true cost per conversion, assess profitability against customer lifetime value, and find optimal bidding targets.',
    toolType: 'cpa-calc',
    keyBenefits: [
      'Interactive Target CPA and break-even calculations',
      'Accounts for conversion rates and average CPC',
      'Compares performance against industry benchmarks',
      'Delivers clear bid strategy recommendations',
    ],
    benchmarks: [
      { label: 'Target CPA', value: 'You set it', hint: 'Use your acquisition economics' },
      { label: 'Business target', value: 'Varies', hint: 'Set from your own margin and customer value' },
      { label: 'Current CPA', value: 'Account-specific', hint: 'Use connected campaign results' },
    ],
    faqs: [
      {
        q: 'What is a good CPA in Google Ads?',
        a: 'A suitable CPA depends on your margin, customer lifetime value, attribution, and target profitability. Use your own economics rather than a universal percentage.',
      },
      {
        q: 'How does AdOptimize help lower my CPA?',
        a: 'AdOptimize can help identify non-converting search terms, pauses underperforming placements, and can prepare a budget change to high-converting keywords with low CPAs.',
      },
      {
        q: 'Should I use Target CPA (tCPA) or Maximize Conversions?',
        a: 'If your campaign generates at least 30 conversions per month with stable tracking, Target CPA provides reliable cost control. For new campaigns, start with Maximize Conversions before setting a strict tCPA cap.',
      },
    ],
  },
  {
    slug: 'roas-calculator',
    title: 'Target ROAS Calculator',
    metaTitle: 'Target ROAS Calculator for Google Ads - Return on Ad Spend Tool',
    metaDescription: 'Calculate Target ROAS, break-even ROAS, and profit multiplier for Google Ads and Performance Max campaigns. Free interactive formula.',
    targetKeyword: 'ROAS calculator Google Ads',
    searchVolumeEstimate: '9,900 / mo',
    headline: 'Google Ads ROAS & Profitability Calculator',
    subheadline: 'Calculate your minimum break-even ROAS and model how shifting budget to top-performing campaigns scales net revenue.',
    toolType: 'roas-calc',
    keyBenefits: [
      'Computes exact break-even ROAS from profit margins',
      'Identifies campaigns scaling above target efficiency',
      'Models incremental revenue from budget reallocations',
      'Optimizes Smart Bidding Target ROAS settings',
    ],
    benchmarks: [
      { label: 'Target ROAS', value: 'You set it', hint: 'Use your margin and return goals' },
      { label: 'Campaign ROAS', value: 'Account-specific', hint: 'Review reported conversion value' },
      { label: 'Break-even ROAS', value: 'Calculated', hint: 'Based on the margin you enter' },
    ],
    faqs: [
      {
        q: 'How do you calculate break-even ROAS?',
        a: 'Break-even ROAS = 1 ÷ Gross Profit Margin. For example, if your gross margin is 40% (0.40), your break-even ROAS is 1 ÷ 0.40 = 2.5 (or 250%). Any ROAS above 2.5 generates net profit.',
      },
      {
        q: 'Why does my ROAS drop when I increase budget?',
        a: 'Budget and bidding changes can affect auction coverage and query mix. AdOptimize prepares supported proposals, but you should review the target value, evidence, and business impact before approval.',
      },
    ],
  },
  {
    slug: 'wasted-spend-estimator',
    title: 'Wasted Ad Spend Estimator',
    metaTitle: 'Wasted Ad Spend Estimator - How Much Are You Bleeding on Google Ads?',
    metaDescription: 'Estimate how much money your Google Ads campaigns are wasting on negative queries, poor placements, and capped campaigns. Free online tool.',
    targetKeyword: 'calculate wasted Google Ads spend',
    searchVolumeEstimate: '8,400 / mo',
    headline: 'Wasted Ad Spend Estimator',
    subheadline: 'Enter your monthly ad spend and campaign assumptions to model potential waste. Results are illustrative and are not a guarantee.',
    toolType: 'wasted-spend',
    keyBenefits: [
      'Illustrative projection of spend to review',
      'Identifies top 3 sources of Google Ads waste',
      'Models scenarios from the values you enter',
      'Instant estimate with no account connection required',
    ],
    benchmarks: [
      { label: 'Search query spend', value: 'Account-specific', hint: 'Calculated from connected search-term data' },
      { label: 'Placement review', value: 'Varies', hint: 'Depends on available placement data' },
      { label: 'Budget cap signal', value: 'Review required', hint: 'Potential opportunity, not guaranteed revenue' },
    ],
    faqs: [
      {
        q: 'Where does wasted ad spend come from in Google Ads?',
        a: 'The three biggest sources of wasted spend are: 1) Broad-match search queries that have zero transactional intent, 2) Accidental display ad clicks in mobile gaming apps, and 3) Equal budget distribution to campaigns with wildly different ROAS.',
      },
      {
        q: 'How quickly can wasted spend be recovered?',
        a: 'Approved negative-keyword and budget changes can take effect after Google Ads accepts the operation. Review the result in your activity history.',
      },
    ],
  },
  {
    slug: 'quality-score-checker',
    title: 'Quality Score Optimizer',
    metaTitle: 'Google Ads Quality Score Optimizer - Lower CPC & Win Auctions',
    metaDescription: 'Learn how to improve your Google Ads Quality Score (1-10). Boost expected CTR, ad relevance, and landing page experience to pay less per click.',
    targetKeyword: 'improve Google Ads Quality Score',
    searchVolumeEstimate: '11,400 / mo',
    headline: 'Google Ads Quality Score Optimizer',
    subheadline: 'Review Expected CTR, Ad Relevance, and Landing Page Experience when investigating search performance. Outcomes vary.',
    toolType: 'quality-score',
    keyBenefits: [
      'Scans keywords with Quality Score under 6',
      'Calculates your CPC discount or penalty multiplier',
      'Provides specific ad copy and headline suggestions',
      'Monitors landing page speed and mobile responsiveness',
    ],
    benchmarks: [
      { label: 'Quality Score 10', value: 'Model input', hint: 'Actual auction CPC depends on competition' },
      { label: 'Quality Score 5', value: 'Model input', hint: 'Use as an estimate, not a guarantee' },
      { label: 'Quality Score 3', value: 'Model input', hint: 'Actual auction impact can vary' },
    ],
    faqs: [
      {
        q: 'What is Google Ads Quality Score?',
        a: 'Quality Score is Google’s rating (from 1 to 10) of the quality and relevance of your keywords, ad copy, and landing pages. Higher Quality Scores lead to lower Cost Per Click (CPC) and higher ad positions.',
      },
      {
        q: 'How can I quickly improve a low Quality Score?',
        a: '1) Tightly theme your ad groups to 5-10 closely related keywords. 2) Include the exact search query in Headline 1. 3) Ensure your landing page contains the exact query and loads in under 2 seconds.',
      },
    ],
  },
];

export const PSEO_SOLUTIONS: PSEOSolution[] = [
  {
    slug: 'software',
    industry: 'Software & Technology',
    metaTitle: 'Google Ads Optimization for Software - Lower CAC & Scale Demos',
    metaDescription: 'Review job-seeker and student queries, investigate B2B SaaS performance, and prepare approved Google Ads changes.',
    targetKeyword: 'Google Ads for Software',
    searchVolumeEstimate: '6,600 / mo',
    headline: 'Google Ads Optimization Built for B2B Software',
    subheadline: 'Lower Customer Acquisition Cost (CAC), eliminate student and career-seeker click waste, and keep demo pipeline campaigns funded all month.',
    avgCpa: 'Account-specific',
    avgRoas: 'Calculated in workspace',
    avgCtr: 'Account-specific',
    commonBleeds: [
      'Non-converting queries like "free download crack", "salary", "jobs", "templates"',
      'Budget exhausting before peak business hours (1 PM – 5 PM EST)',
      'High CPC competitor conquests with single-digit conversion rates',
      'Display remarketing serving on spam gaming and flashlight apps',
    ],
    recommendedRules: [
      'Review and approve supported negative-keyword additions for irrelevant query patterns',
      'Review a user-defined CPA threshold against connected performance data',
      'Impression share rebalancing: Transfer budget from broad competitor ads to high-intent core',
    ],
    keyStrategies: [
      {
        title: 'Protect High-Intent Trial & Demo Terms',
        description: 'Review high-intent software keywords and prepare supported budget or bid proposals for the appropriate campaigns.',
      },
      {
        title: 'Tiered Competitor Conquesting',
        description: 'Isolate competitor brand terms into dedicated ad groups with strict Target CPA caps so they do not cannibalize your primary acquisition budget.',
      },
      {
        title: 'Negative List Automation',
        description: 'Review recurring job-seeker, student, and support queries before preparing supported negative-keyword changes.',
      },
    ],
    faqs: [
      {
        q: 'What is a typical Google Ads CPA for B2B SaaS?',
        a: 'An appropriate CPA target depends on your margin, lifetime value, sales cycle, and conversion quality. Use your own account economics rather than a universal benchmark.',
      },
      {
        q: 'How does AdOptimize prevent SaaS budget waste?',
        a: 'AdOptimize flags queries with negative intent (e.g., "login", "careers", "internship", "open source alternative") and can prepare a budget change to high-intent commercial terms.',
      },
    ],
  },
  {
    slug: 'ecommerce',
    industry: 'eCommerce & DTC',
    metaTitle: 'Google Ads & PMax Optimization for eCommerce - Boost ROAS',
    metaDescription: 'Scale your Shopify or DTC brand with audit-proof Google Ads and Performance Max optimization. Stop zero-conversion SKU spend and maximize holiday ROAS.',
    targetKeyword: 'Google Ads for eCommerce',
    searchVolumeEstimate: '8,100 / mo',
    headline: 'eCommerce & PMax Google Ads Optimizer',
    subheadline: 'Scale product returns, detect unprofitable SKU spend, and prepare budget rebalancing proposals to your highest-converting product collections.',
    avgCpa: 'Account-specific',
    avgRoas: 'Calculated in workspace',
    avgCtr: 'Account-specific',
    commonBleeds: [
      'Zombie SKUs consuming ad budget in Performance Max asset groups with 0 purchases',
      'Display placements triggering unintended clicks in mobile apps',
      'Brand keyword cannibalization where generic campaigns bid against your own brand',
      'Search terms matching discontinued or out-of-stock product lines',
    ],
    recommendedRules: [
      'Review products with material spend and no attributed transactions',
      'PMax asset group performance monitoring with ROAS floor thresholds',
      'Dynamic budget shift during promotional weekends and flash sales',
    ],
    keyStrategies: [
      {
        title: 'Feed-Driven Zombie SKU Pruning',
        description: 'Identify product IDs that drain ad spend without driving sales and exclude them from top-tier shopping campaigns.',
      },
      {
        title: 'Brand vs Non-Brand PMax Segmentation',
        description: 'Prevent Google from inflating PMax ROAS numbers by claiming cheap conversions from your existing brand searches.',
      },
      {
        title: 'High-Margin Product Pacing',
        description: 'Prioritize advertising dollars toward product categories with high gross margins rather than low-margin commodity items.',
      },
    ],
    faqs: [
      {
        q: 'What ROAS should an eCommerce store target on Google Ads?',
        a: 'Most direct-to-consumer eCommerce brands target between 3.5x and 5.5x ROAS, depending on their cost of goods sold (COGS) and shipping overhead.',
      },
      {
        q: 'How does AdOptimize optimize Performance Max campaigns?',
        a: 'AdOptimize audits asset group performance, surfaces search query themes, detects asset fatigue, and ensures your product feed is receiving balanced auction exposure.',
      },
    ],
  },
  {
    slug: 'b2b',
    industry: 'B2B & Professional Services',
    metaTitle: 'B2B Google Ads Optimization - High-Value Lead Generation',
    metaDescription: 'Cut cost per lead (CPL) for B2B consulting, legal, financial, and industrial services. Eliminate consumer traffic and capture high-intent inquiries.',
    targetKeyword: 'B2B Google Ads optimization',
    searchVolumeEstimate: '5,400 / mo',
    headline: 'High-Value B2B Lead Gen Google Ads Optimization',
    subheadline: 'Eliminate consumer searches, optimize for high-intent corporate inquiries, and reduce your cost per qualified sales opportunity.',
    avgCpa: 'Account-specific',
    avgRoas: 'Calculated in workspace',
    avgCtr: 'Account-specific',
    commonBleeds: [
      'Residential / consumer searches matching commercial service terms',
      'Click fraud or bot submissions on broad match phrase variations',
      'Lack of offline conversion feedback skewing Google Smart Bidding',
      'Inefficient weekend ad schedules spending budget when offices are closed',
    ],
    recommendedRules: [
      'Exclude residential, DIY, and consumer query patterns',
      'Ad schedule gating: Pause or reduce bids during non-business hours',
      'Review ad groups when lead cost exceeds a user-defined target',
    ],
    keyStrategies: [
      {
        title: 'Commercial Intent Filtering',
        description: 'Require keywords to contain explicit qualifiers like "enterprise", "commercial", "firm", "consultants", or "services".',
      },
      {
        title: 'Strict Geographic Exclusion',
        description: 'Target only specific metro regions and exclude international traffic that cannot be legally or logistically serviced.',
      },
      {
        title: 'Dayparting & Weekend Scheduling',
        description: 'Focus your daily budget when your sales team is active and available to respond to inbound form submissions within 5 minutes.',
      },
    ],
    faqs: [
      {
        q: 'Why is B2B Google Ads typically more expensive than B2C?',
        a: 'B2B contracts have significantly higher lifetime values (often $10k to $100k+), leading to intense auction competition for high-intent keywords.',
      },
      {
        q: 'How do negative keywords help B2B lead generation?',
        a: 'Negative keywords can help limit traffic from terms that do not match your intended audience, but results still depend on query patterns, match type, and campaign setup.',
      },
    ],
  },
  {
    slug: 'agencies',
    industry: 'Agencies & PPC Consultants',
    metaTitle: 'Google Ads Software for Agencies - Scale Client Accounts',
    metaDescription: 'Run account analysis on demand and review supported campaign changes for agencies and individual accounts.',
    targetKeyword: 'Google Ads software for agencies',
    searchVolumeEstimate: '7,200 / mo',
    headline: 'Google Ads Optimization Built for Performance Agencies',
    subheadline: 'Monitor multiple client accounts when you request a sync. Review performance and investigate unusual changes, and present concrete data evidence in seconds.',
    avgCpa: 'Client-specific',
    avgRoas: 'Multi-account',
    avgCtr: 'Account-specific',
    commonBleeds: [
      'Account anomalies going unnoticed until month-end reporting',
      'Manual negative keyword checks taking 10+ hours per week per account manager',
      'Clients complaining about budget exhaustion early in the billing cycle',
      'Uncontrolled Google automated recommendations altering bidding targets',
    ],
    recommendedRules: [
      'Campaign and account analysis with proposal and activity history',
      'Guarded budget shift rules requiring human review before Google API dispatch',
      'Activity history for supported agent proposals and outcomes',
    ],
    keyStrategies: [
      {
        title: 'Account Health Analysis',
        description: 'Investigate CTR changes, CPA spikes, and account evidence when you request an analysis or sync.',
      },
      {
        title: 'Audit-Proof Change Logs',
        description: 'Maintain a verifiable record of who changed what, when, why, and the exact financial metrics that justified the adjustment.',
      },
      {
        title: 'Reviewed Change History',
        description: 'Give junior media buyers confidence with reviewed proposal values and recorded execution outcomes.',
      },
    ],
    faqs: [
      {
        q: 'Can AdOptimize manage multiple Google Ads accounts?',
        a: 'Pro covers your connected Google Ads account for $29/month or $99/year. There is no separate multi-account Agency tier.',
      },
      {
        q: 'Does AdOptimize replace human agency media buyers?',
        a: 'No. AdOptimize can help media buyers review account data and prepare supported changes while the user remains responsible for campaign decisions and approvals.',
      },
    ],
  },
];

export interface PSEOFeature {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  headline: string;
  subheadline: string;
  badge: string;
  benefits: string[];
  capabilities: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

export const PSEO_FEATURES: PSEOFeature[] = [
  {
    slug: 'google-ads-anomaly-detection',
    title: 'Google Ads Anomaly Detection',
    metaTitle: 'Google Ads Anomaly Detection - Detect Runaway CPA Spikes Early',
    metaDescription: 'Detect CPA spikes, sudden conversion drops, and budget exhaustion in your Google Ads account before they drain ad spend.',
    targetKeyword: 'Google Ads anomaly detection',
    headline: 'Google Ads Performance Analysis',
    subheadline: 'Analyze search queries and bidding metrics when you request an account sync or investigation, then review supported changes before approval.',
    badge: 'Proactive Alert Engine',
    benefits: [
      'Pinpoint rapid Cost per Acquisition (CPA) spikes within hours of occurrence',
      'Detect sudden conversion tracking drop-offs before weekly reports',
      'Flag competitor bid surges causing unexpected CPC increases',
      'Proposal and activity records in the workspace',
    ],
    capabilities: [
      {
        title: 'Query-Level Cost Velocity Scanning',
        desc: 'Identifies individual search queries consuming excessive daily budget without generating conversions.',
      },
      {
        title: 'Bidding Anomaly Diagnostics',
        desc: 'Detects when Smart Bidding algorithms overbid in off-peak auction hours due to competitor shifts.',
      },
      {
        title: 'Approved Change Proposal',
        desc: 'Prepares supported bid-limit or status changes for approval from the analyzed account data.',
      },
    ],
    faqs: [
      {
        q: 'How frequently does AdOptimize check for Google Ads anomalies?',
        a: 'AdOptimize requests current Google Ads data when you use the workspace or ask the agent to analyze an account.',
      },
      {
        q: 'Will anomaly alerts make changes to my account automatically?',
        a: 'No. Alerts and analysis do not execute account changes automatically. Supported changes are presented as proposals for your approval.',
      },
    ],
  },
  {
    slug: 'ai-budget-optimizer',
    title: 'AI Budget Optimizer',
    metaTitle: 'AI Google Ads Budget Optimizer - Scale High-ROAS Campaigns',
    metaDescription: 'Prepare budget reallocation proposals from low-performing ad groups to high-converting search campaigns with unmet demand.',
    targetKeyword: 'AI Google Ads budget optimizer',
    headline: 'Approval-Controlled Google Ads Budget & Bid Optimizer',
    subheadline: 'Stop starving winning campaigns. Rebalance daily spend toward high-ROAS ad groups with verified marginal efficiency modeling.',
    badge: 'Capital Efficiency Engine',
    benefits: [
      'Eliminate impression share lost to daily budget limits on top converters',
      'Cut wasted ad spend on plateaued or dying campaigns',
      'User review of each proposed budget or bidding change',
      'Recorded before/after values and execution outcomes',
    ],
    capabilities: [
      {
        title: 'Cross-Campaign Capital Rebalancing',
        desc: 'Reviews campaign data and can prepare budget changes for your approval.',
      },
      {
        title: 'Impression Share Recovery',
        desc: 'Surfaces budget-limited account evidence for review.',
      },
      {
        title: 'Pacing Guardrails',
        desc: 'Prevents sudden algorithmic volatility by enforcing calibrated adjustment steps on daily budgets.',
      },
    ],
    faqs: [
      {
        q: 'How does the Budget Optimizer choose where to reallocate funds?',
        a: 'The algorithm evaluates 30-day conversion volume, current CPA relative to target, and impression share lost to budget to identify where each additional dollar generates the highest return.',
      },
      {
        q: 'Can I undo a budget reallocation?',
        a: 'Budget proposal and execution outcomes are recorded. If a correction is needed, review the recorded values and prepare a new supported change.',
      },
    ],
  },
  {
    slug: 'negative-keyword-harvester',
    title: 'Negative Keyword Harvester',
    metaTitle: 'Google Ads Negative Keyword Harvester - Stop Click Bleeds',
    metaDescription: 'Review irrelevant search queries in your Google Ads account and prepare negative-keyword changes for approval.',
    targetKeyword: 'Google Ads negative keyword tool',
    headline: 'Negative Keyword Analysis for Google Ads',
    subheadline: 'Protect your broad match campaigns. Isolate and eliminate career, login, and irrelevant search query click waste.',
    badge: 'Waste Reduction',
    benefits: [
      'Review non-converting queries by intent',
      'Detect high-cost low-intent variations before they spend hundreds',
      'Apply negatives to campaign lists or shared account sets after your approval',
      'Preserve Quality Score and maximize broad match efficiency',
    ],
    capabilities: [
      {
        title: 'Zero-Conversion Spend Flagging',
        desc: 'Surfaces all search terms exceeding your threshold spend with zero attributed conversions.',
      },
      {
        title: 'Competitor Brand Filtration',
        desc: 'Distinguishes between high-intent generic searches and expensive low-converting competitor brand clicks.',
      },
      {
        title: 'Batch Negative Addition',
        desc: 'Prepare selected negative keywords in supported match types for approval and execution.',
      },
    ],
    faqs: [
      {
        q: 'Does adding negative keywords hurt broad match reach?',
        a: 'No. Adding negative keywords sculpts broad match traffic so your budget is only spent on relevant queries with purchase intent.',
      },
    ],
  },
  {
    slug: 'automated-ad-safeguards',
    title: 'Approval-Controlled Google Ads Changes',
    metaTitle: 'Google Ads Change Controls & Approval History | AdOptimize',
    metaDescription: 'Review Google Ads performance and prepare supported budget or status changes for approval.',
    targetKeyword: 'Google Ads approval workflow',
    headline: 'Google Ads Change Controls and Approval History',
    subheadline: 'Review performance and prepare supported campaign or budget changes for approval.',
    badge: 'Approval Workflow',
    benefits: [
      'Investigate campaigns with spend and no conversions',
      'Analyze CPA changes and prepare supported adjustments',
      'Supported changes require approval and are recorded in activity history',
      'Account-aware diagnostics based on available metrics',
    ],
    capabilities: [
      {
        title: 'Available Diagnostic Checks',
        desc: 'Review CPA, ROAS, conversion, spend, search-term, and keyword evidence.',
      },
      {
        title: 'Proposal and Approval Workflow',
        desc: 'Review a supported proposal and approve or reject it before execution.',
      },
      {
        title: 'Proposal and Execution History',
        desc: 'History of supported proposals, approvals, and execution outcomes.',
      },
    ],
    faqs: [
      {
        q: 'What happens if a safeguard pauses a campaign by mistake?',
        a: 'You can review the recorded change and prepare a supported correction from Activity History. No automatic rollback is promised.',
      },
    ],
  },
  {
    slug: 'audit-log-rollback-trail',
    title: 'Proposal and Execution History',
    metaTitle: 'Google Ads Proposal and Execution History | AdOptimize',
    metaDescription: 'History of supported AI proposals, approvals, and Google Ads execution outcomes.',
    targetKeyword: 'Google Ads change history audit log',
    headline: 'Proposal and Execution History',
    subheadline: 'Review supported proposal history, before/after values, approval status, and execution outcome.',
    badge: 'Accountability First',
    benefits: [
      'Complete changelog of all AI and user modifications',
      'Before and after value comparisons for every parameter change',
      'Recorded proposal and execution outcomes',
      'Enterprise-grade change management for marketing teams and agencies',
    ],
    capabilities: [
      {
        title: 'Granular Diff Tracking',
        desc: 'Inspect exact parameter changes, from budget dollars to campaign status and keyword match types.',
      },
      {
        title: 'Attribution & Actor Logging',
        desc: 'Review the approval and execution record associated with an AI proposal.',
      },
      {
        title: 'Correction Proposal Workflow',
        desc: 'Restore previous configurations seamlessly via Google Ads API calls without manually digging through Google Ads Change History.',
      },
    ],
    faqs: [
      {
        q: 'How long does AdOptimize retain audit logs?',
        a: 'Audit logs are stored securely in Firestore and retained for the lifetime of your account.',
      },
    ],
  },
];

