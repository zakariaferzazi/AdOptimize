import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStore, isDurableStore, resetStoreCache } from '@/lib/store';
import type { D1Database } from '@/lib/store/d1';

const binding = vi.hoisted(() => ({ db: undefined as D1Database | undefined }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: async () => ({ env: { DB: binding.db } }),
}));

beforeEach(() => {
  resetStoreCache();
  binding.db = undefined;
});

afterEach(() => {
  resetStoreCache();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('production account storage', () => {
  it('rejects a missing D1 binding rather than losing account history in memory', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AI_STORE', '');
    await expect(getStore()).rejects.toThrow('Configure the D1 binding "DB"');
    expect(isDurableStore()).toBe(false);
  });

  it('does not allow an explicit production memory override', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AI_STORE', 'memory');
    await expect(getStore()).rejects.toThrow('not allowed in production');
  });

  it('still supports memory storage for local development and tests', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AI_STORE', 'memory');
    expect(await getStore()).toBeDefined();
    expect(isDurableStore()).toBe(false);
  });

  it('surfaces D1 initialization failures and retries instead of caching a broken store', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AI_STORE', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('D1 unavailable'))
      .mockResolvedValue({ success: true });
    binding.db = {
      prepare: () => ({ run, bind: vi.fn(), first: vi.fn(), all: vi.fn() }),
      batch: vi.fn(),
    };
    await expect(getStore()).rejects.toThrow('D1 unavailable');
    expect(isDurableStore()).toBe(false);
    expect(await getStore()).toBeDefined();
    expect(isDurableStore()).toBe(true);
  });
});
