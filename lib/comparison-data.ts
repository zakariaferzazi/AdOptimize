export interface PSEOComparison {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  competitorName: string;
  tagline: string;
  keyFacts: string[];
  checkedAt: string;
  pricing?: { label: string; detail: string; sourceUrl: string };
  comparisonPoints: { feature: string; adoptimize: string; competitor: string }[];
  verdict: string;
  faqs: { q: string; a: string }[];
  competitorSources?: { label: string; url: string }[];
  relatedBlogSlug?: string;
}

export const COMPARISON_CHECKED_AT = '2026-11-27';
const proPrice = '$29/month or $99/year ($8.25/month equivalent), plus applicable taxes';
const agentWork = 'Analyze performance, create Search and App campaigns, and apply approved budget, bid, keyword and targeting changes';

export const PSEO_COMPARISONS: PSEOComparison[] = [
  {
    slug: 'google-ads-agency-vs-software',
    title: 'AdOptimize vs. a Google Ads Agency',
    metaTitle: 'Google Ads Agency vs. AI Marketing Agent | AdOptimize',
    metaDescription: 'Delegate Google Ads campaign creation, management and optimization to AdOptimize. Compare $29/month Pro with an agency service agreement.',
    targetKeyword: 'Google Ads agency vs software',
    competitorName: 'PPC Agency',
    checkedAt: COMPARISON_CHECKED_AT,
    tagline: 'Keep your strategy in-house and delegate the Google Ads account work to an executable AI Marketing Agent.',
    keyFacts: [
      `AdOptimize Pro costs ${proPrice}.`,
      'The agent builds campaigns, manages budgets and bidding, and executes approved account changes.',
      'Agency fees depend on the service agreement; they are not comparable to a software subscription without checking the scope.',
    ],
    comparisonPoints: [
      { feature: 'Price', adoptimize: proPrice, competitor: 'Custom service fee; request a quote and separate it from media spend' },
      { feature: 'Account work', adoptimize: agentWork, competitor: 'Campaign management and other services as agreed with the agency' },
      { feature: 'Getting work done', adoptimize: 'Describe the task, review the plan and let the agent execute it', competitor: 'Brief your account manager through the agreed process' },
      { feature: 'Change history', adoptimize: 'Proposals, approvals and execution outcomes in your workspace', competitor: 'Reporting and account access depend on the agreement' },
    ],
    verdict: 'AdOptimize is a practical choice when you know your offer and audience but want help doing the Google Ads work. Pro gives you campaign creation, account management and optimization without buying a managed-service package. Creative production and broader strategy services are separate needs, not capabilities we claim to replace.',
    faqs: [
      { q: 'Can I use AdOptimize alongside my agency?', a: 'Yes. Use it to investigate performance and carry out approved account tasks. Agree on account access and who owns each change with your agency.' },
      { q: 'What do I delegate to the agent?', a: 'Campaign builds, budget and bidding updates, keywords and negatives, locations, campaign status and supported conversion settings. You review the changes before execution.' },
    ],
  },
  {
    slug: 'wordstream-alternative',
    title: 'AdOptimize vs. WordStream Advisor',
    metaTitle: 'WordStream Advisor Alternative: Pricing & Campaign Execution | AdOptimize',
    metaDescription: 'WordStream Advisor still lists $49/month on a legacy page. Compare it with AdOptimize, an executable Google Ads agent from $29/month or $99/year.',
    targetKeyword: 'WordStream alternative',
    competitorName: 'WordStream Advisor',
    checkedAt: COMPARISON_CHECKED_AT,
    pricing: {
      label: '$49/month listed',
      detail: 'Legacy Advisor page; Buy Now points to example.com. Current LocaliQ services require a quote.',
      sourceUrl: 'https://www.wordstream.com/wordstream-advisor',
    },
    tagline: 'Move beyond a legacy software listing. Get a Google Ads agent that builds, manages and optimizes campaigns with clear Pro pricing.',
    keyFacts: [
      'The Advisor page lists $49/month, but its Buy Now links lead to example.com. This is not a verified current purchase price.',
      `AdOptimize Pro costs ${proPrice}.`,
      'AdOptimize carries out approved campaign, budget, bidding and keyword changes instead of leaving you to implement advice manually.',
    ],
    comparisonPoints: [
      { feature: 'Price', adoptimize: proPrice, competitor: '$49/month on the legacy Advisor page; current marketing services are quote-based' },
      { feature: 'Buying the product', adoptimize: 'Self-serve Pro subscription', competitor: 'Advisor Buy Now links point to example.com; current pricing leads to a consultation' },
      { feature: 'Workflow', adoptimize: 'Brief your agent, review the proposed work, and execute it in Google Ads', competitor: 'Legacy page describes a guided optimization workflow, alerts and reporting' },
      { feature: 'Campaign work', adoptimize: agentWork, competitor: 'Legacy page lists keyword research, creative tools, reporting and landing-page tools' },
      { feature: 'Focus', adoptimize: 'Google Ads campaign management and optimization', competitor: 'Legacy Advisor page describes cross-platform advertising; LocaliQ offers managed marketing services' },
    ],
    verdict: 'For a self-serve Google Ads tool you can subscribe to today, AdOptimize offers a clear path: $29 monthly or $99 yearly, campaign creation and management, and an agent that executes approved changes. Do not use the old $49 Advisor listing as a quote for LocaliQ services; those are a different product and buying process.',
    faqs: [
      { q: 'Can I buy WordStream Advisor for $49/month?', a: 'The page we checked lists that price, but its Buy Now links point to example.com. Ask WordStream to confirm availability; do not treat the listing as a current checkout offer.' },
      { q: 'Why use AdOptimize instead of asking for a service quote?', a: 'If you want to keep control of Google Ads and delegate campaign tasks rather than outsource your marketing, AdOptimize gives you an executable agent and published Pro prices.' },
    ],
    competitorSources: [
      { label: 'WordStream Advisor legacy pricing and checkout links', url: 'https://www.wordstream.com/wordstream-advisor' },
      { label: 'WordStream current marketing services', url: 'https://www.wordstream.com/marketing-services' },
    ],
    relatedBlogSlug: 'wordstream-vs-adoptimize',
  },
  {
    slug: 'optmyzr-alternative',
    title: 'AdOptimize vs. Optmyzr',
    metaTitle: 'Optmyzr Alternative: $29/month Google Ads Agent | AdOptimize',
    metaDescription: 'Compare Optmyzr Essentials at $209/month on annual billing or $299 monthly with AdOptimize Pro at $29/month or $99/year. Scope and plan limits differ.',
    targetKeyword: 'Optmyzr alternative',
    competitorName: 'Optmyzr',
    checkedAt: COMPARISON_CHECKED_AT,
    pricing: {
      label: 'From $209/month',
      detail: 'Standard Essentials entry rate, billed annually; $299 month-to-month. Spend tiers and promotions vary.',
      sourceUrl: 'https://www.optmyzr.com/pricing/',
    },
    tagline: 'Get campaign creation, account management and optimization in one Google Ads conversation, with a lower entry subscription price.',
    keyFacts: [
      'Optmyzr pricing data lists Essentials at $209/month on annual billing and $299 month-to-month in the entry spend band. Promotional rates may be lower.',
      `AdOptimize Pro costs ${proPrice}.`,
      'AdOptimize handles campaign builds and approved account changes; Optmyzr also offers a broader toolkit and scheduled rule-engine automation.',
    ],
    comparisonPoints: [
      { feature: 'Price', adoptimize: proPrice, competitor: 'Essentials entry rate: $209/month annually or $299 month-to-month, before promotions' },
      { feature: 'Campaign work', adoptimize: agentWork, competitor: 'PPC optimization, audits, bidding tools and rule-engine automation' },
      { feature: 'Workflow', adoptimize: 'Describe the outcome and have the agent carry out approved changes', competitor: 'Configure tools and rules for the workflows you need' },
      { feature: 'Platforms', adoptimize: 'Focused on Google Ads', competitor: 'Broader PPC suite, including Google and Microsoft Ads and social-account tools' },
      { feature: 'Scheduled rules', adoptimize: 'Request-driven agent work with approval before changes', competitor: 'Scheduled rule-engine automation; frequency depends on the plan' },
    ],
    verdict: 'AdOptimize is built for marketers who want Google Ads work done through an agent, not another collection of tools to configure. Pro starts at $29 monthly or $99 yearly and includes campaign builds, budget and bid management, and approved execution. Optmyzr has broader channel and scheduled-rule capabilities; compare those needs separately rather than assuming the feature sets are identical.',
    faqs: [
      { q: 'Is the $209 Optmyzr price a monthly subscription?', a: 'It is the standard monthly equivalent under annual billing at the entry spend band. The listed month-to-month rate is $299. Promotions and other spend bands can change the quote.' },
      { q: 'What makes AdOptimize a practical alternative?', a: 'You can describe a campaign or optimization task in plain language and have the agent build and apply approved changes, with Pro at $29/month or $99/year.' },
    ],
    competitorSources: [{ label: 'Optmyzr pricing, spend bands and billing options', url: 'https://www.optmyzr.com/pricing/' }],
    relatedBlogSlug: 'optmyzr-vs-adoptimize',
  },
  {
    slug: 'adspirer-alternative',
    title: 'AdOptimize vs. Adspirer',
    metaTitle: 'Adspirer Alternative: Google Ads Management Agent | AdOptimize',
    metaDescription: 'Compare Adspirer task-based pricing with AdOptimize Pro: campaign creation, account management and approved optimization at $29/month or $99/year.',
    targetKeyword: 'Adspirer alternative',
    competitorName: 'Adspirer',
    checkedAt: COMPARISON_CHECKED_AT,
    pricing: {
      label: 'Plus from $40/month',
      detail: 'Displayed with annual billing; 150 tasks/month. Pro $83 and Max $167 are also shown with annual billing.',
      sourceUrl: 'https://www.adspirer.com/pricing',
    },
    tagline: 'Your Google Ads agent, in your own workspace, with two clear Pro subscription options.',
    keyFacts: [
      'Adspirer displays Plus at $40/month, Pro at $83 and Max at $167 alongside annual-billing labels, with different task allowances.',
      `AdOptimize Pro costs ${proPrice}.`,
      'AdOptimize combines campaign creation, budget and bidding management, keyword work and approved execution in a dedicated Google Ads workspace.',
    ],
    comparisonPoints: [
      { feature: 'Paid price', adoptimize: proPrice, competitor: 'Displayed annual-billing rates: Plus $40, Pro $83, Max $167 per month' },
      { feature: 'Pricing model', adoptimize: 'Two Pro subscription intervals with the same capabilities', competitor: 'Task-based tiers; Plus 150, Pro 600, Max 3,000 tasks/month' },
      { feature: 'Campaign work', adoptimize: agentWork, competitor: 'Agent campaign creation and operations across six ad platforms; capabilities vary by tier' },
      { feature: 'Workspace', adoptimize: 'Campaign data, agent conversations and execution history together', competitor: 'Agents available through chat tools including ChatGPT and Claude' },
      { feature: 'Platform scope', adoptimize: 'Dedicated Google Ads management', competitor: 'Google, Meta, LinkedIn, TikTok, Amazon and ChatGPT Ads' },
    ],
    verdict: 'If Google Ads is the account you want to delegate, AdOptimize puts the agent, your campaign data and your change history in one workspace. Start Pro at $29 monthly or $99 yearly and use it for campaign creation, management and optimization. For a Google Ads-first workflow, it is a straightforward alternative to selecting a multi-platform, task-based tier.',
    faqs: [
      { q: 'Can AdOptimize do more than analyze my account?', a: 'Yes. It creates Search and App campaigns and applies approved budget, bidding, keyword, targeting and campaign-status changes directly in Google Ads.' },
      { q: 'What can I see before subscribing?', a: 'Create a free account to explore the dashboard and campaign data. Pro unlocks the agent, audits, reports and campaign management.' },
    ],
    competitorSources: [{ label: 'Adspirer pricing and task allowances', url: 'https://www.adspirer.com/pricing' }],
    relatedBlogSlug: 'adspirer-vs-adoptimize',
  },
  {
    slug: 'opteo-alternative',
    title: 'AdOptimize vs. Opteo',
    metaTitle: 'Opteo Alternative: Google Ads Agent Pricing | AdOptimize',
    metaDescription: 'Opteo Basic is $129/month. Compare its multi-platform toolkit with AdOptimize campaign creation, management and optimization at $29/month or $99/year.',
    targetKeyword: 'Opteo alternative',
    competitorName: 'Opteo',
    checkedAt: COMPARISON_CHECKED_AT,
    pricing: {
      label: 'From $129/month',
      detail: 'Basic: 10 accounts and $25,000 monthly connected spend. Higher tiers increase those limits.',
      sourceUrl: 'https://opteo.com/pricing',
    },
    tagline: 'Delegate Google Ads campaign work without starting at a $129/month toolkit subscription.',
    keyFacts: [
      'Opteo Basic is $129/month with 10 accounts and $25,000 connected monthly spend. Professional is $249 and Agency is $499.',
      `AdOptimize offers executable Google Ads campaign work at ${proPrice}.`,
      'AdOptimize builds Search and App campaigns and applies approved budget, bidding, keyword and targeting changes in your workspace.',
      'Opteo advertises an AI agent and tools for several advertising platforms.',
    ],
    comparisonPoints: [
      { feature: 'Price', adoptimize: proPrice, competitor: 'Basic $129/month; Professional $249; Agency $499' },
      { feature: 'Entry plan scope', adoptimize: 'Google Ads campaign creation, management and optimization', competitor: 'Basic includes 10 accounts and $25,000 connected monthly spend' },
      { feature: 'Agent work', adoptimize: agentWork, competitor: 'AI agent, recommendations and implementation tools described on its website' },
      { feature: 'Platform scope', adoptimize: 'Dedicated Google Ads workspace', competitor: 'Google, Meta, Microsoft, LinkedIn and TikTok Ads advertised' },
    ],
    verdict: 'AdOptimize is a lower-entry-price option for marketers who want to delegate Google Ads work to an executable agent. You get campaign creation, account management and approved optimization at $29 monthly or $99 yearly. Compare Opteo’s additional platform tools against your actual needs; AdOptimize keeps the focus on getting your Google Ads work done in one workspace.',
    faqs: [
      { q: 'What is Opteo starting pricing?', a: 'The official pricing page lists Basic at $129/month, with 10 accounts and $25,000 monthly connected spend. Professional and Agency tiers cost more.' },
      { q: 'Why consider AdOptimize?', a: 'It gives you a dedicated Google Ads agent for campaign creation and account management at a lower entry subscription price, while keeping approval and execution history in your workspace.' },
    ],
    competitorSources: [
      { label: 'Opteo official pricing and plan limits', url: 'https://opteo.com/pricing' },
      { label: 'Opteo agent and platform coverage', url: 'https://opteo.com/' },
    ],
    relatedBlogSlug: 'opteo-vs-adoptimize',
  },
  {
    slug: 'pace-alternative',
    title: 'AdOptimize vs. Pace',
    metaTitle: 'Pace Alternative: Google Ads Campaign Agent | AdOptimize',
    metaDescription: 'Pace Basic starts at $49/month, with its Dot agent in One at $199. Compare Google Ads campaign work with AdOptimize Pro at $29/month or $99/year.',
    targetKeyword: 'Pace alternative',
    competitorName: 'Pace',
    checkedAt: COMPARISON_CHECKED_AT,
    pricing: {
      label: 'From $49/month',
      detail: 'Basic, billed monthly, up to $25,000 managed spend. Dot AI chat agent is listed in One at $199/month.',
      sourceUrl: 'https://paceads.com/pricing',
    },
    tagline: 'Get an executable Google Ads agent in Pro, rather than choosing a higher pacing tier to access an AI chat agent.',
    keyFacts: [
      'Pace Basic is $49/month, Pro is $99 and One is $199 on monthly billing. Its Dot AI chat agent is listed in One.',
      'Pace focuses on cross-platform budget pacing and also offers Google Ads editing and optimization tools.',
      `AdOptimize Pro includes campaign creation, management and approved execution at ${proPrice}.`,
    ],
    comparisonPoints: [
      { feature: 'Price', adoptimize: proPrice, competitor: 'Basic $49/month; Pro $99; One $199, billed monthly' },
      { feature: 'Agent access', adoptimize: 'AI Marketing Agent included in both Pro intervals', competitor: 'Dot AI chat agent listed in One at $199/month' },
      { feature: 'Campaign work', adoptimize: agentWork, competitor: 'Budget pacing, Google Ads editing and additional optimization tools by tier' },
      { feature: 'Platform scope', adoptimize: 'Google Ads management and optimization', competitor: 'Budget pacing across eight ad platforms' },
      { feature: 'Working model', adoptimize: 'Ask for a task and review it before the agent applies changes', competitor: 'Scheduled pacing runs and spend protection; frequency and tools depend on tier' },
    ],
    verdict: 'If your priority is building and managing Google Ads through an agent, AdOptimize puts those capabilities in Pro at $29 monthly or $99 yearly. Pace is a cross-platform pacing product with other tools layered by tier, and its Dot agent appears in the $199/month One plan. Compare the tier that includes the work you need, not just each product\'s lowest price.',
    faqs: [
      { q: 'Does the $49 Pace plan include its AI chat agent?', a: 'Its public plan list puts the Dot AI chat agent in One at $199/month on monthly billing. Basic includes pacing and Google Ads editing, so it is not the same feature bundle as AdOptimize Pro.' },
      { q: 'What does AdOptimize Pro include for campaign work?', a: 'An agent for Search and App campaign creation, budget and bidding adjustments, keywords and negatives, supported targeting settings and approved Google Ads execution.' },
    ],
    competitorSources: [{ label: 'Pace pricing, spend limits and Dot agent tier', url: 'https://paceads.com/pricing' }],
    relatedBlogSlug: 'pace-vs-adoptimize',
  },
];
