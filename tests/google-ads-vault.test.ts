import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { NextRequest } from 'next/server';
import type { D1Database } from '@/lib/store/d1';

const mocks = vi.hoisted(() => ({ db: undefined as D1Database | undefined }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: async () => ({ env: { DB: mocks.db } }) }));
vi.mock('@/lib/ai/identity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/identity')>();
  return {
    ...actual,
    verifyFirebaseIdToken: vi.fn(async (token: string) => {
      if (token !== 'valid-a' && token !== 'valid-b') throw new actual.UnauthorizedError('Invalid token.');
      return { uid: token === 'valid-a' ? 'user-a' : 'user-b', emailVerified: false, expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    }),
  };
});

import { POST as authorize } from '@/app/api/google-ads/authorize/route';
import { POST as mintToken, DELETE as revoke } from '@/app/api/google-ads/token/route';
import { GET as callback } from '@/app/api/google-ads/oauth-callback/route';
import { beginAuthorization, completeAuthorization, deleteStoredTokens, freshAccessToken, hasStoredTokens } from '@/lib/google-ads/vault';

const origin = 'https://app.example.test';
const key = Buffer.alloc(32, 7).toString('base64');
let db: D1Database;
let dispose: (() => Promise<void>) | undefined;
const googleCalls: URLSearchParams[] = [];
let googleReply: () => { status: number; body: Record<string, unknown> };

function request(path: string, token = 'valid-a', method = 'POST'): NextRequest {
  return new NextRequest(`${origin}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Origin: origin } });
}
async function connect(uid = 'user-a', refresh = 'refresh-secret-1', access = 'access-secret-1') {
  googleReply = () => ({ status: 200, body: { access_token: access, refresh_token: refresh, expires_in: 3600, scope: 'https://www.googleapis.com/auth/adwords' } });
  const url = new URL(await beginAuthorization(uid));
  await completeAuthorization(url.searchParams.get('state')!, 'auth-code');
  return url;
}

beforeAll(async () => {
  const platform = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', persist: false });
  db = platform.env.DB;
  mocks.db = db;
  dispose = platform.dispose;
  for (const file of ['migrations\\0004_billing.sql', 'migrations\\0005_google_ads_tokens.sql']) {
    await db.batch(readFileSync(file, 'utf8').split(';').map((query) => query.trim()).filter(Boolean).map((query) => db.prepare(query)));
  }
}, 30000);
beforeEach(async () => {
  vi.stubEnv('APP_URL', origin);
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', key);
  vi.stubEnv('GOOGLE_ADS_CLIENT_ID', 'client-id.apps.googleusercontent.com');
  vi.stubEnv('GOOGLE_ADS_CLIENT_SECRET', 'client-secret');
  vi.stubEnv('GOOGLE_ADS_REFRESH_TOKEN', 'shared-environment-refresh-token');
  mocks.db = db;
  googleCalls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    googleCalls.push(new URLSearchParams(String(init?.body)));
    const reply = googleReply();
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }));
  await db.batch(['google_ads_tokens', 'google_ads_oauth_states', 'billing_rate_limits'].map((table) => db.prepare(`DELETE FROM ${table}`)));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(async () => { await dispose?.(); });

describe('incremental Google Ads authorization', () => {
  it('requests only the Ads scope with PKCE and offline access, and stores a hashed single-use state', async () => {
    googleReply = () => ({ status: 200, body: { access_token: 'a', refresh_token: 'r', expires_in: 3600, scope: 'https://www.googleapis.com/auth/adwords' } });
    const url = new URL(await beginAuthorization('user-a'));
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/adwords');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('redirect_uri')).toBe(`${origin}/api/google-ads/oauth-callback`);
    const state = url.searchParams.get('state')!;
    const rows = (await db.prepare('SELECT * FROM google_ads_oauth_states').all()).results as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(state);
    await completeAuthorization(state, 'auth-code');
    expect(googleCalls[0].get('code_verifier')).toBeTruthy();
    await expect(completeAuthorization(state, 'auth-code')).rejects.toMatchObject({ status: 400 });
  });

  it('stores credentials encrypted, bound to the owning user, and never in plaintext', async () => {
    await connect('user-a');
    const row = await db.prepare('SELECT * FROM google_ads_tokens WHERE user_id = ?').bind('user-a').first<Record<string, string>>();
    expect(JSON.stringify(row)).not.toContain('refresh-secret-1');
    expect(JSON.stringify(row)).not.toContain('access-secret-1');
    expect((await freshAccessToken('user-a')).accessToken).toBe('access-secret-1');

    await connect('user-b', 'refresh-secret-2', 'access-secret-2');
    await db.prepare('UPDATE google_ads_tokens SET access_cipher = (SELECT access_cipher FROM google_ads_tokens WHERE user_id = ?) WHERE user_id = ?')
      .bind('user-a', 'user-b').run();
    await expect(freshAccessToken('user-b')).rejects.toMatchObject({ code: 'ads_reconnect_required' });
  });

  it('refreshes expired access with the user\'s own refresh token, never the shared environment token', async () => {
    await connect('user-a');
    await db.prepare('UPDATE google_ads_tokens SET access_expires_at = ? WHERE user_id = ?').bind(Date.now() - 1000, 'user-a').run();
    googleReply = () => ({ status: 200, body: { access_token: 'access-renewed', expires_in: 3600 } });
    googleCalls.length = 0;
    expect((await freshAccessToken('user-a')).accessToken).toBe('access-renewed');
    expect(googleCalls[0].get('refresh_token')).toBe('refresh-secret-1');
    expect(googleCalls[0].get('refresh_token')).not.toBe('shared-environment-refresh-token');
  });

  it('removes credentials when Google revokes them and asks the user to reconnect', async () => {
    await connect('user-a');
    await db.prepare('UPDATE google_ads_tokens SET access_expires_at = ? WHERE user_id = ?').bind(Date.now() - 1000, 'user-a').run();
    googleReply = () => ({ status: 400, body: { error: 'invalid_grant' } });
    expect((await freshAccessToken('user-a')).error).toMatch(/Reconnect/);
    expect(await hasStoredTokens('user-a')).toBe(false);
  });

  it('rejects grants without the Ads scope or offline access and unknown or expired states', async () => {
    const url = new URL(await beginAuthorization('user-a'));
    googleReply = () => ({ status: 200, body: { access_token: 'a', refresh_token: 'r', scope: 'openid email' } });
    await expect(completeAuthorization(url.searchParams.get('state')!, 'code')).rejects.toMatchObject({ status: 403 });
    const second = new URL(await beginAuthorization('user-a'));
    googleReply = () => ({ status: 200, body: { access_token: 'a', scope: 'https://www.googleapis.com/auth/adwords' } });
    await expect(completeAuthorization(second.searchParams.get('state')!, 'code')).rejects.toMatchObject({ status: 409 });
    await expect(completeAuthorization('x'.repeat(40), 'code')).rejects.toMatchObject({ status: 400 });
    expect(await hasStoredTokens('user-a')).toBe(false);
  });

  it('fails closed when the encryption key is missing or malformed', async () => {
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');
    await expect(beginAuthorization('user-a')).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', Buffer.alloc(8).toString('base64'));
    await expect(beginAuthorization('user-a')).rejects.toMatchObject({ status: 503 });
  });

  it('exposes only authenticated, origin-checked endpoints and never returns a refresh token', async () => {
    expect((await authorize(request('/api/google-ads/authorize', 'forged'))).status).toBe(401);
    const foreign = request('/api/google-ads/authorize');
    foreign.headers.set('origin', 'https://attacker.test');
    expect((await authorize(foreign)).status).toBe(403);
    expect((await authorize(request('/api/google-ads/authorize'))).status).toBe(200);

    expect((await mintToken(request('/api/google-ads/token'))).status).toBe(404);
    await connect('user-a');
    const response = await mintToken(request('/api/google-ads/token'));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain('access-secret-1');
    expect(text).not.toContain('refresh-secret-1');
    expect((await mintToken(request('/api/google-ads/token', 'valid-b'))).status).toBe(404);
    expect((await revoke(request('/api/google-ads/token', 'valid-a', 'DELETE'))).status).toBe(200);
    expect(await hasStoredTokens('user-a')).toBe(false);
  });

  it('completes the popup callback, and a bad callback leaks nothing and stores nothing', async () => {
    googleReply = () => ({ status: 200, body: { access_token: 'access-secret-1', refresh_token: 'refresh-secret-1', expires_in: 3600, scope: 'https://www.googleapis.com/auth/adwords' } });
    const url = new URL(await beginAuthorization('user-a'));
    const ok = await callback(new Request(`${origin}/api/google-ads/oauth-callback?code=abc&state=${url.searchParams.get('state')}`));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('GOOGLE_ADS_AUTHORIZED');
    expect(await hasStoredTokens('user-a')).toBe(true);

    const bad = await callback(new Request(`${origin}/api/google-ads/oauth-callback?code=abc&state=${'z'.repeat(43)}`));
    expect(bad.status).toBe(400);
    const body = await bad.text();
    expect(body).toContain('GOOGLE_ADS_OAUTH_ERROR');
    expect(body).not.toContain('abc');
    expect((await callback(new Request(`${origin}/api/google-ads/oauth-callback?error=access_denied`))).status).toBe(400);
    await deleteStoredTokens('user-a');
  });
});
