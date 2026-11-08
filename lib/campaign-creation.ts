import { PendingCampaignCreation } from '@/lib/conversation-state';

/**
 * Campaign creation is a multi-turn task. The first message usually carries only
 * the objective (and sometimes the app URL); the name and budget arrive later.
 * These helpers keep that task deterministic so routing never depends solely on
 * a model response, and so a follow-up turn is never mistaken for an operation
 * on an existing campaign.
 */

export type CreationObjective =
  | 'APP_INSTALLS'
  | 'LEADS'
  | 'SALES'
  | 'TRAFFIC'
  | 'AWARENESS'
  | 'UNKNOWN';

export const CREATION_REQUIRED_FIELDS = ['name', 'budgetDaily'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '¥': 'JPY',
  '₹': 'INR',
  '₽': 'RUB',
  '₩': 'KRW',
  'R$': 'BRL',
};

const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL', 'SEK', 'NOK',
  'DKK', 'CHF', 'PLN', 'SGD', 'AED', 'NZD', 'ZAR', 'MXN',
];

const OBJECTIVE_PATTERNS: Array<{ objective: CreationObjective; pattern: RegExp }> = [
  { objective: 'APP_INSTALLS', pattern: /\b(app\s+installs?|installs?|downloads?|install\s+volume|app\s+promotion|promote\s+(?:my\s+)?app)\b/i },
  { objective: 'LEADS', pattern: /\b(leads?|lead\s+gen(?:eration)?|sign[\s-]?ups?|registrations?|demo\s+requests?|enquir(?:y|ies)|inquiries)\b/i },
  { objective: 'SALES', pattern: /\b(sales?|purchases?|revenue|conversions?\s+value|ecommerce|e-commerce|orders?)\b/i },
  { objective: 'TRAFFIC', pattern: /\b(traffic|clicks?|visits?|site\s+visits?)\b/i },
  { objective: 'AWARENESS', pattern: /\b(awareness|reach|impressions?|brand\s+visibility|views?)\b/i },
];

/**
 * Maps a business objective to the Google Ads channel that can actually serve it.
 * App installs require a multi-channel app campaign; there is no search-only
 * app-install campaign type.
 */
export function channelForObjective(objective: CreationObjective | undefined): string {
  switch (objective) {
    case 'APP_INSTALLS':
      return 'MULTI_CHANNEL';
    case 'AWARENESS':
      return 'DISPLAY';
    case 'LEADS':
    case 'SALES':
    case 'TRAFFIC':
    case 'UNKNOWN':
    default:
      return 'SEARCH';
  }
}

export function detectObjective(text: string): CreationObjective | undefined {
  for (const { objective, pattern } of OBJECTIVE_PATTERNS) {
    if (pattern.test(text)) return objective;
  }
  return undefined;
}

export function isCreationRequest(text: string): boolean {
  return /\b(create|make|build|launch|set\s+up|start|new)\b[\s\S]{0,40}\bcampaign\b/i.test(text) ||
    /\bcampaign\b[\s\S]{0,40}\b(create|make|build|launch|set\s+up|start)\b/i.test(text);
}

function extractCurrency(text: string): string | undefined {
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) return code;
  }
  const upper = text.toUpperCase();
  const code = CURRENCY_CODES.find((candidate) =>
    new RegExp(`\\b${candidate}\\b`).test(upper)
  );
  return code;
}

function extractBudget(text: string): number | undefined {
  const patterns = [
    /(?:[$£€¥₹₩]|R\$)\s*(\d+(?:[.,]\d{1,2})?)/,
    /(\d+(?:[.,]\d{1,2})?)\s*(?:usd|gbp|eur|cad|aud|dollars?|bucks|pounds?|euros?)\b/i,
    /\b(?:daily\s+)?budget(?:\s+of|\s+is|\s+at)?\s*[:=]?\s*(\d+(?:[.,]\d{1,2})?)/i,
    /\b(\d+(?:[.,]\d{1,2})?)\s*(?:\/\s*day|per\s+day|a\s+day|daily)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1].replace(',', '.'));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return undefined;
}

function extractAppUrl(text: string): string | undefined {
  const playStore = text.match(/https?:\/\/play\.google\.com\/store\/apps\/details\?[^\s,)"']+/i);
  if (playStore) return playStore[0];
  const appStore = text.match(/https?:\/\/apps\.apple\.com\/[^\s,)"']+/i);
  if (appStore) return appStore[0];
  const anyUrl = text.match(/https?:\/\/[^\s,)"']+/i);
  return anyUrl ? anyUrl[0] : undefined;
}

function cleanCampaignName(candidate: string): string | undefined {
  const cleaned = candidate
    .replace(/^[\s"'`]+|[\s"'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  if (cleaned.length > 120) return undefined;
  // Reject fragments that are clearly not a name.
  if (/^(?:a|an|the|it|this|that|one|new)$/i.test(cleaned)) return undefined;
  if (/^\d+(?:[.,]\d+)?$/.test(cleaned)) return undefined;
  return cleaned;
}

function extractCampaignName(text: string): string | undefined {
  const patterns = [
    /(?:let'?s\s+(?:say|call\s+it|name\s+it)|call\s+it|name\s+it|named|called)\s+["'`]?([^"'`,\n]+?)["'`]?(?=\s*(?:,|\.|$|\bwith\b|\bfor\b|\band\b|\bbudget\b))/i,
    /["'`]([^"'`\n]{3,80})["'`]\s*(?:campaign|as\s+the\s+name)/i,
    /\bcampaign\s+name\s*(?:is|:|=)\s*["'`]?([^"'`,\n]+?)["'`]?(?=\s*(?:,|\.|$|\band\b|\bbudget\b))/i,
    /\b(?:create|make|build|launch|set\s+up|start)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+)?(?:new\s+)?(?:google\s+ads\s+)?campaign\s+(?:called|named)\s+["'`]?([^"'`,\n]+?)["'`]?(?=\s*(?:,|\.|$|\bwith\b|\bfor\b|\band\b))/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = cleanCampaignName(match[1]);
      if (name) return name;
    }
  }
  return undefined;
}

/**
 * Deterministically extracts creation parameters from a message. Values already
 * captured in the draft are preserved unless the message supplies a new one.
 */
export function extractCreationParams(
  message: string,
  existing?: PendingCampaignCreation
): Partial<Omit<PendingCampaignCreation, 'requested_at' | 'updated_at'>> {
  const params: Partial<Omit<PendingCampaignCreation, 'requested_at' | 'updated_at'>> = {};

  const budget = extractBudget(message);
  if (budget !== undefined) params.budgetDaily = budget;

  const currency = extractCurrency(message);
  if (currency) params.currency = currency;

  const name = extractCampaignName(message);
  if (name) params.name = name;

  const appUrl = extractAppUrl(message);
  if (appUrl) {
    params.appUrl = appUrl;
    params.finalUrl = appUrl;
  }

  const objective = detectObjective(message);
  if (objective && objective !== 'UNKNOWN') params.objective = objective;

  // Carry forward anything the draft already knows so the merged result is complete.
  if (existing) {
    if (params.name === undefined && existing.name) params.name = existing.name;
    if (params.budgetDaily === undefined && existing.budgetDaily !== undefined) {
      params.budgetDaily = existing.budgetDaily;
    }
    if (params.currency === undefined && existing.currency) params.currency = existing.currency;
    if (params.objective === undefined && existing.objective) params.objective = existing.objective;
    if (params.appUrl === undefined && existing.appUrl) params.appUrl = existing.appUrl;
    if (params.finalUrl === undefined && existing.finalUrl) params.finalUrl = existing.finalUrl;
    if (params.channelType === undefined && existing.channelType) params.channelType = existing.channelType;
  }

  return params;
}

export function missingCreationFields(
  draft: Partial<PendingCampaignCreation> | undefined
): string[] {
  if (!draft) return [...CREATION_REQUIRED_FIELDS];
  const missing: string[] = [];
  if (!draft.name) missing.push('name');
  if (draft.budgetDaily === undefined || !Number.isFinite(draft.budgetDaily) || draft.budgetDaily <= 0) {
    missing.push('budgetDaily');
  }
  return missing;
}

export function creationClarificationQuestion(missing: string[]): string {
  const parts: string[] = [];
  if (missing.includes('name')) parts.push('campaign name');
  if (missing.includes('budgetDaily')) parts.push('daily budget (including currency)');
  if (parts.length === 0) return 'Please confirm the campaign name and daily budget.';
  if (parts.length === 1) return `What ${parts[0]} should I use for the new campaign?`;
  return `What ${parts[0]} and ${parts[1]} should I use for the new campaign?`;
}

/**
 * True when a message is supplying or revising parameters for an in-progress
 * campaign creation rather than acting on an existing campaign.
 */
export function looksLikeCreationContinuation(
  message: string,
  draft: PendingCampaignCreation | undefined
): boolean {
  if (!draft) return false;
  if (extractBudget(message) !== undefined) return true;
  if (extractCampaignName(message)) return true;
  if (extractAppUrl(message)) return true;
  if (detectObjective(message)) return true;
  if (extractCurrency(message)) return true;
  return false;
}
