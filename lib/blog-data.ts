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
  // Public pages consulted for any competitor statement in this post.
  sources: BlogSource[];
  relatedCompareSlug?: string;
}

const DISCLAIMER_NOTE = 'Competitor details are taken from public websites checked on 26 November 2026. Prices and plans change, so confirm them on the vendor’s site before you buy.';

export const BLOG_DISCLAIMER = `${DISCLAIMER_NOTE} WordStream, Adspirer and Optmyzr are trademarks of their owners. AdOptimize is not affiliated with or endorsed by them.`;

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'wordstream-vs-adoptimize',
    keyFacts: [
      'WordStream markets managed marketing services and a free consultation. Its pricing link led to a services page with no per-plan prices, checked on 26 November 2026.',
      'AdOptimize is self-serve software for Google Ads. Pro Monthly is $29 and Pro Yearly is $99, plus applicable taxes.',
      'AdOptimize shows each supported change for approval before it is applied in Google Ads, and records the outcome in activity history.',
    ],
    title: 'WordStream vs AdOptimize: Which Google Ads Tool Fits Your Team?',
    description: 'Compare WordStream (LocaliQ) with AdOptimize on delivery model, published pricing, channel scope and how Google Ads changes are approved.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: '2026-11-26',
    intro: 'WordStream’s public site promotes managed marketing services built around a consultation. AdOptimize is self-serve software for Google Ads. This guide explains where each one fits so you can choose based on how you want to work, not on a headline.',
    sections: [
      {
        heading: 'The difference in delivery model',
        paragraphs: [
          'WordStream’s pricing link opens its marketing-services page, which invites visitors to book a free consultation. The page lists search, display, video and social advertising, plus listings and SEO services. It did not list per-plan prices.',
          'AdOptimize is software you use yourself. You connect your Google Ads account, the AI Marketing Agent investigates performance and drafts changes, and you approve each supported change before it runs.',
        ],
      },
      {
        heading: 'Pricing you can check before a sales call',
        paragraphs: [
          'AdOptimize publishes Pro Monthly at $29 and Pro Yearly at $99, plus applicable taxes. A free account lets you explore the dashboard and campaign data. Agent analysis and supported changes require Pro.',
          'A consultation-led service can be the right model when you want a team to own strategy and execution. Compare the scope of work, not only the monthly figure.',
        ],
      },
      {
        heading: 'How changes are handled',
        paragraphs: [
          'AdOptimize shows every supported change with its target and proposed values before anything happens in Google Ads.',
        ],
        bullets: [
          'Approved changes are applied in Google Ads and written to your activity history with the outcome.',
          'Unapproved proposals expire automatically and cannot be approved after that.',
          'If AdOptimize cannot confirm a change in Google Ads, it is marked unverified until it can be checked.',
        ],
      },
      {
        heading: 'Which one should you choose?',
        paragraphs: [],
        bullets: [
          'Choose WordStream if you want an outside team to run strategy and several channels for you.',
          'Choose AdOptimize if you run Google Ads yourself or with a small team, and want an agent that works in your account but waits for your approval.',
        ],
      },
      {
        heading: 'Questions to ask before you switch',
        paragraphs: [],
        bullets: [
          'Which Google Ads accounts and campaign types need coverage?',
          'Who approves changes, and where are they recorded?',
          'What is included in the price, and what costs extra?',
          'What happens to your data if you cancel?',
        ],
      },
    ],
    sources: [
      { label: 'WordStream marketing services', url: 'https://www.wordstream.com/marketing-services' },
    ],
    relatedCompareSlug: 'wordstream-alternative',
  },
  {
    slug: 'adspirer-vs-adoptimize',
    keyFacts: [
      'Adspirer bills by task. Its pricing page, checked on 26 November 2026, lists Free (15 tasks a month), Plus at $40, Pro at $83 and Max at $167 per month.',
      'Adspirer covers six ad platforms. AdOptimize covers Google Ads only.',
      'AdOptimize Pro is $29 per month or $99 per year, plus applicable taxes. Agent actions and supported changes require Pro.',
    ],
    title: 'Adspirer vs AdOptimize: Multi-Platform Agent or Focused Google Ads Tool?',
    description: 'Adspirer bills by task across six ad platforms. AdOptimize is a Google Ads agent with fixed Pro plans and approval before changes. Compare scope, pricing and control.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: '2026-11-26',
    intro: 'Adspirer and AdOptimize both use AI to help with paid media, but they are built for different scopes. Adspirer covers six ad platforms and bills by task. AdOptimize focuses on Google Ads and offers fixed Pro subscriptions.',
    sections: [
      {
        heading: 'Two different pricing models',
        paragraphs: [
          'Adspirer’s public pricing page lists a Free plan with 15 tasks a month, then Plus at $40, Pro at $83 and Max at $167 per month. Annual billing lowers those monthly figures. Agencies and Enterprise are quoted separately. The page says you pay for tasks, not a percentage of ad spend.',
          'AdOptimize offers Pro Monthly at $29 or Pro Yearly at $99, plus applicable taxes. Its free account includes the dashboard and campaign viewing, but agent actions and supported changes require Pro.',
        ],
      },
      {
        heading: 'Platform coverage',
        paragraphs: [
          'Adspirer says its agents are trained on Google, Meta, LinkedIn, TikTok, Amazon and ChatGPT Ads. AdOptimize works with Google Ads only. If most of your paid media runs outside Google, a multi-platform tool is the better fit.',
        ],
      },
      {
        heading: 'Approval and control',
        paragraphs: [
          'AdOptimize shows each supported change for approval before it is applied, and records the outcome. The Adspirer pricing page we reviewed focuses on what its agents do in chat tools and does not describe approval controls in detail. Check how each action is confirmed before you connect an account to any tool.',
        ],
      },
      {
        heading: 'Who should choose which',
        paragraphs: [],
        bullets: [
          'Choose Adspirer if you need one assistant across several ad platforms and are comfortable with task-based pricing.',
          'Choose AdOptimize if your work is Google Ads and you want fixed Pro pricing, a clear approval step and a record of each change.',
        ],
      },
      {
        heading: 'Before you decide',
        paragraphs: [],
        bullets: [
          'List every platform you need to manage.',
          'Estimate how many agent tasks your team would use each month.',
          'Test the approval step on a low-risk campaign before you rely on any tool.',
        ],
      },
    ],
    sources: [
      { label: 'Adspirer pricing', url: 'https://www.adspirer.com/pricing' },
    ],
    relatedCompareSlug: 'adspirer-alternative',
  },
  {
    slug: 'optmyzr-vs-adoptimize',
    keyFacts: [
      'Optmyzr offers Essentials, Premium and Enterprise plans chosen by monthly ad spend band. Its pricing page, checked on 26 November 2026, labels annual billing as saving 30%.',
      'Optmyzr’s comparison table lists rule-engine automations on schedules. AdOptimize proposes supported changes that you approve before they run.',
      'AdOptimize Pro is $29 per month or $99 per year, plus applicable taxes.',
    ],
    title: 'Optmyzr vs AdOptimize: Plan Tiers, Automation and Approval',
    description: 'Optmyzr prices by plan and monthly ad spend and offers rule-engine automation. Compare it with AdOptimize’s Google Ads agent on pricing, scope and change approval.',
    category: 'Comparison',
    publishedAt: '2026-11-26',
    updatedAt: '2026-11-26',
    intro: 'Optmyzr is a PPC software suite with plans chosen by ad spend and a wide set of tools. AdOptimize is a Google Ads agent with two Pro plans. This guide compares them on pricing, scope and control so you can match the tool to your workflow.',
    sections: [
      {
        heading: 'How Optmyzr prices its plans',
        paragraphs: [
          'Optmyzr’s pricing page asks for your monthly ad spend, offers Essentials, Premium and Enterprise plans, and lets you switch between monthly and annual billing. The annual option is labelled “Save 30%”. Free trials are listed with no credit card required. The price depends on the spend band you select, so check the figures on the page for your own spend.',
          'AdOptimize offers Pro Monthly at $29 or Pro Yearly at $99, plus applicable taxes, with no spend band.',
        ],
      },
      {
        heading: 'What each product covers',
        paragraphs: [
          'Optmyzr’s comparison table lists rule-engine automations, account and feed audits, bid and placement tools, cross-platform dashboards, and Meta and LinkedIn account tools. AdOptimize concentrates on Google Ads: account analysis, campaign creation, budget, bidding, keyword and targeting proposals, and approved execution.',
        ],
      },
      {
        heading: 'Automation versus approval',
        paragraphs: [
          'Optmyzr’s table highlights rule-engine automations that run on schedules, with the frequency depending on the plan. AdOptimize is built around proposals: the agent drafts a supported change, you approve it, and only then is it applied.',
          'If your priority is scheduled automation across many accounts and platforms, evaluate Optmyzr first. If you want an agent that proposes changes and waits for you, AdOptimize is designed for that workflow.',
        ],
      },
      {
        heading: 'Which tool fits your workflow?',
        paragraphs: [],
        bullets: [
          'Choose Optmyzr if you need rule-based automation and tools for several channels.',
          'Choose AdOptimize if you want a Google Ads agent that explains performance, prepares changes and applies only what you approve.',
        ],
      },
      {
        heading: 'Verify before you buy',
        paragraphs: [],
        bullets: [
          'Check the current price for your monthly ad spend band.',
          'Confirm which accounts and platforms each plan includes.',
          'Ask how each tool records changes and who can approve them.',
        ],
      },
    ],
    sources: [
      { label: 'Optmyzr pricing', url: 'https://www.optmyzr.com/pricing/' },
    ],
    relatedCompareSlug: 'optmyzr-alternative',
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
