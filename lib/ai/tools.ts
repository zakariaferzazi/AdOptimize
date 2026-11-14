import type { ToolDefinition } from '@/lib/openrouter-service';
import { DATE_PRESETS, type GoogleAdsContext } from '@/lib/google-ads/gaql';
import { searchLocations } from '@/lib/google-ads/geo';
import {
  getCampaignDetails,
  getConversionSetup,
  getPerformance,
  getSearchTerms,
  listAdGroups,
  listCampaigns,
  listKeywords,
  runDiagnostics,
} from '@/lib/google-ads/reporting';
import {
  getOperation,
  listOperations,
  normalizeArgs,
  preflightPlan,
  validateOperationArgs,
  type ActionType,
  type JsonSchemaProperty,
  type OperationDescriptor,
  type PreparedChange,
} from '@/lib/google-ads/catalog';
import { fromGoogleAdsFailure, invalidArgument, toToolErrorPayload, type ToolErrorPayload } from '@/lib/mcp/errors';
import {
  applyTaskUpdate,
  ensureActiveTask,
  noteResources,
  recordProposal,
  TASK_STATUSES,
  type AgentState,
  type ResourceRef,
  type TaskUpdate,
} from './agent-state';

/**
 * The agent's capability registry.
 *
 * Read tools answer marketing questions from live data. Write tools validate a
 * change against the live account (including Google Ads' own validate-only
 * check) and turn it into a proposal the user must approve; they never change
 * the account. `update_task` is the agent's working memory.
 */

export type ToolKind = 'read' | 'write' | 'memory';

export interface ToolSpec {
  name: string;
  kind: ToolKind;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, JsonSchemaProperty>; required?: string[]; additionalProperties?: false };
}

export interface ProposalDraft extends PreparedChange {
  operation: string;
  title: string;
  actionType: ActionType;
  destructive: boolean;
  targetKey: string;
  /** Task the proposal belongs to; set by the registry before saving. */
  taskId?: string;
}

export interface StoredProposal {
  proposalId: string;
  revision: number;
  supersededIds: string[];
}

export interface ToolRuntime {
  ads: GoogleAdsContext;
  getState(): AgentState;
  setState(state: AgentState): void;
  /** Persist a proposal. Required for write tools. */
  saveProposal?(draft: ProposalDraft): Promise<StoredProposal>;
}

export interface ToolOutcome {
  payload: unknown;
  isError: boolean;
  kind: ToolKind;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const dateProps: Record<string, JsonSchemaProperty> = {
  dateRange: { type: 'string', enum: [...DATE_PRESETS], description: 'Reporting period. Defaults to LAST_30_DAYS.' },
  startDate: { type: 'string', description: 'YYYY-MM-DD. With endDate, overrides dateRange.' },
  endDate: { type: 'string', description: 'YYYY-MM-DD.' },
};

const campaignId: JsonSchemaProperty = { type: 'string', description: 'Numeric campaign ID.' };
const campaignName: JsonSchemaProperty = {
  type: 'string',
  description: 'Only when the ID is unknown: exact or partial campaign name. Ambiguous names return candidates.',
};
const limit: JsonSchemaProperty = { type: 'number', minimum: 1, maximum: 200, description: 'Maximum rows to return.' };

interface ReadTool extends ToolSpec {
  handler(context: GoogleAdsContext, args: Record<string, unknown>): Promise<unknown>;
}

const READ_TOOLS: ReadTool[] = [
  {
    name: 'list_campaigns',
    kind: 'read',
    description:
      'Find campaigns and their real IDs with status, type, bidding strategy, daily budget, impression share lost to budget/rank and core metrics for a period. Use to resolve campaigns the user names and for account-wide overviews.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ALL', 'ENABLED', 'PAUSED'] },
        nameContains: { type: 'string' },
        ...dateProps,
        limit,
      },
      additionalProperties: false,
    },
    handler: listCampaigns,
  },
  {
    name: 'get_performance',
    kind: 'read',
    description:
      'Performance report at account, campaign, ad_group or keyword level for a period, optionally broken down by day, device or network and compared with the previous equal period. Use for trends, comparisons and "why did X change" questions.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['account', 'campaign', 'ad_group', 'keyword'] },
        campaignId,
        campaignName,
        adGroupId: { type: 'string' },
        breakdown: { type: 'string', enum: ['none', 'day', 'device', 'network'] },
        compareToPrevious: { type: 'boolean' },
        ...dateProps,
        limit,
      },
      required: ['level'],
      additionalProperties: false,
    },
    handler: getPerformance,
  },
  {
    name: 'get_campaign_details',
    kind: 'read',
    description:
      'Live settings of one campaign: status and serving reasons, channel, bidding strategy with targets/max CPC limit, budget (and whether shared), dates, networks, targeted & excluded locations and geo target options, tracking, App settings.',
    inputSchema: {
      type: 'object',
      properties: { campaignId, campaignName },
      additionalProperties: false,
    },
    handler: getCampaignDetails,
  },
  {
    name: 'search_locations',
    kind: 'read',
    description:
      'Search Google Ads geo target constants by location name (country, state/region, city, postal code) or numeric geo target ID. Use when verifying or disambiguating locations before creating or editing campaign location targeting.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Location name or numeric geo target constant ID.' },
        countryCode: { type: 'string', description: 'Optional 2-letter ISO country code to narrow results (e.g. US, GB, CA).' },
        limit: { type: 'number', minimum: 1, maximum: 25, description: 'Maximum location candidates to return.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: searchLocations,
  },
  {
    name: 'get_conversion_setup',
    kind: 'read',
    description:
      'Conversion tracking setup: account conversion actions (IDs, category, origin, primary or not) and, for a campaign, its goal source (account vs campaign), category goals with biddable flags, custom goal actions and App optimisation actions.',
    inputSchema: {
      type: 'object',
      properties: { campaignId, campaignName },
      additionalProperties: false,
    },
    handler: getConversionSetup,
  },
  {
    name: 'list_ad_groups',
    kind: 'read',
    description: 'Ad groups of a campaign with IDs, status, default max CPC bid and metrics.',
    inputSchema: {
      type: 'object',
      properties: { campaignId, campaignName, ...dateProps, limit },
      additionalProperties: false,
    },
    handler: listAdGroups,
  },
  {
    name: 'list_keywords',
    kind: 'read',
    description:
      'Keywords with IDs (adGroupId + criterionId), match type, status, max CPC, quality score and metrics. Filter by campaign or ad group; filter NON_CONVERTING or LOW_QUALITY.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId,
        campaignName,
        adGroupId: { type: 'string' },
        status: { type: 'string', enum: ['ALL', 'ENABLED', 'PAUSED'] },
        filter: { type: 'string', enum: ['ALL', 'NON_CONVERTING', 'LOW_QUALITY'] },
        minCost: { type: 'number', minimum: 0 },
        ...dateProps,
        limit,
      },
      additionalProperties: false,
    },
    handler: listKeywords,
  },
  {
    name: 'get_search_terms',
    kind: 'read',
    description:
      'Actual search queries that triggered ads, with cost, clicks, conversions and whether they are already keywords or negatives. Use for waste and opportunity investigation.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId,
        campaignName,
        adGroupId: { type: 'string' },
        filter: { type: 'string', enum: ['ALL', 'NON_CONVERTING', 'CONVERTING'] },
        contains: { type: 'string', description: 'Only queries containing this text.' },
        minCost: { type: 'number', minimum: 0 },
        sortBy: { type: 'string', enum: ['cost', 'conversions', 'clicks'] },
        ...dateProps,
        limit,
      },
      additionalProperties: false,
    },
    handler: getSearchTerms,
  },
  {
    name: 'diagnose_account',
    kind: 'read',
    description:
      'Deterministic health check for the account or one campaign: zero-conversion spend, CPA outliers, budget-limited campaigns, non-converting search terms, wasteful and low-quality keywords — each with evidence. Use for "what should I fix/optimise" questions.',
    inputSchema: {
      type: 'object',
      properties: { campaignId, campaignName, ...dateProps },
      additionalProperties: false,
    },
    handler: runDiagnostics,
  },
];

const UPDATE_TASK_SPEC: ToolSpec = {
  name: 'update_task',
  kind: 'memory',
  description:
    'Save durable task memory so later turns keep context: the objective, parameters the user gave (merged key by key; null removes one), decisions, open questions, constraints/limitations, key findings, and resources involved. Omit taskId to update the active task; set newTask for a different piece of work; pass taskId to switch back to an earlier task. Write your reply to the user in the same response.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: { type: 'string' },
      newTask: { type: 'boolean' },
      title: { type: 'string', maxLength: 80 },
      objective: { type: 'string', maxLength: 300 },
      status: { type: 'string', enum: TASK_STATUSES },
      parameters: { type: 'object', description: 'e.g. {"campaignName":"Spring","dailyBudget":5,"status":"PAUSED"}' },
      decisions: { type: 'array', items: { type: 'string' } },
      openQuestions: { type: 'array', items: { type: 'string' }, description: 'Replaces the list. [] when nothing is missing.' },
      constraints: { type: 'array', items: { type: 'string' } },
      findings: { type: 'array', items: { type: 'string' } },
      resources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['campaign', 'ad_group', 'keyword', 'conversion_action', 'custom_goal'] },
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['type', 'id'],
        },
      },
    },
    additionalProperties: false,
  },
};

function writeSpec(operation: OperationDescriptor): ToolSpec {
  return {
    name: operation.name,
    kind: 'write',
    description: `${operation.description} Prepares a proposal for the user to approve; it does not change the account.`,
    inputSchema: operation.schema,
  };
}

export function listToolSpecs(): ToolSpec[] {
  return [
    ...READ_TOOLS.map(({ handler, ...spec }) => spec),
    ...listOperations().map(writeSpec),
    UPDATE_TASK_SPEC,
  ];
}

export function getToolKind(name: string): ToolKind | undefined {
  if (name === UPDATE_TASK_SPEC.name) return 'memory';
  if (READ_TOOLS.some((tool) => tool.name === name)) return 'read';
  if (getOperation(name)) return 'write';
  return undefined;
}

export function getToolDefinitions(): ToolDefinition[] {
  return listToolSpecs().map((spec) => ({
    type: 'function',
    function: { name: spec.name, description: spec.description, parameters: spec.inputSchema },
  }));
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function errorOutcome(kind: ToolKind, error: unknown): ToolOutcome {
  return { payload: { error: toToolErrorPayload(error) }, isError: true, kind };
}

function resourcesFromRead(name: string, payload: Record<string, any>): ResourceRef[] {
  const at = new Date().toISOString();
  const refs: ResourceRef[] = [];
  const seen = new Set<string>();

  const add = (ref: ResourceRef) => {
    const key = `${ref.type}:${ref.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  };

  // Direct campaign on payload (get_campaign_details, get_conversion_setup, etc.)
  if (payload?.campaignId) {
    add({ type: 'campaign', id: String(payload.campaignId), name: payload.name || payload.campaignName, lastSeenAt: at });
  }

  // Nested scope or campaign
  const scope = payload?.scope || payload?.campaign;
  if (scope?.campaignId) {
    add({ type: 'campaign', id: String(scope.campaignId), name: scope.campaignName || scope.name, lastSeenAt: at });
  }

  // list_campaigns - remember all discovered campaigns up to 20
  if (Array.isArray(payload?.campaigns)) {
    for (const campaign of payload.campaigns.slice(0, 20)) {
      if (campaign?.id) {
        add({ type: 'campaign', id: String(campaign.id), name: campaign.name, lastSeenAt: at });
      }
    }
  }

  // conversion actions from get_conversion_setup
  if (Array.isArray(payload?.conversionActions)) {
    for (const action of payload.conversionActions.slice(0, 20)) {
      if (action?.id) {
        add({ type: 'conversion_action', id: String(action.id), name: action.name, lastSeenAt: at });
      }
    }
  }

  // ad groups from list_ad_groups
  if (Array.isArray(payload?.adGroups)) {
    for (const ag of payload.adGroups.slice(0, 20)) {
      if (ag?.id) {
        add({
          type: 'ad_group',
          id: String(ag.id),
          name: ag.name,
          parentId: payload?.campaignId ? String(payload.campaignId) : undefined,
          lastSeenAt: at,
        });
      }
    }
  }

  // rows from get_performance or list_keywords
  if (Array.isArray(payload?.rows)) {
    for (const row of payload.rows.slice(0, 20)) {
      if (row?.campaignId) {
        add({ type: 'campaign', id: String(row.campaignId), name: row.campaignName, lastSeenAt: at });
      }
      if (row?.adGroupId) {
        add({
          type: 'ad_group',
          id: String(row.adGroupId),
          name: row.adGroupName,
          parentId: row.campaignId ? String(row.campaignId) : undefined,
          lastSeenAt: at,
        });
      }
      if (row?.criterionId) {
        add({
          type: 'keyword',
          id: String(row.criterionId),
          name: row.keyword,
          parentId: row.adGroupId ? String(row.adGroupId) : undefined,
          lastSeenAt: at,
        });
      }
    }
  }

  return refs;
}

async function runWrite(name: string, rawArgs: Record<string, unknown>, runtime: ToolRuntime): Promise<ToolOutcome> {
  const operation = getOperation(name)!;
  try {
    const args = normalizeArgs(operation.schema, rawArgs);
    const validation = validateOperationArgs(operation, args);
    if (!validation.valid) throw invalidArgument(validation.errors.join(' '));

    const prepared = await operation.prepare(args, runtime.ads);

    const plan = operation.plan(prepared.args, runtime.ads, prepared.before);
    const rejected = await preflightPlan(plan, runtime.ads);
    if (rejected) {
      const error = fromGoogleAdsFailure(rejected.failure);
      error.payload.message = `Google Ads rejected this change during validation (nothing was proposed or changed): ${error.payload.message}`;
      throw error;
    }

    const owner = ensureActiveTask(runtime.getState(), prepared.summary);
    const updatedWithParams = applyTaskUpdate(owner.state, {
      taskId: owner.task.id,
      parameters: prepared.args,
    });
    runtime.setState(updatedWithParams.state);

    if (!runtime.saveProposal) throw new Error('Proposal storage is unavailable.');
    const draft: ProposalDraft = {
      ...prepared,
      operation: operation.name,
      title: operation.title,
      actionType: operation.actionType(prepared.args),
      destructive: operation.destructive(prepared.args),
      targetKey: operation.targetKey(prepared.args),
      taskId: owner.task.id,
    };
    const stored = await runtime.saveProposal(draft);

    let state = recordProposal(
      runtime.getState(),
      owner.task.id,
      {
        proposalId: stored.proposalId,
        revision: stored.revision,
        operation: operation.name,
        summary: prepared.summary,
        status: 'pending_approval',
        targetKey: draft.targetKey,
      },
      stored.supersededIds
    );
    const target = prepared.target;
    state = noteResources(state, [
      ...(target.campaignId ? [{ type: 'campaign' as const, id: target.campaignId, name: target.campaignName }] : []),
      ...(target.adGroupId ? [{ type: 'ad_group' as const, id: target.adGroupId, name: target.adGroupName, parentId: target.campaignId }] : []),
    ]);
    runtime.setState(state);

    return {
      kind: 'write',
      isError: false,
      payload: {
        status: 'proposal_prepared',
        proposalId: stored.proposalId,
        revision: stored.revision,
        summary: prepared.summary,
        changes: prepared.changes,
        warnings: prepared.warnings.length ? prepared.warnings : undefined,
        destructive: draft.destructive || undefined,
        replacesEarlierProposal: stored.supersededIds.length ? true : undefined,
        validatedByGoogleAds: true,
        note: 'Nothing has changed in Google Ads. The user must approve this exact proposal on its card before anything is applied.',
      },
    };
  } catch (error) {
    return errorOutcome('write', error);
  }
}

function runTaskUpdate(rawArgs: Record<string, unknown>, runtime: ToolRuntime): ToolOutcome {
  try {
    const update: TaskUpdate = {};
    if (typeof rawArgs.taskId === 'string' && rawArgs.taskId.trim()) update.taskId = rawArgs.taskId.trim();
    if (rawArgs.newTask === true) update.newTask = true;
    for (const key of ['title', 'objective'] as const) if (typeof rawArgs[key] === 'string') update[key] = rawArgs[key] as string;
    if (typeof rawArgs.status === 'string' && TASK_STATUSES.includes(rawArgs.status as never)) update.status = rawArgs.status as TaskUpdate['status'];
    if (rawArgs.parameters && typeof rawArgs.parameters === 'object' && !Array.isArray(rawArgs.parameters)) {
      update.parameters = rawArgs.parameters as Record<string, unknown>;
    }
    for (const key of ['decisions', 'openQuestions', 'constraints', 'findings'] as const) {
      if (Array.isArray(rawArgs[key])) update[key] = rawArgs[key] as string[];
    }
    if (Array.isArray(rawArgs.resources)) {
      update.resources = (rawArgs.resources as Array<Record<string, unknown>>)
        .filter((item) => item && typeof item.id !== 'undefined' && typeof item.type === 'string')
        .map((item) => ({
          type: item.type as ResourceRef['type'],
          id: String(item.id).trim(),
          name: typeof item.name === 'string' ? item.name : undefined,
        }));
    }
    const { state, task } = applyTaskUpdate(runtime.getState(), update);
    runtime.setState(state);
    return {
      kind: 'memory',
      isError: false,
      payload: {
        saved: true,
        task: {
          id: task.id,
          status: task.status,
          parameters: task.parameters,
          openQuestions: task.openQuestions,
        },
      },
    };
  } catch (error) {
    const payload: ToolErrorPayload = {
      code: 'invalid_argument',
      message: error instanceof Error ? error.message : 'The task could not be saved.',
      next_step: 'Fix the task reference or omit taskId to update the active task.',
    };
    return { kind: 'memory', isError: true, payload: { error: payload } };
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  runtime: ToolRuntime
): Promise<ToolOutcome & { resources?: ResourceRef[] }> {
  if (name === UPDATE_TASK_SPEC.name) return runTaskUpdate(args, runtime);

  const read = READ_TOOLS.find((tool) => tool.name === name);
  if (read) {
    try {
      const payload = (await read.handler(runtime.ads, args || {})) as Record<string, any>;
      return { kind: 'read', isError: false, payload, resources: resourcesFromRead(name, payload) };
    } catch (error) {
      return errorOutcome('read', error);
    }
  }

  if (getOperation(name)) return runWrite(name, args || {}, runtime);

  return {
    kind: 'read',
    isError: true,
    payload: {
      error: {
        code: 'unsupported',
        message: `There is no tool named "${name}".`,
        next_step: 'Use one of the available tools.',
      },
    },
  };
}
