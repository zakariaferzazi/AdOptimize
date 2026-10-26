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

export interface PSEOComparison {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  competitorName: string;
  tagline: string;
  comparisonPoints: {
    feature: string;
    adoptimize: string;
    competitor: string;
  }[];
  verdict: string;
  faqs: { q: string; a: string }[];
}

export const PSEO_TOOLS: PSEOTool[] = [
  {
    slug: 'google-ads-audit',
    title: 'Google Ads Audit Tool',
    metaTitle: 'Free Google Ads Audit Tool - Find Wasted Spend & CPA Spikes',
    metaDescription: 'Audit your Google Ads account in 60 seconds. Detect wasted ad spend, negative keyword opportunities, and budget bottlenecks. Free instant audit.',
    targetKeyword: 'Google Ads audit tool',
    searchVolumeEstimate: '18,100 / mo',
    headline: 'Instant Google Ads Account Audit',
    subheadline: 'Scan your campaigns, ad groups, and search terms to uncover wasted spend, negative keyword leaks, and budget bottlenecks.',
    toolType: 'audit',
    keyBenefits: [
      'Identifies zero-conversion search queries draining budget',
      'Calculates impression share lost to daily budget limits',
      'Pinpoints acute CPA spikes and underperforming match types',
      'Zero unauthorized changes — you control every action',
    ],
    benchmarks: [
      { label: 'Avg Wasted Spend Uncovered', value: '23.4%', hint: 'Across accounts spending $5k+/mo' },
      { label: 'Avg CPA Reduction', value: '-18.2%', hint: 'Within 30 days of negative additions' },
      { label: 'Avg Impression Recovery', value: '+34%', hint: 'From budget cap rebalancing' },
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
    metaDescription: 'Find non-converting, low-intent search terms in your Google Ads account. Export negative keyword lists and stop bleeding click spend immediately.',
    targetKeyword: 'negative keywords finder',
    searchVolumeEstimate: '14,800 / mo',
    headline: 'Negative Keywords Finder for Google Ads',
    subheadline: 'Automatically detect irrelevant search queries eating your budget. Add negative keywords with 1 click to lower CPA.',
    toolType: 'negative-keywords',
    keyBenefits: [
      'Surfaces job-seeker, login, and free download search terms',
      'Flags search queries with 50+ clicks and 0 conversions',
      'Groups negatives by campaign level, ad group, or account list',
      'Protects broad match and broad-match-modified campaigns',
    ],
    benchmarks: [
      { label: 'Typical Click Waste', value: '15 - 28%', hint: 'Spent on zero-intent query variations' },
      { label: 'Saved per $10k Spend', value: '$1,850/mo', hint: 'Directly returned to working budget' },
      { label: 'Quality Score Lift', value: '+1.4 pts', hint: 'Due to higher search term relevance' },
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
        a: 'Yes. With 1-click approval, AdOptimize pushes chosen negative keywords directly to your Google Ads campaign or negative keyword list.',
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
      { label: 'Cross-Industry Median CPA', value: '$48.96', hint: 'Search campaigns benchmark' },
      { label: 'High Intent SaaS CPA', value: '$85.00', hint: 'B2B software demo target' },
      { label: 'eCommerce Order CPA', value: '$24.50', hint: 'Direct-to-consumer purchases' },
    ],
    faqs: [
      {
        q: 'What is a good CPA in Google Ads?',
        a: 'A good CPA is typically 20% to 33% of your customer lifetime value (LTV) for subscription businesses, or less than your gross product margin minus target profit in eCommerce.',
      },
      {
        q: 'How does AdOptimize help lower my CPA?',
        a: 'AdOptimize eliminates non-converting search terms, pauses underperforming placements, and reallocates budget to high-converting keywords with low CPAs.',
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
      { label: 'Average Search ROAS', value: '380%', hint: '3.8x return on ad spend' },
      { label: 'Average PMax ROAS', value: '420%', hint: 'Multichannel product feeds' },
      { label: 'Break-even Benchmark', value: '250%', hint: 'Based on 40% gross margin' },
    ],
    faqs: [
      {
        q: 'How do you calculate break-even ROAS?',
        a: 'Break-even ROAS = 1 ÷ Gross Profit Margin. For example, if your gross margin is 40% (0.40), your break-even ROAS is 1 ÷ 0.40 = 2.5 (or 250%). Any ROAS above 2.5 generates net profit.',
      },
      {
        q: 'Why does my ROAS drop when I increase budget?',
        a: 'When you raise campaign budgets, Google bids on broader auctions and less relevant queries to exhaust the daily cap. AdOptimize prevents this by pacing budget increases incrementally (max 15%) while excluding low-intent queries.',
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
    subheadline: 'Enter your monthly ad spend and campaign count to see an instant estimate of recoverable dollars based on 10,000+ audited accounts.',
    toolType: 'wasted-spend',
    keyBenefits: [
      'Instant projection of recoverable monthly ad spend',
      'Identifies top 3 sources of Google Ads waste',
      'Calculates ROI of automated campaign optimization',
      'No credit card or account link required for initial estimate',
    ],
    benchmarks: [
      { label: 'Search Query Bleed', value: '$650/mo', hint: 'Per $5,000 in monthly ad spend' },
      { label: 'Mobile App Misplacement', value: '$420/mo', hint: 'Accidental display clicks' },
      { label: 'Budget Cap Losses', value: '$780/mo', hint: 'Missed revenue on winners' },
    ],
    faqs: [
      {
        q: 'Where does wasted ad spend come from in Google Ads?',
        a: 'The three biggest sources of wasted spend are: 1) Broad-match search queries that have zero transactional intent, 2) Accidental display ad clicks in mobile gaming apps, and 3) Equal budget distribution to campaigns with wildly different ROAS.',
      },
      {
        q: 'How quickly can wasted spend be recovered?',
        a: 'Adding negative keywords and trimming budgets on underperforming campaigns takes effect in real-time, instantly stopping budget drain on the same day.',
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
    subheadline: 'Diagnose Expected CTR, Ad Relevance, and Landing Page Experience to reduce average CPC by up to 50%.',
    toolType: 'quality-score',
    keyBenefits: [
      'Scans keywords with Quality Score under 6',
      'Calculates your CPC discount or penalty multiplier',
      'Provides specific ad copy and headline suggestions',
      'Monitors landing page speed and mobile responsiveness',
    ],
    benchmarks: [
      { label: 'Quality Score 10 Discount', value: '-50% CPC', hint: 'Half-price clicks vs average' },
      { label: 'Quality Score 5 (Baseline)', value: '0% Change', hint: 'Standard auction CPC' },
      { label: 'Quality Score 3 Penalty', value: '+67% CPC', hint: 'Massive cost penalty' },
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
    slug: 'saas',
    industry: 'SaaS & Software',
    metaTitle: 'Google Ads Optimization for SaaS - Lower CAC & Scale Demos',
    metaDescription: 'Stop paying for job seekers and student clicks. Optimize Google Ads for B2B SaaS with automated negative keywords, demo pacing, and ROAS scaling.',
    targetKeyword: 'Google Ads for SaaS',
    searchVolumeEstimate: '6,600 / mo',
    headline: 'Google Ads Optimization Built for B2B SaaS',
    subheadline: 'Lower Customer Acquisition Cost (CAC), eliminate student and career-seeker click waste, and keep demo pipeline campaigns funded all month.',
    avgCpa: '$78.40',
    avgRoas: '4.4x',
    avgCtr: '4.8%',
    commonBleeds: [
      'Non-converting queries like "free download crack", "salary", "jobs", "templates"',
      'Budget exhausting before peak business hours (1 PM – 5 PM EST)',
      'High CPC competitor conquests with single-digit conversion rates',
      'Display remarketing serving on spam gaming and flashlight apps',
    ],
    recommendedRules: [
      'Automated negative keyword addition for career and crack query patterns',
      'Emergency CPA safeguard: Alert if 7-day demo CPA exceeds $140',
      'Impression share rebalancing: Transfer budget from broad competitor ads to high-intent core',
    ],
    keyStrategies: [
      {
        title: 'Protect High-Intent Trial & Demo Terms',
        description: 'Ensure exact and phrase match keywords containing "software", "tool", "platform", and "pricing" receive 100% of eligible budget during business hours.',
      },
      {
        title: 'Tiered Competitor Conquesting',
        description: 'Isolate competitor brand terms into dedicated ad groups with strict Target CPA caps so they do not cannibalize your primary acquisition budget.',
      },
      {
        title: 'Negative List Automation',
        description: 'Continuously sync global negative lists to prevent job hunters, students, and support seekers from draining expensive $15+ clicks.',
      },
    ],
    faqs: [
      {
        q: 'What is a typical Google Ads CPA for B2B SaaS?',
        a: 'For mid-market SaaS ($5k to $25k ACV), qualified demo CPAs typically range from $65 to $150. For self-serve product-led growth (PLG) SaaS, free trial signups usually range from $25 to $55.',
      },
      {
        q: 'How does AdOptimize prevent SaaS budget waste?',
        a: 'AdOptimize automatically flags queries with negative intent (e.g., "login", "careers", "internship", "open source alternative") and reallocates budget to high-intent commercial terms.',
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
    subheadline: 'Scale product returns, detect unprofitable SKU spend, and automatically rebalance budgets to your highest-converting product collections.',
    avgCpa: '$22.80',
    avgRoas: '5.2x',
    avgCtr: '3.6%',
    commonBleeds: [
      'Zombie SKUs consuming ad budget in Performance Max asset groups with 0 purchases',
      'Display placements triggering unintended clicks in mobile apps',
      'Brand keyword cannibalization where generic campaigns bid against your own brand',
      'Search terms matching discontinued or out-of-stock product lines',
    ],
    recommendedRules: [
      'Auto-flag products with over $100 ad spend and 0 transactions',
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
    avgCpa: '$92.00',
    avgRoas: '3.8x',
    avgCtr: '3.9%',
    commonBleeds: [
      'Residential / consumer searches matching commercial service terms',
      'Click fraud or bot submissions on broad match phrase variations',
      'Lack of offline conversion feedback skewing Google Smart Bidding',
      'Inefficient weekend ad schedules spending budget when offices are closed',
    ],
    recommendedRules: [
      'Exclude residential, DIY, and consumer query patterns',
      'Ad schedule gating: Pause or reduce bids during non-business hours',
      'Lead form CPA alert: Flag ad groups where lead cost exceeds $120',
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
        a: 'Negative keywords like "free", "diy", "jobs", "templates", and "consumer" immediately filter out everyday retail users and ensure your clicks come from enterprise decision-makers.',
      },
    ],
  },
  {
    slug: 'agencies',
    industry: 'Agencies & PPC Consultants',
    metaTitle: 'Google Ads Software for Agencies - Scale Client Accounts',
    metaDescription: 'Eliminate manual Google Ads auditing. Continuous 15-minute monitoring, 1-click audit-proof reallocations, and multi-account oversight for agencies.',
    targetKeyword: 'Google Ads software for agencies',
    searchVolumeEstimate: '7,200 / mo',
    headline: 'Google Ads Optimization Built for Performance Agencies',
    subheadline: 'Monitor multiple client accounts 24/7. Detect acute CPA spikes before clients notice, and present concrete data evidence in seconds.',
    avgCpa: 'Client-specific',
    avgRoas: 'Multi-account',
    avgCtr: '5.1%',
    commonBleeds: [
      'Account anomalies going unnoticed until month-end reporting',
      'Manual negative keyword checks taking 10+ hours per week per account manager',
      'Clients complaining about budget exhaustion early in the billing cycle',
      'Uncontrolled Google automated recommendations altering bidding targets',
    ],
    recommendedRules: [
      'Automated multi-account anomaly alerts with Slack & email notifications',
      'Guarded budget shift rules requiring human review before Google API dispatch',
      'Full audit trail with one-click rollback on all account changes',
    ],
    keyStrategies: [
      {
        title: '24/7 Autonomous Account Health Scanning',
        description: 'Detect sudden CTR collapses, CPA spikes, and billing issues immediately instead of waiting for weekly check-ins.',
      },
      {
        title: 'Audit-Proof Change Logs',
        description: 'Maintain a verifiable record of who changed what, when, why, and the exact financial metrics that justified the adjustment.',
      },
      {
        title: '1-Click Revert Safeguards',
        description: 'Give junior media buyers confidence with hard budget caps (±15% daily limit) and instantaneous 1-click rollback capability.',
      },
    ],
    faqs: [
      {
        q: 'Can AdOptimize manage multiple Google Ads accounts?',
        a: 'Yes. Our Agency Scale plan supports multiple client accounts with centralized cross-account monitoring, anomaly alerts, and customizable client budgets.',
      },
      {
        q: 'Does AdOptimize replace human agency media buyers?',
        a: 'No. AdOptimize empowers media buyers by handling monotonous query auditing and continuous anomaly detection, providing them with clear mathematical evidence to make faster, higher-conviction decisions.',
      },
    ],
  },
];

export const PSEO_COMPARISONS: PSEOComparison[] = [
  {
    slug: 'google-ads-agency-vs-software',
    title: 'Google Ads Agency vs. Automated Software',
    metaTitle: 'Google Ads Agency vs. Automated Software - Cost & ROI Comparison',
    metaDescription: 'Compare $5,000/mo traditional agency fees against 24/7 automated Google Ads optimization software. See cost, speed, and transparency differences.',
    targetKeyword: 'Google Ads agency vs software',
    competitorName: 'Traditional PPC Agency',
    tagline: 'Why pay $3,000–$10,000/mo for weekly manual checks when software monitors your campaigns every 15 minutes?',
    comparisonPoints: [
      { feature: 'Cost', adoptimize: '$49 – $199 / month flat', competitor: '$3,000 – $10,000/mo + 15% ad spend fee' },
      { feature: 'Audit Frequency', adoptimize: 'Continuous (every 15 minutes)', competitor: 'Weekly or monthly manual check' },
      { feature: 'Root Cause Explanation', adoptimize: 'Instant grounded metrics & data logs', competitor: 'Bi-weekly slide deck summary' },
      { feature: 'Human Control', adoptimize: '1-click approval or guarded auto-rules', competitor: 'Changes made without your direct visibility' },
      { feature: 'Audit Trail & Revert', adoptimize: 'Instant 1-click rollback with before/after logs', competitor: 'Difficult to trace who changed what' },
      { feature: 'Contract Commitment', adoptimize: 'Cancel anytime, 14-day refund guarantee', competitor: '6 to 12-month lock-in contract' },
    ],
    verdict: 'For businesses spending $2,000 to $50,000/month, AdOptimize provides 10x faster anomaly detection and higher transparency at a fraction of agency retainers.',
    faqs: [
      {
        q: 'Can I use AdOptimize if I already have an agency?',
        a: 'Yes! Many brands use AdOptimize as an independent watchdog to ensure their agency is not neglecting negative keywords, overspending on brand terms, or leaving campaigns capped.',
      },
      {
        q: 'What if I need custom ad creative or landing pages?',
        a: 'AdOptimize focuses on performance analytics, budget reallocation, and keyword optimization. For graphic design and video production, pairing AdOptimize with a creative freelancer is often 80% cheaper than a full-service agency.',
      },
    ],
  },
  {
    slug: 'wordstream-alternative',
    title: 'AdOptimize vs. WordStream',
    metaTitle: 'AdOptimize vs WordStream - Modern Google Ads Alternative',
    metaDescription: 'Looking for a WordStream alternative? Discover AdOptimize with continuous 15-minute anomaly detection, grounded budget rebalancing, and audit logs.',
    targetKeyword: 'Wordstream alternative',
    competitorName: 'WordStream / LOCALiQ',
    tagline: 'Modern, transparent Google Ads optimization without dated rule templates or agency upsells.',
    comparisonPoints: [
      { feature: 'Anomaly Detection', adoptimize: 'Real-time 15-minute background auditing', competitor: 'Static 20-Minute Work Week reminders' },
      { feature: 'Data Grounding', adoptimize: 'Exact query logs, CPAs, ROAS, and dollar spend', competitor: 'Generic grading benchmarks' },
      { feature: 'PMax Optimization', adoptimize: 'Deep Performance Max auditing & asset analysis', competitor: 'Limited PMax functionality' },
      { feature: 'Budget Rebalancing', adoptimize: 'Dynamic cross-campaign simulator', competitor: 'Manual budget adjustments only' },
      { feature: 'Safety Guardrails', adoptimize: 'Strict ±15% shift limits & 1-click revert', competitor: 'Basic alert notifications' },
    ],
    verdict: 'AdOptimize offers modern, data-backed optimization built specifically for today’s Smart Bidding and Performance Max environment.',
    faqs: [
      {
        q: 'Why look for a WordStream alternative in 2026?',
        a: 'Traditional PPC tools were built before Smart Bidding and Performance Max dominated Google Ads. AdOptimize is built specifically for modern algorithmic bidding, identifying auction anomalies and search term leaks in real time.',
      },
    ],
  },
  {
    slug: 'optmyzr-alternative',
    title: 'AdOptimize vs. Optmyzr',
    metaTitle: 'AdOptimize vs Optmyzr - Simpler, Transparent PPC Optimization',
    metaDescription: 'Compare AdOptimize and Optmyzr. Clean UI, actionable plain-English recommendations, and guarded execution without enterprise complexity.',
    targetKeyword: 'Optmyzr alternative',
    competitorName: 'Optmyzr',
    tagline: 'Enterprise-grade optimization without complex multi-screen scripts or steep learning curves.',
    comparisonPoints: [
      { feature: 'Setup Time', adoptimize: 'Under 30 seconds via Google OAuth', competitor: 'Multi-screen script & rule setup' },
      { feature: 'Pricing', adoptimize: 'Accessible flat pricing from $29/mo', competitor: 'Starts at $249+/mo with spend penalty tiers' },
      { feature: 'UI Experience', adoptimize: 'Fast, minimal, distraction-free command center', competitor: 'Dense enterprise tables with 50+ menus' },
      { feature: 'AI Diagnosis', adoptimize: 'Clear root-cause analysis with exact query proof', competitor: 'Raw data tables and script logs' },
      { feature: 'Guardrails & Rollback', adoptimize: 'Built-in ±15% shift cap & 1-click revert', competitor: 'Manual script rule construction required' },
    ],
    verdict: 'AdOptimize provides agile, powerful PPC optimization without enterprise bloat, steep learning curves, or prohibitive price tags.',
    faqs: [
      {
        q: 'Is AdOptimize suitable for individual marketers?',
        a: 'Yes. AdOptimize is built specifically for founders, individual advertisers, and lean media buyers who need instant results without dedicating weeks to configuring complicated script workflows.',
      },
    ],
  },
  {
    slug: 'adspirer-alternative',
    title: 'AdOptimize vs. Adspirer',
    metaTitle: 'AdOptimize vs Adspirer - Dedicated Google Ads AI Optimization',
    metaDescription: 'Compare AdOptimize and Adspirer. Discover deep SearchStream and PMax campaign diagnostics, negative keyword harvesting, and guarded spend controls.',
    targetKeyword: 'Adspirer alternative',
    competitorName: 'Adspirer',
    tagline: 'Focused, deep Google Ads intelligence with live SearchStream integration and verified campaign execution.',
    comparisonPoints: [
      { feature: 'Google Ads Depth', adoptimize: 'Full SearchStream API v25 & PMax asset diagnostics', competitor: 'High-level multi-platform chat commands' },
      { feature: 'Negative Keyword Finder', adoptimize: 'Real-time query bleed analysis & 1-click harvest', competitor: 'Broad-level channel prompts' },
      { feature: 'Budget Optimization', adoptimize: 'Predictive marginal CPA simulator & capital rebalancer', competitor: 'Basic pacing alerts' },
      { feature: 'Execution Safety', adoptimize: 'Immutable before/after audit trail with 1-click rollback', competitor: 'Chat-based confirmation messages' },
      { feature: 'No Lock-in Pricing', adoptimize: 'Transparent tiers with 14-day money-back guarantee', competitor: 'Task-capped conversation limits' },
    ],
    verdict: 'While Adspirer offers a multi-platform chat interface, AdOptimize goes deeper into Google Ads auction mechanics, query search streams, and capital rebalancing.',
    faqs: [
      {
        q: 'How does AdOptimize differ from chat-based media buyers?',
        a: 'AdOptimize gives you dedicated, specialized Google Ads analytics, continuous background auditing every 15 minutes, and transparent before/after verification logs so you always know why changes were made.',
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
    headline: 'Real-Time Google Ads Anomaly Detection',
    subheadline: 'Continuous background monitoring scans your search queries and bidding metrics every 15 minutes to catch runaway spend and auction shifts.',
    badge: 'Proactive Alert Engine',
    benefits: [
      'Pinpoint rapid Cost per Acquisition (CPA) spikes within hours of occurrence',
      'Detect sudden conversion tracking drop-offs before weekly reports',
      'Flag competitor bid surges causing unexpected CPC increases',
      'Instant notifications via Slack and email',
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
        title: '1-Click Guardrail Response',
        desc: 'Applies protective bid ceilings or pauses affected ad groups with a single click from the alert card.',
      },
    ],
    faqs: [
      {
        q: 'How frequently does AdOptimize check for Google Ads anomalies?',
        a: 'AdOptimize queries the Google Ads SearchStream API on a continuous schedule (up to every 15 minutes on Growth plans) to detect irregularities in near real time.',
      },
      {
        q: 'Will anomaly alerts make changes to my account automatically?',
        a: 'Only if you explicitly enable auto-remedy rules. By default, every alert presents clear evidence with a human-in-the-loop approval button.',
      },
    ],
  },
  {
    slug: 'ai-budget-optimizer',
    title: 'AI Budget Optimizer',
    metaTitle: 'AI Google Ads Budget Optimizer - Scale High-ROAS Campaigns',
    metaDescription: 'Automatically reallocate ad budget from low-performing ad groups to high-converting search campaigns with unmet demand.',
    targetKeyword: 'AI Google Ads budget optimizer',
    headline: 'Autonomous Google Ads Budget & Bid Optimizer',
    subheadline: 'Stop starving winning campaigns. Rebalance daily spend toward high-ROAS ad groups with verified marginal efficiency modeling.',
    badge: 'Capital Efficiency Engine',
    benefits: [
      'Eliminate impression share lost to daily budget limits on top converters',
      'Cut wasted ad spend on plateaued or dying campaigns',
      'Human-in-the-loop single change guardrail limit (±15%–30%)',
      'Full before/after audit trail with 1-click revert capability',
    ],
    capabilities: [
      {
        title: 'Cross-Campaign Capital Rebalancing',
        desc: 'Analyzes marginal cost-per-acquisition across campaigns to shift capital to where it generates maximum return.',
      },
      {
        title: 'Impression Share Recovery',
        desc: 'Calculates exact budget required to capture high-intent search impression share lost to budget restrictions.',
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
        a: 'Yes. Every budget update is recorded in the immutable audit trail and can be rolled back to the exact previous value with one click.',
      },
    ],
  },
  {
    slug: 'negative-keyword-harvester',
    title: 'Negative Keyword Harvester',
    metaTitle: 'Google Ads Negative Keyword Harvester - Stop Click Bleeds',
    metaDescription: 'Automatically detect irrelevant search queries eating your budget. Add negative keywords with 1 click to lower CPA.',
    targetKeyword: 'Google Ads negative keyword tool',
    headline: 'Instant Negative Keyword Harvester',
    subheadline: 'Protect your broad match campaigns. Isolate and eliminate career, login, and irrelevant search query click waste.',
    badge: 'Waste Reduction',
    benefits: [
      'Automatically cluster non-converting queries by semantic intent',
      'Detect high-cost low-intent variations before they spend hundreds',
      'Apply negatives to campaign lists or shared account sets with 1 click',
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
        desc: 'Push selected negative keywords directly to Google Ads via API in exact, phrase, or broad match types.',
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
    title: 'Automated Ad Safeguards',
    metaTitle: 'Automated Google Ads Safeguards & 24/7 Rules | AdOptimize',
    metaDescription: 'Set up automated safeguards to detect sudden CPA spikes, prevent budget drift, and pause non-converting bleeders around the clock.',
    targetKeyword: 'automated Google Ads rules',
    headline: '24/7 Automated Google Ads Safeguards',
    subheadline: 'Keep your ad account protected around the clock with rules that pause non-converting bleeders and notify you instantly.',
    badge: 'Automated Safety',
    benefits: [
      'Auto-pause bleeding campaigns when spend exceeds target with 0 conversions',
      'CPA spike circuit breakers to stop runaway Smart Bidding',
      'Zero silent changes — every trigger is logged and reversible',
      'Customizable threshold rules for any account KPI',
    ],
    capabilities: [
      {
        title: 'Custom Condition Builder',
        desc: 'Create rules based on CPA, ROAS, spend without conversions, or rapid CPC jumps.',
      },
      {
        title: 'Tiered Enforcement Modes',
        desc: 'Choose between Notify Only, Suggest Recommendation, or Autonomous Action with Rollback.',
      },
      {
        title: 'Execution Log & Audit Proof',
        desc: 'Detailed history showing exact rule trigger condition, campaign affected, and status.',
      },
    ],
    faqs: [
      {
        q: 'What happens if a safeguard pauses a campaign by mistake?',
        a: 'You can restore the campaign status immediately with a single click from the Activity Log or Notification email.',
      },
    ],
  },
  {
    slug: 'audit-log-rollback-trail',
    title: 'Audit Log & 1-Click Rollback Trail',
    metaTitle: 'Google Ads Audit Log & 1-Click Rollback | AdOptimize',
    metaDescription: 'Complete verifiable changelog of all Google Ads actions, budget shifts, negative keyword exclusions, and automated rules with instant 1-click rollback.',
    targetKeyword: 'Google Ads change history audit log',
    headline: 'Immutable Change History & 1-Click Rollback',
    subheadline: 'Total visibility and accountability. Every modification is logged with actor, timestamp, previous value, and instant restore.',
    badge: 'Accountability First',
    benefits: [
      'Complete changelog of all AI and user modifications',
      'Before and after value comparisons for every parameter change',
      '1-click instant rollback for supported campaign edits',
      'Enterprise-grade change management for marketing teams and agencies',
    ],
    capabilities: [
      {
        title: 'Granular Diff Tracking',
        desc: 'Inspect exact parameter changes, from budget dollars to campaign status and keyword match types.',
      },
      {
        title: 'Attribution & Actor Logging',
        desc: 'Know whether a change was made by a team member, an automated safeguard, or an approved AI suggestion.',
      },
      {
        title: 'Rollback Action Queue',
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

