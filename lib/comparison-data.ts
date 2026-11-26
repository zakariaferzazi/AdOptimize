export interface PSEOComparison {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  competitorName: string;
  tagline: string;
  keyFacts: string[];
  comparisonPoints: {
    feature: string;
    adoptimize: string;
    competitor: string;
  }[];
  verdict: string;
  faqs: { q: string; a: string }[];
  // Public pages used to write the competitor column. Omitted for generic comparisons.
  competitorSources?: { label: string; url: string }[];
  relatedBlogSlug?: string;
}

// Competitor cells come from each vendor's public pages, checked on 26 November 2026.
// Update them when a vendor changes its pricing or product scope.
export const PSEO_COMPARISONS: PSEOComparison[] = [
  {
    slug: 'google-ads-agency-vs-software',
    keyFacts: [
      'AdOptimize is self-serve software: Pro is $29 per month or $99 per year, plus applicable taxes.',
      'Agencies set pricing and responsibilities in their own agreements. Confirm scope, access and approval steps before you sign.',
      'AdOptimize proposes supported Google Ads changes for your approval and records the outcome.',
    ],
    title: 'Google Ads Agency vs. AI-Assisted Software',
    metaTitle: 'Google Ads Agency vs. AI Software | AdOptimize',
    metaDescription: 'Compare a Google Ads agency with AdOptimize software on scope, pricing, approval control and change history.',
    targetKeyword: 'Google Ads agency vs software',
    competitorName: 'Traditional PPC Agency',
    tagline: 'Compare agency-led campaign management with an approval-controlled AI workspace for Google Ads.',
    comparisonPoints: [
      { feature: 'Cost', adoptimize: '$29/month or $99/year, plus applicable taxes', competitor: 'Set in the agency agreement' },
      { feature: 'Audit frequency', adoptimize: 'On-demand analysis and account sync', competitor: 'Set in the service agreement' },
      { feature: 'Explaining changes', adoptimize: 'Account evidence and context attached to each proposal', competitor: 'Depends on the agency reporting process' },
      { feature: 'Human control', adoptimize: 'You approve each supported change before it is applied', competitor: 'Confirm approval responsibilities in the contract' },
      { feature: 'Change history', adoptimize: 'Activity history with the recorded outcome', competitor: 'Depends on the agency reporting process' },
      { feature: 'Commitment', adoptimize: 'Monthly or yearly; cancelling stops the next renewal', competitor: 'Set in the agency agreement' },
    ],
    verdict: 'AdOptimize may suit teams that want account-aware analysis and approval-controlled software. An agency may be the better choice when you need creative production, strategy, media buying or hands-on service.',
    faqs: [
      {
        q: 'Can I use AdOptimize if I already have an agency?',
        a: 'Yes. AdOptimize can add an analysis and proposal workspace, but confirm access, account ownership and responsibilities with your agency first.',
      },
      {
        q: 'What if I need custom ad creative or landing pages?',
        a: 'AdOptimize focuses on supported Google Ads analysis and account changes. Creative production, video, landing-page work and broader strategy services are outside its core capabilities.',
      },
    ],
  },
  {
    slug: 'wordstream-alternative',
    keyFacts: [
      'WordStream (LocaliQ) promotes managed marketing services and a free consultation. Its pricing page listed no per-plan prices, checked on 26 November 2026.',
      'AdOptimize is self-serve Google Ads software with Pro at $29 per month or $99 per year, plus applicable taxes.',
      'AdOptimize shows each supported change for approval before it is applied.',
    ],
    title: 'AdOptimize vs. WordStream',
    metaTitle: 'WordStream Alternative for Google Ads | AdOptimize',
    metaDescription: 'Compare WordStream (LocaliQ) with AdOptimize on delivery model, published pricing and approval before Google Ads changes.',
    targetKeyword: 'WordStream alternative',
    competitorName: 'WordStream (LocaliQ)',
    tagline: 'WordStream’s public site promotes managed marketing services. AdOptimize is self-serve software for Google Ads that waits for your approval.',
    comparisonPoints: [
      { feature: 'Delivery model', adoptimize: 'Self-serve software with an AI Marketing Agent for Google Ads', competitor: 'Managed marketing services, with a free consultation offered' },
      { feature: 'Published pricing', adoptimize: 'Pro Monthly $29 or Pro Yearly $99, plus taxes', competitor: 'No per-plan prices listed on the page reviewed' },
      { feature: 'Channels', adoptimize: 'Google Ads only', competitor: 'Search, display, video and social advertising, plus listings and SEO services' },
      { feature: 'Change approval', adoptimize: 'Each supported change is proposed and approved before it is applied', competitor: 'Confirm approval steps in the service agreement' },
      { feature: 'Activity record', adoptimize: 'Activity history with the recorded outcome of each approved change', competitor: 'Confirm reporting in the service agreement' },
    ],
    verdict: 'Choose WordStream if you want an outside team to run strategy and several channels for you. Choose AdOptimize if you run Google Ads yourself or with a small team and want an agent that waits for your approval.',
    faqs: [
      {
        q: 'Is AdOptimize a managed service?',
        a: 'No. AdOptimize is self-serve software. You connect your own Google Ads account, review each proposal and approve the changes you want applied.',
      },
      {
        q: 'Does AdOptimize publish prices?',
        a: 'Yes. Pro Monthly is $29 and Pro Yearly is $99, plus applicable taxes. A free account lets you explore the dashboard and campaign data.',
      },
    ],
    competitorSources: [
      { label: 'WordStream marketing services', url: 'https://www.wordstream.com/marketing-services' },
    ],
    relatedBlogSlug: 'wordstream-vs-adoptimize',
  },
  {
    slug: 'optmyzr-alternative',
    keyFacts: [
      'Optmyzr prices its Essentials and Premium plans by monthly ad spend band, and labels annual billing as saving 30%, checked on 26 November 2026.',
      'Optmyzr’s comparison table lists rule-engine automations. AdOptimize proposes changes that you approve before they run.',
      'AdOptimize is a Google Ads-only agent. Pro is $29 per month or $99 per year, plus applicable taxes.',
    ],
    title: 'AdOptimize vs. Optmyzr',
    metaTitle: 'Optmyzr Alternative for Google Ads | AdOptimize',
    metaDescription: 'Compare Optmyzr plans with AdOptimize on pricing model, channel scope, automation and change approval.',
    targetKeyword: 'Optmyzr alternative',
    competitorName: 'Optmyzr',
    tagline: 'Optmyzr is a PPC software suite with plans chosen by ad spend. AdOptimize is a Google Ads agent with two Pro plans and approval before changes.',
    comparisonPoints: [
      { feature: 'Pricing model', adoptimize: '$29 per month or $99 per year, plus taxes', competitor: 'Essentials, Premium and Enterprise plans, chosen by monthly ad spend band' },
      { feature: 'Free trial', adoptimize: 'Free account to explore the dashboard; Pro needed for agent actions', competitor: 'Free trial listed with no credit card required' },
      { feature: 'Channels', adoptimize: 'Google Ads only', competitor: 'Google Ads plus Meta and LinkedIn account tools' },
      { feature: 'Automation', adoptimize: 'Agent proposes changes; you approve each supported change', competitor: 'Rule-engine automations on schedules listed in its comparison table' },
      { feature: 'Audits and reporting', adoptimize: 'Account analysis, performance explanations and activity history', competitor: 'Account audits, feed audits and cross-platform dashboards listed' },
    ],
    verdict: 'Evaluate both products against your channels, your need for scheduled rules and the current prices for your ad spend band. AdOptimize is a better fit when you want a Google Ads agent that proposes changes for approval.',
    faqs: [
      {
        q: 'Can a solo advertiser use AdOptimize?',
        a: 'Yes. Founders and in-house marketers can use it. Results depend on your account data and the changes you approve, and no outcome is guaranteed.',
      },
      {
        q: 'Does AdOptimize run scheduled rules?',
        a: 'No. AdOptimize is built around proposals. The agent drafts a supported change, and it is applied only after you approve it.',
      },
    ],
    competitorSources: [
      { label: 'Optmyzr pricing', url: 'https://www.optmyzr.com/pricing/' },
    ],
    relatedBlogSlug: 'optmyzr-vs-adoptimize',
  },
  {
    slug: 'adspirer-alternative',
    keyFacts: [
      'Adspirer bills by task across six ad platforms: Free (15 tasks a month), Plus $40, Pro $83 and Max $167 per month, checked on 26 November 2026.',
      'AdOptimize is a Google Ads-only agent with fixed Pro pricing of $29 per month or $99 per year, plus applicable taxes.',
      'AdOptimize shows supported changes for approval before they run in Google Ads.',
    ],
    title: 'AdOptimize vs. Adspirer',
    metaTitle: 'Adspirer Alternative for Google Ads | AdOptimize',
    metaDescription: 'Compare Adspirer task-based plans with AdOptimize Pro on platform scope, pricing model and approval before Google Ads changes.',
    targetKeyword: 'Adspirer alternative',
    competitorName: 'Adspirer',
    tagline: 'Adspirer covers six ad platforms with task-based plans. AdOptimize focuses on Google Ads with fixed Pro pricing and approval before changes.',
    comparisonPoints: [
      { feature: 'Pricing model', adoptimize: '$29 per month or $99 per year, plus taxes', competitor: 'Task-based plans: Free (15 tasks a month), Plus $40, Pro $83 and Max $167 per month, lower when billed annually' },
      { feature: 'Platform coverage', adoptimize: 'Google Ads only', competitor: 'Six ad platforms, including Google, Meta, LinkedIn, TikTok, Amazon and ChatGPT Ads' },
      { feature: 'Where you work', adoptimize: 'AdOptimize web workspace with the AI Marketing Agent', competitor: 'Works inside ChatGPT and Claude, per its pricing page' },
      { feature: 'Change approval', adoptimize: 'Each supported change is shown for approval before it runs', competitor: 'Confirm approval controls for each action type before connecting an account' },
      { feature: 'Free access', adoptimize: 'Free account for dashboard and campaign viewing; agent actions need Pro', competitor: 'Free plan that includes 15 agent tasks a month' },
    ],
    verdict: 'Choose Adspirer if you need one assistant across several ad platforms and are comfortable with task-based pricing. Choose AdOptimize if your work is Google Ads and you want fixed Pro pricing with approval before changes.',
    faqs: [
      {
        q: 'Do I need to pay to try AdOptimize?',
        a: 'A free account lets you explore the dashboard and campaign data. Agent analysis and supported changes require Pro.',
      },
      {
        q: 'How is AdOptimize different from chat-based media buyers?',
        a: 'AdOptimize keeps a record of each proposal, the approval, and the recorded result, so you can review why a change was proposed and what happened after it was applied.',
      },
    ],
    competitorSources: [
      { label: 'Adspirer pricing', url: 'https://www.adspirer.com/pricing' },
    ],
    relatedBlogSlug: 'adspirer-vs-adoptimize',
  },
];
