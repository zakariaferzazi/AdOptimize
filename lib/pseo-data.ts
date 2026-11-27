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
    title: 'Free Google Ads Audit',
    metaTitle: 'Free Google Ads Audit Tool — 5 Audits per Month | AdOptimize',
    metaDescription: 'Run a free Google Ads audit on your connected account. Review performance, wasted query spend, budget visibility and low Quality Scores. Five audits per month.',
    targetKeyword: 'free google ads audit',
    searchVolumeEstimate: '18,100 / mo',
    headline: 'Free Google Ads Audit',
    subheadline: 'Know where your ad spend needs attention. Connect your Google Ads account and run five read-only audits per calendar month, with no card required.',
    toolType: 'audit',
    keyBenefits: [
      'Compare campaign performance with the preceding, equally long period',
      'Review reported search queries with spend and no conversions',
      'Check CPA/ROAS benchmarks, budget visibility and low reported Quality Scores',
      'Get prioritized findings, coverage notes and a findings CSV export',
    ],
    benchmarks: [
      { label: 'Free allowance', value: '5 / month', hint: 'Completed audits; calendar months in UTC' },
      { label: 'Account access', value: 'Read-only audit', hint: 'Sign in and connect through Google authorization' },
      { label: 'Price', value: '$0', hint: 'No card required for Free' },
    ],
    faqs: [
      {
        q: 'How does this Google Ads audit tool analyze my account?',
        a: 'Create a Free account, connect Google Ads in Settings, choose a reporting period and run AI Ads Audit. It reads campaign performance, non-converting reported queries, budget visibility and available keyword Quality Scores. The checks are rules-based and disclose missing data.',
      },
      {
        q: 'Does running an audit change my active ads or bids?',
        a: 'No. The Free audit is read-only. Campaign creation, management and supported changes require Pro and your approval.',
      },
      {
        q: 'How many free Google Ads audits can I run?',
        a: 'Five completed audits per UTC calendar month across your connected accounts. Failed runs release their slot; in-progress runs reserve one. Pro audits do not have the Free monthly quota, but technical rate limits apply.',
      },
      {
        q: 'What does the audit not check?',
        a: 'It does not inspect landing-page content, ad policies, tracking implementation or attribution accuracy. Campaign detail checks cover the top 200 by spend; keyword and query detail each cover up to 150 rows. Google may withhold search terms or Quality Scores.',
      },
      {
        q: 'Can I audit an account just by entering its website URL?',
        a: 'No. Sign-in and Google Ads authorization are required. A website address or customer ID alone cannot reveal private campaign data.',
      },
    ],
  },
  {
    slug: 'negative-keywords-finder',
    title: 'Negative Keywords Finder',
    metaTitle: 'Negative Keywords Finder - Stop Paying for Irrelevant Google Clicks',
    metaDescription: 'Review non-converting queries with a free Google Ads audit. Pro can turn relevant findings into approved negative-keyword updates.',
    targetKeyword: 'negative keywords finder',
    searchVolumeEstimate: '14,800 / mo',
    headline: 'Negative Keywords Finder for Google Ads',
    subheadline: 'Find queries worth reviewing in a free Google Ads audit. Use Pro to prepare and apply negative-keyword changes after approval.',
    toolType: 'negative-keywords',
    keyBenefits: [
      'Review up to 150 reported queries with spend and no conversions',
      'Check query intent and conversion lag before excluding traffic',
      'Export prioritized audit findings as CSV on Free',
      'Prepare supported negative-keyword changes with Pro',
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
        a: 'The Free audit reviews reported queries with spend and no recorded conversions. Review intent and conversion lag before excluding a term. Pro can prepare supported negative-keyword changes for approval.',
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
    title: 'Wasted Ad Spend Review',
    metaTitle: 'Review Wasted Spend with a Free Google Ads Audit | AdOptimize',
    metaDescription: 'Review actual non-converting query spend and campaign efficiency with AdOptimize’s free Google Ads audit. Five read-only audits per month.',
    targetKeyword: 'calculate wasted Google Ads spend',
    searchVolumeEstimate: '8,400 / mo',
    headline: 'Wasted Ad Spend Review',
    subheadline: 'Use your connected account, not a fixed waste percentage. Review query spend, CPA/ROAS and budget signals in your free Google Ads audit.',
    toolType: 'wasted-spend',
    keyBenefits: [
      'Review reported spend and conversions for your selected period',
      'Identify non-converting queries without guessing recoverable savings',
      'Compare performance against the previous, equally long period',
      'Disclose overlapping spend and incomplete query coverage',
    ],
    benchmarks: [
      { label: 'Search query spend', value: 'Account-specific', hint: 'Calculated from connected search-term data' },
      { label: 'Coverage', value: 'Disclosed', hint: 'Reported queries only; no placement-content inspection' },
      { label: 'Budget cap signal', value: 'Review required', hint: 'Potential opportunity, not guaranteed revenue' },
    ],
    faqs: [
      {
        q: 'Where does wasted ad spend come from in Google Ads?',
        a: 'Review non-converting queries, campaign efficiency and budget allocation. Spend without a recorded conversion is a signal to investigate, not proof of waste. The Free audit does not inspect placement content or landing pages.',
      },
      {
        q: 'How quickly can wasted spend be recovered?',
        a: 'Approved negative-keyword and budget changes can take effect after Google Ads accepts the operation. Review the result in your activity history.',
      },
    ],
  },
  {
    slug: 'quality-score-checker',
    title: 'AdWords Quality Score Checker',
    metaTitle: 'AdWords Quality Score Checker — Free Audit Review | AdOptimize',
    metaDescription: 'Review available keyword Quality Scores with a free Google Ads audit. Identify spending keywords at 4/10 or below; no guessed scores or CPC discounts.',
    targetKeyword: 'adwords quality score checker',
    searchVolumeEstimate: '11,400 / mo',
    headline: 'AdWords Quality Score Checker',
    subheadline: 'AdWords is now Google Ads. Review available, Google-reported keyword Quality Scores in your free audit, and identify low scores that deserve attention.',
    toolType: 'quality-score',
    keyBenefits: [
      'Review up to 150 keywords in the account’s spending-keyword sample',
      'Flag spending keywords with a reported score of 4/10 or below',
      'Keep unavailable scores distinct from healthy scores',
      'Read diagnostic scores without changing ads or bidding',
    ],
    benchmarks: [
      { label: 'Reported scale', value: '1–10', hint: 'A keyword-level diagnostic from Google' },
      { label: 'Audit review threshold', value: '4/10 or below', hint: 'Spending keywords in the reviewed sample' },
      { label: 'Free allowance', value: '5 audits / month', hint: 'Shares the Free Google Ads audit allowance' },
    ],
    faqs: [
      {
        q: 'What is Google Ads Quality Score?',
        a: 'Quality Score is Google’s 1–10 keyword-level diagnostic for Search campaigns, based on expected CTR, ad relevance and landing-page experience. Google says the score itself is not an input in the ad auction, so it is not a guaranteed CPC discount.',
      },
      {
        q: 'Can this checker score a website without Google Ads access?',
        a: 'No. The audit reads available scores from your authorized Google Ads account. It does not calculate scores from a domain, simulate a discount or inspect landing-page content.',
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

