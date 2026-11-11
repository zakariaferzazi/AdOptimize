import { CAMPAIGN_OPERATIONS } from './operations/campaign-ops';
import { CONVERSION_OPERATIONS } from './operations/conversion-ops';
import { STRUCTURE_OPERATIONS } from './operations/structure-ops';
import { createCampaign } from './operations/create-campaign';
import type { OperationDescriptor } from './operations/types';

/**
 * Catalog of every Google Ads change the agent can propose.
 *
 * Each entry is a validated business operation (never a generic mutate). The
 * tool definitions shown to the model, the proposal engine, the executor and
 * the MCP surface all read from this single list.
 */

export * from './operations/types';

export const OPERATION_CATALOG: OperationDescriptor[] = [
  ...CAMPAIGN_OPERATIONS,
  createCampaign,
  ...CONVERSION_OPERATIONS,
  ...STRUCTURE_OPERATIONS,
];

const BY_NAME = new Map(OPERATION_CATALOG.map((operation) => [operation.name, operation]));

export function getOperation(name: string): OperationDescriptor | undefined {
  return BY_NAME.get(name);
}

export function listOperations(): OperationDescriptor[] {
  return OPERATION_CATALOG;
}
