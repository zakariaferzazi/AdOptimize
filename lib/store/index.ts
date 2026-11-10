import { memoryStore } from './memory';
import { createD1Store, ensureD1Schema, type D1Database } from './d1';
import type { Store } from './types';

/**
 * Resolves the active store.
 *
 * - `AI_STORE=memory` forces the in-memory implementation (tests, local dev).
 * - Otherwise the Cloudflare D1 binding named `DB` is used when present.
 * - When no binding exists (plain `next dev`), the in-memory store is used so
 *   the app still runs; production always has the binding.
 */

let cachedStore: Store | undefined;
let schemaReady: Promise<void> | undefined;

async function resolveD1(): Promise<D1Database | undefined> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const context = (mod as { getCloudflareContext?: (options?: { async?: boolean }) => unknown })
      .getCloudflareContext;
    if (typeof context !== 'function') return undefined;
    const resolved = (await context({ async: true })) as
      | { env?: Record<string, unknown> }
      | undefined;
    const binding = resolved?.env?.DB as D1Database | undefined;
    return binding && typeof binding.prepare === 'function' ? binding : undefined;
  } catch {
    return undefined;
  }
}

export async function getStore(): Promise<Store> {
  if (cachedStore) return cachedStore;

  if (process.env.AI_STORE === 'memory') {
    cachedStore = memoryStore;
    return cachedStore;
  }

  const db = await resolveD1();
  if (!db) {
    cachedStore = memoryStore;
    return cachedStore;
  }

  if (!schemaReady) {
    schemaReady = ensureD1Schema(db).catch((error) => {
      console.error('[AI Store] D1 schema initialisation failed:', error);
    });
  }
  await schemaReady;

  cachedStore = createD1Store(db);
  return cachedStore;
}

/** Test helper: drop the cached store so a new binding is picked up. */
export function resetStoreCache(): void {
  cachedStore = undefined;
  schemaReady = undefined;
}

export type { Store } from './types';
