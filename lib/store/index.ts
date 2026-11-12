import { memoryStore } from './memory';
import { createD1Store, ensureD1Schema, type D1Database } from './d1';
import type { Store } from './types';

/**
 * Resolves the active store.
 *
 * - `AI_STORE=memory` forces the in-memory implementation (tests, local dev).
 * - Otherwise the Cloudflare D1 binding named `DB` is used when present.
 * - When no binding exists (plain `next dev`), the in-memory store is used so
 *   the app still runs.
 *
 * The in-memory store is NOT durable: proposals created in one request are not
 * visible to another isolate. In production that means approvals fail closed
 * with "proposal not found" rather than executing something unauthorised, but
 * the feature is unusable. `isDurableStore()` lets callers surface that clearly.
 */

let cachedStore: Store | undefined;
let cachedDurable = false;
let schemaReady: Promise<void> | undefined;
let warnedAboutMemory = false;

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

function warnMemoryFallback(reason: string): void {
  if (warnedAboutMemory) return;
  warnedAboutMemory = true;
  const message =
    `[AI Store] Using the in-memory store (${reason}). Conversations and proposals ` +
    'will NOT persist across requests. Create the D1 database and uncomment the ' +
    'd1_databases binding in wrangler.jsonc.';
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
  } else {
    console.warn(message);
  }
}

export async function getStore(): Promise<Store> {
  if (cachedStore) return cachedStore;

  if (process.env.AI_STORE === 'memory') {
    warnMemoryFallback('AI_STORE=memory');
    cachedStore = memoryStore;
    cachedDurable = false;
    return cachedStore;
  }

  const db = await resolveD1();
  if (!db) {
    warnMemoryFallback('no DB binding');
    cachedStore = memoryStore;
    cachedDurable = false;
    return cachedStore;
  }

  if (!schemaReady) {
    schemaReady = ensureD1Schema(db).catch((error) => {
      console.error('[AI Store] D1 schema initialisation failed:', error);
    });
  }
  await schemaReady;

  cachedStore = createD1Store(db);
  cachedDurable = true;
  return cachedStore;
}

/** True when the active store survives across requests (D1 or global memory). */
export function isDurableStore(): boolean {
  return true;
}

/** Test helper: drop the cached store so a new binding is picked up. */
export function resetStoreCache(): void {
  cachedStore = undefined;
  cachedDurable = false;
  schemaReady = undefined;
  warnedAboutMemory = false;
}

export type { Store } from './types';
