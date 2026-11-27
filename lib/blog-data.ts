import { COMPARISON_CHECKED_AT, PSEO_COMPARISONS } from '@/lib/comparison-data';

export interface BlogSource {
  label: string;
  url: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  intro: string;
  keyFacts: string[];
  sections: BlogSection[];
  sources: BlogSource[];
  relatedCompareSlug?: string;
}

export const BLOG_DISCLAIMER = 'Competitor details were checked on 27 November 2026 using the linked sources. Prices, billing options, limits and promotions can change. Entry prices do not imply identical features. WordStream, Adspirer, Optmyzr, Opteo and Pace are trademarks of their owners. AdOptimize is not affiliated with or endorsed by them.';

function comparisonFacts(slug: string) {
  const comparison = PSEO_COMPARISONS.find((item) => item.slug === slug);
  if (!comparison?.competitorSources?.length) {
    throw new Error(`Comparison article is missing sourced facts: ${slug}`);
  }
  return {
    keyFacts: comparison.keyFacts,
    sources: comparison.competitorSources,
    relatedCompareSlug: comparison.slug,
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'wordstream-vs-adoptimize',
    ...comparisonFacts('wordstream-alternative'),
    title: 'WordStream Advisor vs AdOptimize: Legacy Pricing, Real Campaign Execution',
    description: 'The $49 WordStream Advisor listing is not a working checkout offer. See how AdOptimize gives you a Google Ads agent for campaign work at $29/month or $99/year.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: COMPARISON_CHECKED_AT,
    intro: 'If you are looking for a self-serve WordStream alternative, the important question is not just price. Can you subscribe to the product, connect your account and get campaign work done? AdOptimize offers an executable Google Ads agent with published Pro prices and a workflow that goes from your brief to approved account changes.',
    sections: [
      {
        heading: 'What the $49 WordStream price actually represents',
        paragraphs: [
          'WordStream still has an Advisor page listing $49/month, a guided optimization workflow, reporting and keyword tools. But the Buy Now links on that page point to example.com. Treat the price as a legacy listing, not a confirmed product you can purchase today.',
          'The main pricing URL leads to a marketing-services consultation page. Those LocaliQ services are quote-based and are not the same offer as the old Advisor software. We do not publish a guessed service price from unverified forum anecdotes.',
        ],
      },
      {
        heading: 'An agent that does the account work',
        paragraphs: [
          'AdOptimize does more than summarize metrics. Ask it to investigate costly queries, create a Search or App campaign, adjust budgets and bidding, or update keywords and targeting. It prepares the supported changes and applies the ones you approve directly in Google Ads.',
          'That means you can move from a performance question to an account action without translating every recommendation into manual settings changes.',
        ],
      },
      {
        heading: 'Pro pricing you can decide on without a sales call',
        paragraphs: [
          'Pro Monthly costs $29. Pro Yearly costs $99 for the year, equivalent to $8.25/month, paid yearly. Applicable taxes are additional and media spend is paid separately to Google.',
          'Both Pro subscriptions include the agent, campaign creation and management, audits, reports and supported execution. Create a free account first to explore your dashboard and campaign data; the agent requires Pro.',
        ],
      },
      {
        heading: 'A practical workflow to evaluate',
        paragraphs: [],
        bullets: [
          'Bring a specific task: build a campaign for your offer or investigate a rise in cost per conversion.',
          'Review the proposed campaign settings or account update, including the budget and intended goal.',
          'Approve the work and let the agent apply it, then inspect the execution outcome and follow-up performance.',
        ],
      },
      {
        heading: 'Why consider AdOptimize?',
        paragraphs: [
          'AdOptimize gives marketers who manage Google Ads a clear software option: executable campaign work, an account-aware workspace and a $29 monthly or $99 yearly subscription. If you want a managed marketing service instead, obtain its actual scope and quote separately; do not compare it with a retired software listing.',
        ],
      },
    ],
  },
  {
    slug: 'adspirer-vs-adoptimize',
    ...comparisonFacts('adspirer-alternative'),
    title: 'Adspirer vs AdOptimize: Put Your Google Ads Agent to Work',
    description: 'Compare Adspirer task-based annual pricing with AdOptimize Pro at $29/month or $99/year for Google Ads campaign creation, management and optimization.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: COMPARISON_CHECKED_AT,
    intro: 'Both products can act on advertising accounts. AdOptimize is built for marketers who want to delegate Google Ads campaign work in a dedicated workspace, with Pro Monthly and Pro Yearly rather than a choice of task-based product tiers.',
    sections: [
      {
        heading: 'Compare the billing basis, not just the number',
        paragraphs: [
          'Adspirer displays Plus at $40/month, Pro at $83/month and Max at $167/month with annual-billing labels. These are not figures to present as month-to-month prices. The allowances shown are 150, 600 and 3,000 tasks per month respectively, with a 15-task free tier also listed.',
          'AdOptimize Pro Monthly is $29, and Pro Yearly is $99 for the year ($8.25/month equivalent), plus applicable taxes. Both unlock the same agent capabilities. A free AdOptimize account is a dashboard preview, not a free agent subscription.',
        ],
      },
      {
        heading: 'Your campaign data and execution in one place',
        paragraphs: [
          'AdOptimize brings campaign viewing, agent conversations and change history into your Google Ads workspace. You can ask what is driving CPA, have the agent prepare a campaign, and carry out approved budget, bidding or keyword updates without moving the work between separate chat tools and the Google Ads interface.',
          'Adspirer operates through chat tools including ChatGPT and Claude and advertises six platforms: Google, Meta, LinkedIn, TikTok, Amazon and ChatGPT Ads. AdOptimize does not claim that wider platform coverage; its value is executable Google Ads work at a lower entry subscription price.',
        ],
      },
      {
        heading: 'What you can delegate to AdOptimize',
        paragraphs: [],
        bullets: [
          'Build Search or App campaigns from an offer, goal and budget.',
          'Investigate wasted spend and performance changes before deciding what to adjust.',
          'Manage budgets, bidding targets, keywords, negatives and supported targeting settings.',
          'Apply approved changes and review the recorded execution outcome.',
        ],
      },
      {
        heading: 'Make the decision around your account work',
        paragraphs: [
          'If your immediate need is to create, manage and optimize Google Ads, AdOptimize offers those capabilities in both Pro subscriptions. Start by identifying the tasks you want to delegate and the subscription commitment you want to make. Cross-platform coverage and task allowances matter only if your workflow actually requires them.',
        ],
      },
    ],
  },
  {
    slug: 'optmyzr-vs-adoptimize',
    ...comparisonFacts('optmyzr-alternative'),
    title: 'Optmyzr vs AdOptimize: Google Ads Execution Without a $209 Entry Rate',
    description: 'Optmyzr Essentials starts at $209/month annually or $299 month-to-month before promotions. Compare AdOptimize campaign management at $29/month or $99/year.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: COMPARISON_CHECKED_AT,
    intro: 'You do not always need a broad PPC toolkit to get your Google Ads work done. AdOptimize lets you describe a task, review the plan and have an agent execute it. Here is how that workflow and its Pro subscription compare with Optmyzr Essentials.',
    sections: [
      {
        heading: 'Verified entry pricing and billing commitments',
        paragraphs: [
          'The official Optmyzr pricing data lists the entry Essentials spend band at a standard $209/month under annual billing, or $299 on month-to-month billing. The entry selection shows up to $25,000 in monthly ad spend and 25 accounts. Spend bands, billing periods and promotions affect the final price; the page also advertises temporary sale rates.',
          'AdOptimize Pro costs $29/month or $99/year, equivalent to $8.25/month paid yearly, plus applicable taxes. These are subscription prices, not Google Ads media budgets. The lower entry price is a concrete difference; it is not a claim that the two products have identical feature sets or account limits.',
        ],
      },
      {
        heading: 'Delegate a task instead of configuring another workflow',
        paragraphs: [
          'Ask AdOptimize to create a Search campaign, investigate a high-CPA campaign, adjust a budget or add negative keywords. The agent uses your connected account data, prepares supported changes and applies the ones you approve.',
          'Optmyzr offers audits, bidding and optimization tools, cross-platform capabilities and a rule engine. Scheduled rules can be valuable for repeatable workflows. AdOptimize is request-driven agent work, not a replacement claim for every scheduled automation in that suite.',
        ],
      },
      {
        heading: 'Pro covers the work behind everyday Google Ads decisions',
        paragraphs: [],
        bullets: [
          'Campaign creation and management, not just performance commentary.',
          'Budget and bid changes around your goals, including supported CPA, ROAS and CPC settings.',
          'Keywords, negative keywords, campaign status, locations and supported conversion goals.',
          'Account audits, performance reports and recorded execution outcomes.',
        ],
      },
      {
        heading: 'When AdOptimize makes sense',
        paragraphs: [
          'For in-house marketers, freelancers and agencies whose immediate goal is to delegate Google Ads tasks, AdOptimize offers an executable agent at $29 monthly or $99 yearly. Before paying for a larger suite, list the tools you will actually use and compare the plan that includes them. Do not equate a larger feature catalogue with better value for every workflow.',
        ],
      },
    ],
  },
  {
    slug: 'opteo-vs-adoptimize',
    ...comparisonFacts('opteo-alternative'),
    title: 'Opteo vs AdOptimize: A Lower-Entry-Price Google Ads Agent',
    description: 'Compare Opteo Basic at $129/month with AdOptimize Pro at $29/month or $99/year. Both advertise execution; see the differences in scope and pricing.',
    category: 'Comparison',
    publishedAt: COMPARISON_CHECKED_AT,
    updatedAt: COMPARISON_CHECKED_AT,
    intro: 'AdOptimize turns your Google Ads brief into campaign work: create campaigns, manage budgets and bidding, and carry out approved optimizations. Compare its lower entry subscription price and focused workspace with Opteo’s broader toolkit and account-based plans.',
    sections: [
      {
        heading: 'What the starting plans cost',
        paragraphs: [
          'Opteo Basic is $129/month for 10 accounts and $25,000 in connected monthly spend. Professional is $249/month for 25 accounts and $100,000 spend; Agency is $499/month for 75 accounts and $250,000 spend. These limits are part of the offer, not details to omit when comparing prices.',
          'AdOptimize Pro Monthly is $29. Pro Yearly is $99 for the year, equivalent to $8.25/month paid yearly, plus applicable taxes. Both Pro subscriptions include the agent for campaign creation, account management and supported optimization.',
        ],
      },
      {
        heading: 'A dedicated workspace for your Google Ads work',
        paragraphs: [
          'Opteo’s current site advertises Google, Meta, Microsoft, LinkedIn and TikTok Ads, an AI agent, one-click improvements, a toolkit and performance monitoring. It also describes pushing reviewed changes live.',
          'AdOptimize focuses on Google Ads: campaign data, an agent that builds and manages campaigns, and a record of approved execution. That focus can be a practical fit when Google Ads is the account you want to delegate.',
        ],
      },
      {
        heading: 'Evaluate the tasks you want off your plate',
        paragraphs: [],
        bullets: [
          'Creating a Search or App campaign from your brief.',
          'Finding costly queries and preparing relevant negative keywords.',
          'Adjusting campaign budgets, bidding targets, locations and status.',
          'Reviewing account audits, reports and the outcome of approved changes.',
        ],
      },
      {
        heading: 'The case for AdOptimize',
        paragraphs: [
          'You can get an executable Google Ads agent without a $129/month starting subscription. AdOptimize makes the buying decision straightforward with two Pro intervals and the same core capabilities. Compare broader channel tools separately if you need them; do not pay for scope your current workflow does not use.',
        ],
      },
    ],
  },
  {
    slug: 'pace-vs-adoptimize',
    ...comparisonFacts('pace-alternative'),
    title: 'Pace vs AdOptimize: Budget Pacing or Google Ads Campaign Work?',
    description: 'Pace starts at $49/month; its Dot agent is listed in the $199 One plan. AdOptimize includes its executable Google Ads agent at $29/month or $99/year.',
    category: 'Comparison',
    publishedAt: COMPARISON_CHECKED_AT,
    updatedAt: COMPARISON_CHECKED_AT,
    intro: 'A $49 pacing plan and an executable campaign agent are not the same purchase. Compare what each tier includes: AdOptimize Pro is built around doing Google Ads work, while Pace layers budget pacing, optimization tools and agent access across its plans.',
    sections: [
      {
        heading: 'Entry price versus the tier with an agent',
        paragraphs: [
          'Pace lists Basic at $49/month with a $25,000 monthly managed-spend cap, Pro at $99 with $100,000, and One at $199 with $500,000, all on monthly billing. Basic includes budget pacing, spend protection and Google Ads editing. Its Dot AI chat agent is listed in One, not Basic.',
          'AdOptimize includes its AI Marketing Agent in Pro Monthly at $29 and Pro Yearly at $99 ($8.25/month equivalent, paid yearly), plus applicable taxes. The agent handles supported campaign creation, management and optimization in both intervals.',
        ],
      },
      {
        heading: 'What you want the software to do',
        paragraphs: [
          'Pace supports pacing across eight platforms and scheduled budget optimization, with frequency and other capabilities depending on the tier. It is more than a reporting dashboard, and its editing and optimization features should not be hidden in a comparison.',
          'AdOptimize helps you delegate the next Google Ads task: build a campaign, investigate performance, adjust budgets and bidding, manage keywords and targeting, and execute approved updates. The workflow starts with your brief, not a claim of unattended cross-platform budget control.',
        ],
      },
      {
        heading: 'Compare the plan that includes your required work',
        paragraphs: [],
        bullets: [
          'Need an agent to create and manage Google Ads campaigns? Check agent access, not just basic pacing.',
          'Need scheduled spend control across many platforms? Check supported platforms and run frequency.',
          'Separate software fees, taxes and media spend when comparing the total commitment.',
          'Check account and spend limits as well as approval and change-history workflows.',
        ],
      },
      {
        heading: 'Why choose AdOptimize for Google Ads work?',
        paragraphs: [
          'If your goal is to delegate campaign work to an agent, AdOptimize gives you that in Pro at $29 monthly or $99 yearly. You do not need to move to a $199 pacing tier to access our agent. Choose based on the tasks you want completed, not a generic promise that all automation tools are interchangeable.',
        ],
      },
    ],
  },
  {
    slug: 'find-wasted-google-ads-spend',
    keyFacts: [
      'Check conversion tracking before judging a campaign’s cost per conversion.',
      'Review the search terms report for spend without conversions before you add negative keywords.',
      'Keep a change log with dates and reasons, so results can be measured and reversed.',
    ],
    title: 'How to Find Wasted Google Ads Spend: A Practical Checklist',
    description: 'A checklist for finding wasted Google Ads spend in search terms, negative keywords, cost-per-conversion outliers and budget-limited campaigns.',
    category: 'Guide',
    publishedAt: '2026-11-26',
    updatedAt: '2026-11-26',
    intro: 'Wasted Google Ads spend usually hides in a few places: search terms that never convert, keywords that spend without results, campaigns with a cost per conversion far above target, and budgets that cap your best campaigns. Use this checklist to review each one before you change anything.',
    sections: [
      {
        heading: 'Confirm your conversion tracking first',
        paragraphs: [
          'A waste review is only as reliable as your conversion data. Check that the conversion actions you optimise for record real conversions once, and that the date range you review is long enough for conversions to be reported after the click.',
        ],
      },
      {
        heading: 'Review the search terms report',
        paragraphs: [
          'Sort search terms by cost and look for queries that spend without conversions. Group the expensive ones into three buckets: irrelevant to your offer, too broad, or relevant but converting poorly.',
        ],
      },
      {
        heading: 'Add negative keywords carefully',
        paragraphs: [
          'Add a term as a negative keyword only when it is clearly off-target for what you sell. Use the narrowest match that blocks the waste, then review the results over the following days so you do not block valid demand.',
        ],
      },
      {
        heading: 'Compare cost per conversion across campaigns',
        paragraphs: [
          'Look for campaigns whose cost per conversion sits well above your target. Before cutting budget, check whether the cause is a bid, a keyword set, the ad or the landing page.',
        ],
      },
      {
        heading: 'Check campaigns that hit their budget',
        paragraphs: [
          'A campaign that runs out of daily budget early may be your strongest performer. Compare its cost per conversion with the rest of the account before you add budget or move money away from it.',
        ],
      },
      {
        heading: 'Keep a change log',
        paragraphs: [
          'Record each change, the date and the reason for it. A log makes it possible to tell what worked and to reverse a change if results drop.',
        ],
      },
      {
        heading: 'Repeat the review regularly',
        paragraphs: [
          'Search demand, budgets and competitors change, so waste returns over time. AdOptimize can repeat this review on your connected Google Ads account and prepare any changes for your approval. Results depend on your account and data, and no outcome is guaranteed.',
        ],
      },
    ],
    sources: [],
  },
];
