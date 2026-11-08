import { sendOpenRouterChat } from '@/lib/openrouter-service';
import { GOOGLE_ADS_OPERATION_REGISTRY } from '@/lib/google-ads-tools';
import { compactConversationState, ConversationState } from '@/lib/conversation-state';

export type ChatIntent =
  | 'question'
  | 'analysis_request'
  | 'propose_change'
  | 'modify_proposal'
  | 'approve'
  | 'cancel'
  | 'clarification_answer'
  | 'unrelated';

export interface ChatClassification {
  intent: ChatIntent;
  operation: string | null;
  target_ref: {
    kind: 'id' | 'name' | 'current_focus' | 'none';
    value: string;
  };
  params: Record<string, unknown>;
  missing_fields: string[];
  confidence: number;
  clarification_question: string | null;
}

const INTENTS = new Set<ChatIntent>([
  'question',
  'analysis_request',
  'propose_change',
  'modify_proposal',
  'approve',
  'cancel',
  'clarification_answer',
  'unrelated',
]);

function isClassification(value: unknown): value is ChatClassification {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChatClassification>;
  return (
    typeof candidate.intent === 'string' &&
    INTENTS.has(candidate.intent as ChatIntent) &&
    (candidate.operation === null || typeof candidate.operation === 'string') &&
    Boolean(candidate.target_ref) &&
    typeof candidate.target_ref?.kind === 'string' &&
    ['id', 'name', 'current_focus', 'none'].includes(candidate.target_ref.kind) &&
    typeof candidate.target_ref.value === 'string' &&
    Boolean(candidate.params && typeof candidate.params === 'object' && !Array.isArray(candidate.params)) &&
    Array.isArray(candidate.missing_fields) &&
    candidate.missing_fields.every((field) => typeof field === 'string') &&
    typeof candidate.confidence === 'number' &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    (candidate.clarification_question === null || typeof candidate.clarification_question === 'string')
  );
}

function parseClassification(reply: string): ChatClassification | undefined {
  try {
    const parsed = JSON.parse(reply);
    if (!isClassification(parsed)) return undefined;
    if (
      parsed.operation !== null &&
      !GOOGLE_ADS_OPERATION_REGISTRY.some((operation) => operation.name === parsed.operation)
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function classifierPrompt(state: ConversationState, pendingProposal: unknown, operations: string): string {
  return `Classify the user's latest message for a Google Ads chat system.
Return ONLY one JSON object. No markdown, no explanation, no code fences.
Schema:
{
  "intent": "question" | "analysis_request" | "propose_change" | "modify_proposal" | "approve" | "cancel" | "clarification_answer" | "unrelated",
  "operation": string | null,
  "target_ref": {"kind": "id" | "name" | "current_focus" | "none", "value": string},
  "params": object,
  "missing_fields": string[],
  "confidence": number,
  "clarification_question": string | null
}
Use only operation names from the supplied registry. Normalize numeric amounts into numbers and preserve the supplied currency in params.currency when present.
An approval is only a request to show the latest approval card again; it never authorizes execution.
Do not infer missing campaign identity when more than one candidate could match.

CAMPAIGN CREATION IS A MULTI-TURN TASK:
- Creating a campaign is not an operation on an existing campaign. When the user asks for a new campaign, use operation "create_campaign" and intent "propose_change".
- If SERVER CONVERSATION STATE contains a non-null "pending_campaign_creation", a campaign creation is already in progress. The latest message is almost certainly supplying the remaining creation parameters (name, daily budget, currency, channel, objective, app URL) or revising them. Keep operation "create_campaign" and intent "propose_change", and merge the new values into params. Never switch to an existing-campaign operation such as update_campaign_budget, pause_campaign, enable_campaign, or analyze_campaign just because the account has campaigns with similar words.
- For create_campaign, set target_ref to {"kind": "none", "value": ""}. A new campaign has no existing campaign ID, so never ask the user to choose an existing campaign.
- Put every creation parameter you can extract into params: name, budgetDaily (number), currency, channelType, objective, appUrl, finalUrl, targetCpa, targetRoas.
- Only list a field in missing_fields when it is required and still unknown after merging with pending_campaign_creation. Required fields for create_campaign are name and budgetDaily. Choose channelType yourself from the objective when the user does not name one; do not ask for it.
- When the user states an objective such as installs, app installs, leads, sales, or traffic, record it in params.objective and pick the matching channelType.

SERVER CONVERSATION STATE:
${JSON.stringify(compactConversationState(state))}

ACTIVE PROPOSAL:
${JSON.stringify(pendingProposal || null)}

REGISTRY OPERATIONS:
${operations}`;
}

export async function classifyChatMessage(
  message: string,
  model: string,
  state: ConversationState,
  pendingProposal: unknown
): Promise<ChatClassification | undefined> {
  const operations = GOOGLE_ADS_OPERATION_REGISTRY
    .map((operation) => `${operation.name}: ${operation.description} [${operation.risk}]`)
    .join('\n');
  const baseMessages = [
    { role: 'system' as const, content: classifierPrompt(state, pendingProposal, operations) },
    { role: 'user' as const, content: message },
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await sendOpenRouterChat({
        model: model as any,
        tier: model as any,
        messages: attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              {
                role: 'user' as const,
                content: 'Your previous response was invalid. Return only valid JSON matching the schema exactly.',
              },
            ],
        temperature: 0,
        maxTokens: 700,
      });
      const parsed = parseClassification(response.reply);
      if (parsed) return parsed;
    } catch (error) {
      if (attempt === 1) console.error('[AI Chat] Structured classification failed:', error);
    }
  }
  return undefined;
}
