import { describe, expect, it } from 'vitest';
import {
  applyTaskUpdate,
  emptyState,
  ensureActiveTask,
  getTask,
  parseAgentState,
  recordProposal,
  recordProposalOutcome,
  renderStateForPrompt,
  serializeAgentState,
} from '@/lib/ai/agent-state';

describe('agent state', () => {
  it('merges parameters key by key and removes them with null', () => {
    let state = emptyState();
    state = applyTaskUpdate(state, { newTask: true, objective: 'Create campaign', parameters: { name: 'Spring', dailyBudget: 20, status: 'PAUSED' } }).state;
    state = applyTaskUpdate(state, { parameters: { dailyBudget: 35, status: null } }).state;
    expect(getTask(state)!.parameters).toEqual({ name: 'Spring', dailyBudget: 35 });
  });

  it('keeps separate tasks and switches the active one', () => {
    let state = emptyState();
    state = applyTaskUpdate(state, { newTask: true, objective: 'Task A' }).state;
    state = applyTaskUpdate(state, { newTask: true, objective: 'Task B' }).state;
    expect(state.tasks.map((task) => task.objective)).toEqual(['Task A', 'Task B']);
    expect(state.activeTaskId).toBe('t2');
    state = applyTaskUpdate(state, { taskId: 't1', decisions: ['keep paused'] }).state;
    expect(state.activeTaskId).toBe('t1');
    expect(getTask(state, 't1')!.decisions).toEqual(['keep paused']);
    expect(getTask(state, 't2')!.decisions).toEqual([]);
  });

  it('rejects an unknown task reference instead of silently creating one', () => {
    expect(() => applyTaskUpdate(emptyState(), { taskId: 't9', objective: 'x' })).toThrow(/does not exist/);
  });

  it('supersedes only same-target pending proposals in the same task', () => {
    let state = applyTaskUpdate(emptyState(), { newTask: true, objective: 'Budget work' }).state;
    state = recordProposal(state, 't1', { proposalId: 'p1', revision: 1, operation: 'update_campaign_budget', summary: 'A', status: 'pending_approval', targetKey: 'campaign:1:budget' });
    state = recordProposal(state, 't1', { proposalId: 'p2', revision: 1, operation: 'update_campaign_status', summary: 'B', status: 'pending_approval', targetKey: 'campaign:1:status' });
    state = recordProposal(state, 't1', { proposalId: 'p3', revision: 2, operation: 'update_campaign_budget', summary: 'C', status: 'pending_approval', targetKey: 'campaign:1:budget' }, ['p1']);
    const task = getTask(state)!;
    expect(task.proposals.map((proposal) => [proposal.proposalId, proposal.status])).toEqual([
      ['p1', 'superseded'],
      ['p2', 'pending_approval'],
      ['p3', 'pending_approval'],
    ]);
    expect(task.status).toBe('awaiting_approval');
  });

  it('closes the task when its last proposal reaches a terminal state', () => {
    let state = applyTaskUpdate(emptyState(), { newTask: true, objective: 'Pause brand' }).state;
    state = recordProposal(state, 't1', { proposalId: 'p1', revision: 1, operation: 'update_campaign_status', summary: 'Pause', status: 'pending_approval', targetKey: 'campaign:1:status' });
    state = recordProposalOutcome(state, { proposalId: 'p1', revision: 1, operation: 'update_campaign_status', summary: 'Pause', status: 'succeeded', realIds: { campaignId: '1' } });
    expect(getTask(state)).toMatchObject({ status: 'completed' });
    expect(state.actions[0]).toMatchObject({ status: 'succeeded', realIds: { campaignId: '1' } });
  });

  it('starts a new task when the previous one is finished', () => {
    let state = applyTaskUpdate(emptyState(), { newTask: true, objective: 'Done thing', status: 'completed' }).state;
    const next = ensureActiveTask(state, 'New thing');
    expect(next.task.objective).toBe('New thing');
    expect(next.state.tasks).toHaveLength(2);
  });

  it('renders a compact prompt view with the active task, resources and actions', () => {
    let state = applyTaskUpdate(emptyState(), {
      newTask: true,
      objective: 'Create winter campaign',
      parameters: { name: 'Winter', dailyBudget: 40 },
      openQuestions: ['keywords'],
      resources: [{ type: 'campaign', id: '111', name: 'Brand - Search' }],
    }).state;
    state = recordProposalOutcome(state, { proposalId: 'p1', revision: 1, operation: 'update_campaign_budget', summary: 'Raise budget', status: 'succeeded' });
    const rendered = renderStateForPrompt(state)!;
    expect(rendered).toContain('Create winter campaign');
    expect(rendered).toContain('"campaign:111"');
    expect(rendered).toContain('Raise budget');
    expect(rendered.length).toBeLessThan(2000);
  });

  it('round-trips through serialisation', () => {
    const state = applyTaskUpdate(emptyState(), { newTask: true, objective: 'X', parameters: { a: 1 } }).state;
    expect(parseAgentState(serializeAgentState(state))).toEqual(state);
  });

  it('migrates the legacy single-task format', () => {
    const legacy = JSON.stringify({
      kind: 'create_campaign',
      objective: 'Create a paused campaign',
      campaign: { campaignId: '111', name: 'Brand - Search' },
      parameters: { name: 'Spring', budgetDaily: 5 },
      decisions: ['paused'],
      missing: ['keywords'],
      unsupported: ['max CPC cap'],
      proposal: { proposalId: 'p1', revision: 1, operation: 'create_campaign', summary: 'Create' },
    });
    const state = parseAgentState(legacy);
    expect(state.version).toBe(2);
    expect(getTask(state)).toMatchObject({
      objective: 'Create a paused campaign',
      status: 'awaiting_approval',
      parameters: { name: 'Spring', budgetDaily: 5 },
      decisions: ['paused'],
      openQuestions: ['keywords'],
      constraints: ['max CPC cap'],
      resources: ['campaign:111'],
    });
    expect(state.resources[0]).toMatchObject({ type: 'campaign', id: '111', name: 'Brand - Search' });
  });

  it('ignores corrupt state instead of failing the turn', () => {
    expect(parseAgentState('{not json')).toEqual(emptyState());
    expect(parseAgentState(null)).toEqual(emptyState());
  });
});
