import { Check } from 'lucide-react';

export const proFeatures = [
  {
    summary: 'AI Marketing Agent to build, manage and optimize campaigns',
    title: 'Delegate the work, not just the analysis',
    description: 'Tell the agent what you want to achieve. It investigates your account, builds campaign plans and carries out approved changes in Google Ads.',
  },
  {
    summary: 'Search and App campaigns built from your brief',
    title: 'Go from a brief to a campaign',
    description: 'Describe your offer, audience and budget. The agent prepares campaign settings and the required structure, then creates the campaign after approval.',
  },
  {
    summary: 'Budget and bid adjustments for your CPA and ROAS goals',
    title: 'Put your budget to better use',
    description: 'Find spend that is not converting and opportunities worth investigating. Have the agent adjust budgets, bidding targets and CPC limits around your goals.',
  },
  {
    summary: 'Keywords, negatives, locations and conversion goals',
    title: 'Reach more relevant searches',
    description: 'Turn search-term findings into keyword and negative-keyword changes. Refine locations and conversion goals without navigating every setting yourself.',
  },
  {
    summary: 'Approved updates applied directly in Google Ads',
    title: 'Move from a decision to action',
    description: 'Review the proposed update, then let the agent apply it to your connected account. You do not have to copy recommendations into Google Ads by hand.',
  },
  {
    summary: 'Account audits, reports and change history',
    title: 'See what changed and why',
    description: 'Use account audits and performance reports to plan your next move. Follow proposals, approvals and execution results in your activity history.',
  },
];

export function ProPlanFeatures({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`mt-6 flex-1 border-t pt-6 ${dark ? 'border-white/25' : 'border-[#DDD6FE]'}`}>
      <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#2E1065]'}`}>Your subscription includes</p>
      <ul className="mt-4 space-y-3">
        {proFeatures.map((feature) => (
          <li key={feature.title} className={`flex items-start gap-2.5 text-sm leading-6 ${dark ? 'text-white' : 'text-[#1F2937]'}`}>
            <Check className={`mt-1 h-4 w-4 shrink-0 ${dark ? 'text-[#DDD6FE]' : 'text-[#6D28D9]'}`} aria-hidden="true" />
            <span>{feature.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
