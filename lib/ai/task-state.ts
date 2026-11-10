/**
 * Durable per-conversation task state.
 *
 * A conversation is a piece of work, not a sequence of independent messages.
 * This record carries the objective, the campaign under discussion, the values
 * collected so far, the decisions the user has made, what is still missing, and
 * the pending proposal. It is persisted with the conversation and injected into
 * every model request so the agent never re-asks for something it already knows.
 */

export type TaskKind =
  | 'create_campaign'
  | 'update_campaign'
  | 'conversion_goals'
  | 'analysis'
  | 'question';

export interface TaskCampaignRef {
  /** Canonical Google Ads campaign ID (digits only). */
  campaignId: string;
  name: string;
  /** Customer ID the campaign belongs to, so identity survives account switches. */
  customerId: string;
}

export interface TaskProposalRef {
  proposalId: string;
  revision: number;
  operation: string;
  summary: string;
}

export interface TaskState {
  kind: TaskKind;
  /** One-line statement of what the user is trying to achieve. */
  objective: string;
  campaign?: TaskCampaignRef;
  /** Values collected for the current task, keyed by parameter name. */
  parameters: Record<string, unknown>;
  /** Decisions the user has explicitly confirmed. */
  decisions: string[];
  /** Requirements that are still unresolved. */
  missing: string[];
  /** Constraints the user asked for that the API cannot express. */
  unsupported: string[];
  proposal?: TaskProposalRef;
  updatedAt: string;
}

export const EMPTY_TASK: TaskState = {
  kind: 'question',
  objective: '',
  parameters: {},
  decisions: [],
  missing: [],
  unsupported: [],
  updatedAt: new Date(0).toISOString(),
};

function uniquePush(list: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  return list.includes(trimmed) ? list : [...list, trimmed];
}

export function parseTaskState(raw: string | null | undefined): TaskState | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<TaskState>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    return {
      kind: (parsed.kind as TaskKind) || 'question',
      objective: typeof parsed.objective === 'string' ? parsed.objective : '',
      campaign: parsed.campaign,
      parameters:
        parsed.parameters && typeof parsed.parameters === 'object' ? parsed.parameters : {},
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter(Boolean) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.filter(Boolean) : [],
      unsupported: Array.isArray(parsed.unsupported) ? parsed.unsupported.filter(Boolean) : [],
      proposal: parsed.proposal,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

export function serializeTaskState(state: TaskState): string {
  return JSON.stringify(state);
}

export interface TaskPatch {
  kind?: TaskKind;
  objective?: string;
  campaign?: TaskCampaignRef;
  parameters?: Record<string, unknown>;
  decisions?: string[];
  missing?: string[];
  unsupported?: string[];
  proposal?: TaskProposalRef;
  /** Clear the pending proposal (for example after it was superseded). */
  clearProposal?: boolean;
}

/**
 * Merge a patch into the existing task.
 *
 * Parameters merge key-by-key so a follow-up that supplies only the budget keeps
 * the name and channel captured earlier. `undefined` values are ignored, which
 * lets the model send partial updates safely.
 */
export function mergeTaskState(current: TaskState | undefined, patch: TaskPatch): TaskState {
  const base = current || EMPTY_TASK;

  const parameters = { ...base.parameters };
  for (const [key, value] of Object.entries(patch.parameters || {})) {
    if (value === undefined || value === null || value === '') continue;
    parameters[key] = value;
  }

  let decisions = base.decisions;
  for (const decision of patch.decisions || []) decisions = uniquePush(decisions, decision);

  let unsupported = base.unsupported;
  for (const item of patch.unsupported || []) unsupported = uniquePush(unsupported, item);

  // `missing` is authoritative when supplied: the model recomputes it each turn.
  const missing = patch.missing !== undefined ? patch.missing.filter(Boolean) : base.missing;

  return {
    kind: patch.kind || base.kind,
    objective: patch.objective !== undefined ? patch.objective : base.objective,
    campaign: patch.campaign || base.campaign,
    parameters,
    decisions,
    missing,
    unsupported,
    proposal: patch.clearProposal ? undefined : patch.proposal || base.proposal,
    updatedAt: new Date().toISOString(),
  };
}

/** Compact view injected into the system prompt. */
export function compactTaskState(state: TaskState | undefined) {
  if (!state) return null;
  return {
    kind: state.kind,
    objective: state.objective || null,
    campaign: state.campaign || null,
    parameters: state.parameters,
    decisions: state.decisions,
    missing: state.missing,
    unsupported: state.unsupported,
    pending_proposal: state.proposal || null,
  };
}

/** True when the task has enough context to be worth showing to the model. */
export function hasTaskContext(state: TaskState | undefined): boolean {
  if (!state) return false;
  return Boolean(
    state.objective ||
      state.campaign ||
      Object.keys(state.parameters).length > 0 ||
      state.decisions.length > 0 ||
      state.proposal
  );
}
