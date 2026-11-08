import {
  doc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

function stateRef(conversationId: string) {
  return doc(db, 'chat_conversations', conversationId, 'conversation_state', 'current');
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
  const snapshot = await getDoc(stateRef(conversationId));
  if (snapshot.exists()) {
    return snapshot.data() as ConversationState;
  }
  return {
    account_id: accountId,
    recent_entities: [],
    updated_at: new Date().toISOString(),
  };
}

async function updateState(
  conversationId: string,
  accountId: string,
  mutate: (state: ConversationState) => ConversationState
): Promise<ConversationState> {
  const ref = stateRef(conversationId);
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current: ConversationState = snapshot.exists()
      ? snapshot.data() as ConversationState
      : { account_id: accountId, recent_entities: [], updated_at: new Date().toISOString() };
    const next = mutate({ ...current, account_id: accountId });
    const stored = { ...next, updated_at: new Date().toISOString() };
    transaction.set(ref, stored);
    return stored;
  });
  return result;
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
      { ...state, last_action: 'entity_selected' },
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
    .filter((entity) => entity.source === 'proposed' || entity.source === 'created')
    .map((entity) => candidates.find((candidate) => candidate.id === entity.id))
    .filter((entity): entity is Campaign => Boolean(entity));
  if (recentPreferred.length === 1 && (targetRef.kind === 'none' || targetRef.kind === 'current_focus')) {
    return { status: 'resolved', entity: recentPreferred[0] };
  }

  if (targetRef.kind === 'current_focus' && state.focus_entity) {
    const focused = candidates.find((entity) => entity.id === state.focus_entity?.id);
    if (focused) return { status: 'resolved', entity: focused };
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
    account_cache_fetched_at: state.account_cache?.fetched_at || null,
  };
}
