import { BLOG_POSTS } from '@/lib/blog-data';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { absoluteUrl, SITE_CONTENT_UPDATED, SITE_NAME } from '@/lib/seo';

// Plain-text index for AI assistants and crawlers (https://llmstxt.org). Facts here must match the pricing and approval model.
export function buildLlmsTxt(): string {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_NAME} is an executable AI Marketing Agent for Google Ads. It creates Search and App campaigns, manages budgets, bidding, keywords and targeting, investigates performance and wasted spend, and applies approved changes directly in Google Ads. It is self-serve software, not a managed agency service.`,
    '',
    '## Key facts',
    '',
    '- Product: AI marketing agent for Google Ads only.',
    '- Pricing: Pro Monthly is $29 per month. Pro Yearly is $99 per year. Applicable taxes are added at checkout. Subscriptions renew until canceled.',
    '- Free account: explore the dashboard and campaign data. Agent analysis and supported changes require Pro.',
    '- Approval: each supported change is shown for approval before it is applied in Google Ads. Unapproved proposals expire automatically.',
    '- Records: approved changes and their outcomes are kept in activity history. A change that cannot be confirmed in Google Ads is marked unverified.',
    `- Content last updated: ${SITE_CONTENT_UPDATED}.`,
    '- Support: support@adoptimize.app',
    '',
    '## Product pages',
    '',
    `- [Home](${absoluteUrl('/')}): product overview and pricing summary`,
    `- [Pricing](${absoluteUrl('/pricing')}): Pro Monthly and Pro Yearly plans`,
    `- [Features](${absoluteUrl('/features')}): analysis, campaign creation, budgets, bidding, keywords and approvals`,
    `- [Security](${absoluteUrl('/security')}): Google authorization and how connection credentials are handled`,
    `- [Service providers](${absoluteUrl('/subprocessors')}): providers used to run the service`,
    `- [FAQ](${absoluteUrl('/faq')}): subscriptions, Google Ads connections, approvals, billing and cancellation`,
    '',
    '## Comparisons',
    '',
    ...PSEO_COMPARISONS.map((comp) => `- [${comp.title}](${absoluteUrl(`/compare/${comp.slug}`)}): ${comp.tagline}`),
    '',
    '## Blog',
    '',
    ...BLOG_POSTS.map((post) => `- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)}): ${post.description}`),
    '',
    '## Policies',
    '',
    `- [Privacy policy](${absoluteUrl('/privacy-policy')})`,
    `- [Terms of service](${absoluteUrl('/terms-of-service')})`,
    `- [Billing, cancellation and refund policy](${absoluteUrl('/refund-policy')})`,
    `- [Cookie policy](${absoluteUrl('/cookie-policy')})`,
    '',
  ];
  return lines.join('\n');
}
