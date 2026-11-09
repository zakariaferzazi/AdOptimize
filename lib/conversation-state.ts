import { Campaign } from '@/types/adoptimize';

export type ConversationEntityType = 'campaign';
export type ConversationEntitySource = 'created' | 'mentioned' | 'proposed';

export interface ConversationEntity {
  type: ConversationEntityType;
  id: string;
  name: string;
  source: ConversationEntitySource;
  at: string;
}

/**
 * A campaign-creation request that is still collecting required parameters.
 * Creation is a multi-turn task: the first message usually supplies only the
 * objective, and later messages supply the name and budget. Without this draft
 * the follow-up turn has no campaign to resolve and falls into the
 * existing-campaign selection flow.
 */
export interface PendingCampaignCreation {
  name?: string;
  budgetDaily?: number;
  currency?: string;
  channelType?: string;
  objective?: string;
  appUrl?: string;
  finalUrl?: string;
  targetCpa?: number;
  targetRoas?: number;
  requested_at: string;
  updated_at: string;
}

export interface ConversationState {
  account_id: string;
  focus_entity?: {
    type: ConversationEntityType;
    id: string;
    name: string;
  };
  recent_entities: ConversationEntity[];
  active_proposal_id?: string;
  last_action?: string;
  short_summary?: string;
  pending_campaign_creation?: PendingCampaignCreation;
  task_context?: {
    active_task?: string;
    status?: 'collecting' | 'proposal_pending' | 'revising' | 'completed';
    objective?: string;
    app_url?: string;
    app_identity?: string;
    known_urls: string[];
    known_campaign_names: string[];
    decisions: string[];
    missing_information: string[];
  };
  account_cache?: {
    fetched_at: string;
    campaigns: Campaign[];
  };
  updated_at: string;
}

export interface EntityTargetRef {
  kind: 'id' | 'name' | 'current_focus' | 'none';
  value?: string;
}

export type EntityResolution =
  | { status: 'resolved'; entity: Campaign }
  | { status: 'needs_clarification'; candidates: Campaign[] };

const CACHE_MAX_AGE_MS = 10 * 60 * 1000;

// Server-side conversation state must not use the Firebase client SDK. That SDK
// depends on protobufjs, which generates code at runtime with `new Function`.
// Cloudflare Workers disallow dynamic code generation, so importing the client
// Firestore SDK in a route handler crashes the worker at module load. This
// process-local store keeps the same API without pulling Firestore into the
// worker. Durable persistence can be layered on later through a Worker binding.
type ConversationStateStore = Map<string, ConversationState>;

const globalForState = globalThis as typeof globalThis & {
  __adoptimizeConversationStateStore?: ConversationStateStore;
};

const conversationStates: ConversationStateStore =
  globalForState.__adoptimizeConversationStateStore ?? new Map();

if (!globalForState.__adoptimizeConversationStateStore) {
  globalForState.__adoptimizeConversationStateStore = conversationStates;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultState(accountId: string): ConversationState {
  return {
    account_id: accountId,
    recent_entities: [],
    updated_at: new Date().toISOString(),
  };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function tokenScore(query: string, name: string): number {
  const queryTokens = new Set(normalize(query).split(/[^a-z0-9]+/).filter(Boolean));
  const nameTokens = new Set(normalize(name).split(/[^a-z0-9]+/).filter(Boolean));
  if (!queryTokens.size || !nameTokens.size) return 0;
  const overlap = [...queryTokens].filter((token) =>
    [...nameTokens].some((candidate) => candidate === token || candidate.includes(token) || token.includes(candidate))
  ).length;
  return (overlap / queryTokens.size) * 0.65 + (overlap / nameTokens.size) * 0.35;
}

export async function getConversationState(
  conversationId: string,
  accountId: string
): Promise<ConversationState> {
  const existing = conversationStates.get(conversationId);
  if (existing) {
    return clone({ ...existing, account_id: existing.account_id || accountId });
  }
  return defaultState(accountId);
}

async function updateState(
  conversationId: string,
  accountId: string,
  mutate: (state: ConversationState) => ConversationState
): Promise<ConversationState> {
  const current = conversationStates.get(conversationId) ?? defaultState(accountId);
  const next = mutate(clone({ ...current, account_id: accountId }));
  const stored = { ...next, updated_at: new Date().toISOString() };
  conversationStates.set(conversationId, clone(stored));
  return clone(stored);
}

function addRecentEntity(state: ConversationState, entity: ConversationEntity): ConversationState {
  const recent = [
    entity,
    ...state.recent_entities.filter((item) => item.id !== entity.id || item.type !== entity.type),
  ].slice(0, 20);
  return { ...state, recent_entities: recent };
}

export async function recordProposalState(
  conversationId: string,
  accountId: string,
  proposalId: string,
  entity?: { id: string; name: string },
  summary?: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const next: ConversationState = {
      ...state,
      active_proposal_id: proposalId,
      last_action: 'proposal_created',
      task_context: {
        ...(state.task_context || {
          known_urls: [],
          known_campaign_names: [],
          decisions: [],
          missing_information: [],
        }),
        status: 'proposal_pending',
      },
    };
    if (summary) next.short_summary = summary;
    return entity
      ? addRecentEntity(next, {
          type: 'campaign',
          id: entity.id,
          name: entity.name,
          source: 'proposed',
          at: new Date().toISOString(),
        })
      : next;
  });
}

export async function recordMentionedEntity(
  conversationId: string,
  accountId: string,
  entity: Campaign
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) =>
    addRecentEntity(
      {
        ...state,
        // A campaign identified from live account data becomes the canonical
        // target for later "it" / "that campaign" follow-ups.
        focus_entity: { type: 'campaign', id: entity.id, name: entity.name },
        last_action: 'entity_selected',
      },
      {
        type: 'campaign',
        id: entity.id,
        name: entity.name,
        source: 'mentioned',
        at: new Date().toISOString(),
      }
    )
  );
}

export async function recordSuccessfulCampaignWrite(
  conversationId: string,
  accountId: string,
  entity: { id: string; name: string },
  action: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const { account_cache: _cache, active_proposal_id: _proposal, ...withoutTransientState } = state;
    return addRecentEntity(
      {
        ...withoutTransientState,
        focus_entity: { type: 'campaign', id: entity.id, name: entity.name },
        last_action: action,
        short_summary: `${action}: ${entity.name}`,
      },
      {
        type: 'campaign',
        id: entity.id,
        name: entity.name,
        source: 'created',
        at: new Date().toISOString(),
      }
    );
  });
}

/**
 * Merge newly supplied creation parameters into the in-progress creation draft.
 * Only defined values overwrite existing ones so a follow-up turn that supplies
 * just the budget keeps the name and objective captured earlier.
 */
export async function recordPendingCampaignCreation(
  conversationId: string,
  accountId: string,
  patch: Partial<Omit<PendingCampaignCreation, 'requested_at' | 'updated_at'>>
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const now = new Date().toISOString();
    const existing = state.pending_campaign_creation;
    const merged: PendingCampaignCreation = {
      ...(existing || { requested_at: now }),
      ...Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined && value !== null && value !== '')
      ),
      requested_at: existing?.requested_at || now,
      updated_at: now,
    };
    return {
      ...state,
      pending_campaign_creation: merged,
      task_context: {
        ...(state.task_context || {
          known_urls: [],
          known_campaign_names: [],
          decisions: [],
          missing_information: [],
        }),
        active_task: 'create_campaign',
        status: 'collecting',
        ...(merged.objective ? { objective: merged.objective } : {}),
        ...(merged.appUrl ? { app_url: merged.appUrl } : {}),
        ...(merged.name
          ? {
              known_campaign_names: [
                merged.name,
                ...(state.task_context?.known_campaign_names || []).filter((name) => name !== merged.name),
              ].slice(0, 20),
            }
          : {}),
        ...(merged.appUrl
          ? {
              known_urls: [
                merged.appUrl,
                ...(state.task_context?.known_urls || []).filter((url) => url !== merged.appUrl),
              ].slice(0, 20),
            }
          : {}),
        decisions: [
          ...(state.task_context?.decisions || []),
          ...(merged.name ? [`Campaign name: ${merged.name}`] : []),
          ...(merged.budgetDaily !== undefined ? [`Daily budget: ${merged.currency || ''} ${merged.budgetDaily}`] : []),
          ...(merged.objective ? [`Objective: ${merged.objective}`] : []),
        ].slice(-20),
      },
      last_action: 'campaign_creation_in_progress',
      short_summary: `Creating campaign${merged.name ? ` "${merged.name}"` : ''}${
        merged.budgetDaily ? ` with ${merged.currency || ''} ${merged.budgetDaily} daily budget` : ''
      }`,
    };
  });
}

export async function recordConversationFacts(
  conversationId: string,
  accountId: string,
  facts: Partial<NonNullable<ConversationState['task_context']>>
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const current = state.task_context || {
      known_urls: [],
      known_campaign_names: [],
      decisions: [],
      missing_information: [],
    };
    const mergeUnique = (left: string[], right: string[]) =>
      [...right, ...left].filter((value, index, values) => value && values.indexOf(value) === index).slice(0, 20);
    return {
      ...state,
      task_context: {
        ...current,
        ...facts,
        known_urls: mergeUnique(current.known_urls, facts.known_urls || []),
        known_campaign_names: mergeUnique(current.known_campaign_names, facts.known_campaign_names || []),
        decisions: mergeUnique(current.decisions, facts.decisions || []).slice(0, 20),
        missing_information: facts.missing_information || current.missing_information,
      },
    };
  });
}

export async function resetTaskContext(
  conversationId: string,
  accountId: string,
  task: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => ({
    ...state,
    task_context: {
      active_task: task,
      status: 'collecting',
      known_urls: [],
      known_campaign_names: [],
      decisions: [],
      missing_information: [],
    },
  }));
}

export async function clearPendingCampaignCreation(
  conversationId: string,
  accountId: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const { pending_campaign_creation: _pending, ...withoutPending } = state;
    return withoutPending;
  });
}

export async function cacheAccountCampaigns(
  conversationId: string,
  accountId: string,
  campaigns: Campaign[],
  fetchedAt: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => ({
    ...state,
    account_cache: { campaigns, fetched_at: fetchedAt },
  }));
}

export async function invalidateAccountCache(
  conversationId: string,
  accountId: string
): Promise<ConversationState> {
  return updateState(conversationId, accountId, (state) => {
    const { account_cache: _cache, ...withoutCache } = state;
    return withoutCache;
  });
}

export function isAccountCacheFresh(state: ConversationState, now = Date.now()): boolean {
  const fetchedAt = state.account_cache?.fetched_at;
  return Boolean(fetchedAt && now - new Date(fetchedAt).getTime() < CACHE_MAX_AGE_MS);
}

export function resolveEntity(
  targetRef: EntityTargetRef,
  state: ConversationState,
  accountData: Campaign[]
): EntityResolution {
  const candidates = accountData;
  const value = normalize(targetRef.value || '');
  const exact = candidates.filter((entity) =>
    normalize(entity.id) === value || normalize(entity.name) === value
  );
  if (exact.length === 1) return { status: 'resolved', entity: exact[0] };
  if (exact.length > 1) return { status: 'needs_clarification', candidates: exact.slice(0, 5) };

  const recentPreferred = state.recent_entities
    .filter(
      (entity) =>
        entity.source === 'proposed' || entity.source === 'created' || entity.source === 'mentioned'
    )
    .map((entity) => candidates.find((candidate) => candidate.id === entity.id))
    .filter((entity): entity is Campaign => Boolean(entity));

  if (targetRef.kind === 'current_focus' && state.focus_entity) {
    const focused = candidates.find((entity) => entity.id === state.focus_entity?.id);
    if (focused) return { status: 'resolved', entity: focused };
  }

  if (recentPreferred.length === 1 && (targetRef.kind === 'none' || targetRef.kind === 'current_focus')) {
    return { status: 'resolved', entity: recentPreferred[0] };
  }

  if (recentPreferred.length > 1 && (targetRef.kind === 'none' || targetRef.kind === 'current_focus')) {
    return { status: 'needs_clarification', candidates: recentPreferred.slice(0, 5) };
  }

  if (targetRef.kind !== 'none' && value) {
    const ranked = candidates
      .map((entity) => ({ entity, score: tokenScore(value, entity.name) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);
    if (ranked.length === 1 || (ranked[0] && ranked[0].score >= 0.65 && ranked[0].score - ranked[1].score >= 0.15)) {
      return { status: 'resolved', entity: ranked[0].entity };
    }
    return { status: 'needs_clarification', candidates: ranked.slice(0, 5).map((item) => item.entity) };
  }

  return { status: 'needs_clarification', candidates: candidates.slice(0, 5) };
}

export function compactConversationState(state: ConversationState) {
  return {
    account_id: state.account_id,
    focus_entity: state.focus_entity || null,
    recent_entities: state.recent_entities.slice(0, 10),
    active_proposal_id: state.active_proposal_id || null,
    last_action: state.last_action || null,
    short_summary: state.short_summary || null,
    pending_campaign_creation: state.pending_campaign_creation || null,
    task_context: state.task_context || null,
    account_cache_fetched_at: state.account_cache?.fetched_at || null,
  };
}
