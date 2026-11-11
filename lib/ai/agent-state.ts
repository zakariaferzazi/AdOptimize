/**
 * Durable conversation state for the marketing agent.
 *
 * A conversation can hold several pieces of work (tasks). Each task carries its
 * objective, collected parameters, user decisions, open questions, known
 * constraints, key findings, the resources it concerns and its proposals.
 * The state also keeps a registry of Google Ads resources discussed (with real
 * IDs) and a log of executed actions, so follow-ups like "apply that to the
 * previous campaign" resolve against facts rather than guesses.
 *
 * Everything here is pure and deterministic. The model updates tasks through
 * the `update_task` tool; the backend records proposals, resources and
 * execution outcomes automatically, without extra model calls.
 */

export type TaskStatus =
  | 'active'
  | 'waiting_for_user'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export const TASK_STATUSES: TaskStatus[] = [
  'active',
  'waiting_for_user',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
  'blocked',
];

export type ProposalState =
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'executed_unverified'
  | 'superseded'
  | 'cancelled'
  | 'expired';

export interface TaskProposalRef {
  proposalId: string;
  revision: number;
  operation: string;
  summary: string;
  status: ProposalState;
  targetKey: string;
}

export interface ResourceRef {
  type: 'campaign' | 'ad_group' | 'keyword' | 'conversion_action' | 'custom_goal';
  id: string;
  name?: string;
  /** Parent campaign or ad group, when known. */
  parentId?: string;
  lastSeenAt: string;
}

export interface AgentTask {
  id: string;
  title: string;
  objective: string;
  status: TaskStatus;
  parameters: Record<string, unknown>;
  decisions: string[];
  openQuestions: string[];
  constraints: string[];
  findings: string[];
  /** Resource keys such as "campaign:123". */
  resources: string[];
  proposals: TaskProposalRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionLogEntry {
  at: string;
  taskId?: string;
  proposalId: string;
  revision: number;
  operation: string;
  summary: string;
  status: ProposalState;
  detail?: string;
  realIds?: Record<string, string>;
}

export interface AgentState {
  version: 2;
  activeTaskId?: string;
  tasks: AgentTask[];
  resources: ResourceRef[];
  actions: ActionLogEntry[];
  updatedAt: string;
}

const MAX_TASKS = 20;
const MAX_RESOURCES = 40;
const MAX_ACTIONS = 30;
const MAX_FINDINGS = 12;
const MAX_LIST = 20;

export function emptyState(): AgentState {
  return { version: 2, tasks: [], resources: [], actions: [], updatedAt: new Date(0).toISOString() };
}

function now(): string {
  return new Date().toISOString();
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()) : [];
}

function appendUnique(list: string[], values: string[], cap = MAX_LIST): string[] {
  const next = [...list];
  for (const value of values) if (!next.includes(value)) next.push(value);
  return next.slice(-cap);
}

export function resourceKey(ref: Pick<ResourceRef, 'type' | 'id'>): string {
  return `${ref.type}:${ref.id}`;
}

// ---------------------------------------------------------------------------
// Parsing (including the legacy single-task format)
// ---------------------------------------------------------------------------

interface LegacyTaskState {
  kind?: string;
  objective?: string;
  campaign?: { campaignId?: string; name?: string };
  parameters?: Record<string, unknown>;
  decisions?: string[];
  missing?: string[];
  unsupported?: string[];
  proposal?: { proposalId: string; revision: number; operation: string; summary: string };
  updatedAt?: string;
}

function fromLegacy(legacy: LegacyTaskState): AgentState {
  const state = emptyState();
  const hasContent =
    legacy.objective || legacy.campaign || Object.keys(legacy.parameters || {}).length || (legacy.decisions || []).length || legacy.proposal;
  if (!hasContent) return state;
  const at = legacy.updatedAt || now();
  const resources: string[] = [];
  if (legacy.campaign?.campaignId) {
    state.resources.push({ type: 'campaign', id: legacy.campaign.campaignId, name: legacy.campaign.name, lastSeenAt: at });
    resources.push(`campaign:${legacy.campaign.campaignId}`);
  }
  state.tasks.push({
    id: 't1',
    title: legacy.kind ? legacy.kind.replace(/_/g, ' ') : 'Task',
    objective: legacy.objective || '',
    status: legacy.proposal ? 'awaiting_approval' : 'active',
    parameters: legacy.parameters || {},
    decisions: strings(legacy.decisions),
    openQuestions: strings(legacy.missing),
    constraints: strings(legacy.unsupported),
    findings: [],
    resources,
    proposals: legacy.proposal
      ? [{ ...legacy.proposal, status: 'pending_approval', targetKey: legacy.proposal.operation }]
      : [],
    createdAt: at,
    updatedAt: at,
  });
  state.activeTaskId = 't1';
  state.updatedAt = at;
  return state;
}

export function parseAgentState(raw: string | null | undefined): AgentState {
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as Partial<AgentState> & LegacyTaskState;
    if (!parsed || typeof parsed !== 'object') return emptyState();
    if (parsed.version !== 2) return fromLegacy(parsed);
    return {
      version: 2,
      activeTaskId: typeof parsed.activeTaskId === 'string' ? parsed.activeTaskId : undefined,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      updatedAt: parsed.updatedAt || now(),
    };
  } catch {
    return emptyState();
  }
}

export function serializeAgentState(state: AgentState): string {
  return JSON.stringify(state);
}

// ---------------------------------------------------------------------------
// Model-driven task updates
// ---------------------------------------------------------------------------

export interface TaskUpdate {
  taskId?: string;
  newTask?: boolean;
  title?: string;
  objective?: string;
  status?: TaskStatus;
  /** Merged key by key. A null value removes that parameter. */
  parameters?: Record<string, unknown>;
  decisions?: string[];
  /** Replaces the list of unresolved questions. */
  openQuestions?: string[];
  constraints?: string[];
  findings?: string[];
  resources?: Array<{ type: ResourceRef['type']; id: string; name?: string; parentId?: string }>;
}

function nextTaskId(state: AgentState): string {
  const max = state.tasks.reduce((highest, task) => Math.max(highest, Number(task.id.replace(/\D/g, '')) || 0), 0);
  return `t${max + 1}`;
}

export function getTask(state: AgentState, taskId?: string): AgentTask | undefined {
  const id = taskId || state.activeTaskId;
  return id ? state.tasks.find((task) => task.id === id) : undefined;
}

function createTask(state: AgentState, title: string, objective: string): AgentTask {
  const at = now();
  return {
    id: nextTaskId(state),
    title: title || objective.slice(0, 60) || 'Task',
    objective,
    status: 'active',
    parameters: {},
    decisions: [],
    openQuestions: [],
    constraints: [],
    findings: [],
    resources: [],
    proposals: [],
    createdAt: at,
    updatedAt: at,
  };
}

/** Add or refresh resources in the registry (most recent first). */
export function noteResources(state: AgentState, refs: TaskUpdate['resources']): AgentState {
  if (!refs?.length) return state;
  const at = now();
  let resources = [...state.resources];
  for (const ref of refs) {
    const id = String(ref.id || '').trim();
    if (!id) continue;
    const existing = resources.find((item) => item.type === ref.type && item.id === id);
    resources = resources.filter((item) => item !== existing);
    resources.unshift({
      type: ref.type,
      id,
      name: ref.name || existing?.name,
      parentId: ref.parentId || existing?.parentId,
      lastSeenAt: at,
    });
  }
  return { ...state, resources: resources.slice(0, MAX_RESOURCES) };
}

export function applyTaskUpdate(state: AgentState, update: TaskUpdate): { state: AgentState; task: AgentTask } {
  let next: AgentState = { ...state, tasks: [...state.tasks] };
  let task = update.newTask ? undefined : getTask(next, update.taskId);

  if (update.taskId && !task && !update.newTask) {
    throw new Error(`Task ${update.taskId} does not exist. Existing tasks: ${state.tasks.map((item) => item.id).join(', ') || 'none'}.`);
  }

  if (!task) {
    task = createTask(next, update.title || '', update.objective || '');
    next.tasks.push(task);
  }

  const parameters = { ...task.parameters };
  for (const [key, value] of Object.entries(update.parameters || {})) {
    if (value === null) delete parameters[key];
    else if (value !== undefined && value !== '') parameters[key] = value;
  }

  const resourceKeys = (update.resources || []).filter((ref) => ref?.id).map((ref) => resourceKey({ type: ref.type, id: String(ref.id) }));

  const updated: AgentTask = {
    ...task,
    title: update.title?.trim() || task.title,
    objective: update.objective !== undefined ? update.objective.trim() : task.objective,
    status: update.status && TASK_STATUSES.includes(update.status) ? update.status : task.status,
    parameters,
    decisions: appendUnique(task.decisions, strings(update.decisions)),
    openQuestions: update.openQuestions !== undefined ? strings(update.openQuestions).slice(0, MAX_LIST) : task.openQuestions,
    constraints: appendUnique(task.constraints, strings(update.constraints)),
    findings: appendUnique(task.findings, strings(update.findings), MAX_FINDINGS),
    resources: appendUnique(task.resources, resourceKeys, MAX_LIST),
    updatedAt: now(),
  };

  next.tasks = next.tasks.map((item) => (item.id === updated.id ? updated : item));
  if (next.tasks.length > MAX_TASKS) {
    const closed = next.tasks.filter((item) => ['completed', 'cancelled', 'failed'].includes(item.status));
    const drop = closed[0];
    if (drop) next.tasks = next.tasks.filter((item) => item !== drop);
  }
  next.activeTaskId = updated.id;
  next = noteResources(next, update.resources);
  next.updatedAt = now();
  return { state: next, task: updated };
}

// ---------------------------------------------------------------------------
// Backend-recorded events
// ---------------------------------------------------------------------------

export function ensureActiveTask(state: AgentState, objective: string): { state: AgentState; task: AgentTask } {
  const active = getTask(state);
  if (active && !['completed', 'cancelled', 'failed'].includes(active.status)) return { state, task: active };
  return applyTaskUpdate(state, { newTask: true, objective, title: objective.slice(0, 60) });
}

/** Record a newly prepared proposal against a task, superseding same-target pending proposals. */
export function recordProposal(
  state: AgentState,
  taskId: string,
  proposal: TaskProposalRef,
  supersededIds: string[] = []
): AgentState {
  const at = now();
  const tasks = state.tasks.map((task) => {
    const proposals = task.proposals.map((item) =>
      supersededIds.includes(item.proposalId) && item.status === 'pending_approval' ? { ...item, status: 'superseded' as const } : item
    );
    if (task.id !== taskId) return proposals === task.proposals ? task : { ...task, proposals };
    return {
      ...task,
      status: 'awaiting_approval' as const,
      openQuestions: [],
      proposals: [...proposals, proposal].slice(-10),
      updatedAt: at,
    };
  });
  return { ...state, tasks, updatedAt: at };
}

export function findTaskByProposal(state: AgentState, proposalId: string): AgentTask | undefined {
  return state.tasks.find((task) => task.proposals.some((proposal) => proposal.proposalId === proposalId));
}

/** Record approval, execution or cancellation outcomes so the next turn knows them. */
export function recordProposalOutcome(
  state: AgentState,
  input: {
    proposalId: string;
    revision: number;
    operation: string;
    summary: string;
    status: ProposalState;
    detail?: string;
    realIds?: Record<string, string>;
    createdResource?: { type: ResourceRef['type']; id: string; name?: string };
  }
): AgentState {
  const at = now();
  const owner = findTaskByProposal(state, input.proposalId);
  const tasks = state.tasks.map((task) => {
    if (task !== owner) return task;
    const proposals = task.proposals.map((proposal) =>
      proposal.proposalId === input.proposalId ? { ...proposal, status: input.status } : proposal
    );
    const pending = proposals.some((proposal) => ['pending_approval', 'approved', 'executing'].includes(proposal.status));
    let status: TaskStatus = task.status;
    if (!pending) {
      if (input.status === 'succeeded') status = 'completed';
      else if (input.status === 'failed' || input.status === 'executed_unverified') status = 'failed';
      else if (input.status === 'cancelled' || input.status === 'expired') status = 'waiting_for_user';
    }
    return { ...task, proposals, status, updatedAt: at };
  });

  const terminal = !['pending_approval', 'approved', 'executing'].includes(input.status);
  const actions = terminal
    ? [
        ...state.actions,
        {
          at,
          taskId: owner?.id,
          proposalId: input.proposalId,
          revision: input.revision,
          operation: input.operation,
          summary: input.summary,
          status: input.status,
          ...(input.detail ? { detail: input.detail } : {}),
          ...(input.realIds && Object.keys(input.realIds).length ? { realIds: input.realIds } : {}),
        },
      ].slice(-MAX_ACTIONS)
    : state.actions;

  let next: AgentState = { ...state, tasks, actions, updatedAt: at };
  if (input.createdResource) next = noteResources(next, [input.createdResource]);
  return next;
}

// ---------------------------------------------------------------------------
// Prompt rendering
// ---------------------------------------------------------------------------

function compactTask(task: AgentTask, detailed: boolean) {
  const pending = task.proposals.filter((proposal) => proposal.status === 'pending_approval');
  const base: Record<string, unknown> = {
    id: task.id,
    title: task.title,
    status: task.status,
  };
  if (!detailed) {
    if (task.objective) base.objective = task.objective;
    if (pending.length) base.pendingProposals = pending.map((proposal) => proposal.summary);
    return base;
  }
  return {
    ...base,
    objective: task.objective || undefined,
    parameters: Object.keys(task.parameters).length ? task.parameters : undefined,
    decisions: task.decisions.length ? task.decisions : undefined,
    openQuestions: task.openQuestions.length ? task.openQuestions : undefined,
    constraints: task.constraints.length ? task.constraints : undefined,
    findings: task.findings.length ? task.findings : undefined,
    resources: task.resources.length ? task.resources : undefined,
    proposals: task.proposals.length
      ? task.proposals.slice(-4).map((proposal) => ({
          proposalId: proposal.proposalId,
          revision: proposal.revision,
          operation: proposal.operation,
          summary: proposal.summary,
          status: proposal.status,
        }))
      : undefined,
  };
}

/** Compact, deterministic view of the state for the system prompt. */
export function renderStateForPrompt(state: AgentState): string | undefined {
  if (!state.tasks.length && !state.resources.length && !state.actions.length) return undefined;
  const active = getTask(state);
  const open = state.tasks.filter(
    (task) => task !== active && !['completed', 'cancelled', 'failed'].includes(task.status)
  );
  const closed = state.tasks
    .filter((task) => task !== active && ['completed', 'cancelled', 'failed'].includes(task.status))
    .slice(-3);

  const view = {
    activeTask: active ? compactTask(active, true) : null,
    otherOpenTasks: open.length ? open.map((task) => compactTask(task, false)) : undefined,
    recentlyClosedTasks: closed.length ? closed.map((task) => compactTask(task, false)) : undefined,
    knownResources: state.resources.length
      ? state.resources.slice(0, 15).map((resource) => ({
          ref: resourceKey(resource),
          name: resource.name,
          ...(resource.parentId ? { parent: resource.parentId } : {}),
        }))
      : undefined,
    recentActions: state.actions.length
      ? state.actions.slice(-8).map((action) => ({
          summary: action.summary,
          status: action.status,
          ...(action.detail ? { detail: action.detail } : {}),
          ...(action.realIds ? { ids: action.realIds } : {}),
          at: action.at,
        }))
      : undefined,
  };
  return JSON.stringify(view, null, 1);
}
