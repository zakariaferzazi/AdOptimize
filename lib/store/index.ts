import { memoryStore } from './memory';
import { createD1Store, ensureD1Schema, type D1Database } from './d1';
import type { Store } from './types';

/**
 * Resolves the active store.
 *
 * - `AI_STORE=memory` forces the in-memory implementation outside production.
 * - Otherwise the Cloudflare D1 binding named `DB` is used when present.
 * - When no binding exists, local development can use memory; production fails
 *   explicitly rather than accepting chats that will disappear.
 *
 * The in-memory store is NOT durable: proposals created in one request are not
 * visible to another isolate. In production that means approvals fail closed
 * with "proposal not found" rather than executing something unauthorised, but
 * the feature is unusable. Production therefore requires D1.
 */

let cachedStore: Store | undefined;
let cachedDurable = false;
let schemaReady: Promise<void> | undefined;
let warnedAboutMemory = false;

export async function getD1Database(): Promise<D1Database | undefined> {
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
    'will NOT persist across Worker instances or restarts. Configure the ' +
    'D1 binding "DB" in wrangler.jsonc for durable storage.';
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
  } else {
    console.warn(message);
  }
}

export async function getStore(): Promise<Store> {
  if (cachedStore) return cachedStore;

  if (process.env.AI_STORE === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI_STORE=memory is not allowed in production. Configure the D1 binding "DB".');
    }
    warnMemoryFallback('AI_STORE=memory');
    cachedStore = memoryStore;
    cachedDurable = false;
    return cachedStore;
  }

  const db = await getD1Database();
  if (!db) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Account chat storage is unavailable. Configure the D1 binding "DB".');
    }
    warnMemoryFallback('no DB binding');
    cachedStore = memoryStore;
    cachedDurable = false;
    return cachedStore;
  }

  if (!schemaReady) {
    schemaReady = ensureD1Schema(db).catch((error) => {
      schemaReady = undefined;
      console.error('[AI Store] D1 schema initialisation failed:', error);
      throw error;
    });
  }
  await schemaReady;

  cachedStore = createD1Store(db);
  cachedDurable = true;
  return cachedStore;
}

/** True when the active store survives across Worker instances and restarts. */
export function isDurableStore(): boolean {
  return cachedDurable;
}

/** True only when a Cloudflare D1 binding is actively backing getStore(). */
export function isD1Active(): boolean {
  return cachedDurable;
}

/** Test helper: drop the cached store so a new binding is picked up. */
export function resetStoreCache(): void {
  cachedStore = undefined;
  cachedDurable = false;
  schemaReady = undefined;
  warnedAboutMemory = false;
}

export type { Store } from './types';
