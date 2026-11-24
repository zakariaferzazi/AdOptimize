import { appOrigin, BillingError } from '@/lib/billing/config';
import { billingDb, hash } from '@/lib/billing/store';
import { executeGoogleAdsTokenRefresh } from '@/lib/google-token-refresh';

export const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
const STATE_TTL_SECONDS = 600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function bytes(length: number): Uint8Array<ArrayBuffer> {
  const value = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(value);
  return value;
}
function encode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
  const result = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
  return result;
}

async function key(): Promise<CryptoKey> {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  let material: Uint8Array<ArrayBuffer> | undefined;
  try { material = raw ? decode(raw) : undefined; } catch { material = undefined; }
  if (!material || material.length !== 32) {
    throw new BillingError(503, 'Google Ads connection storage is not configured yet.', 'ads_storage_unavailable');
  }
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// The context binds each ciphertext to its owner and purpose so rows cannot be swapped.
export async function seal(plain: string, context: string): Promise<string> {
  const iv = bytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, await key(), new TextEncoder().encode(plain));
  return `v1.${encode(iv)}.${encode(new Uint8Array(cipher))}`;
}

export async function open(sealed: string, context: string): Promise<string> {
  const [version, iv, cipher] = sealed.split('.');
  if (version !== 'v1' || !iv || !cipher) throw new BillingError(503, 'Stored Google Ads credentials are unreadable.', 'ads_reconnect_required');
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decode(iv), additionalData: new TextEncoder().encode(context) }, await key(), decode(cipher));
    return new TextDecoder().decode(plain);
  } catch (error) {
    if (error instanceof BillingError) throw error;
    throw new BillingError(409, 'Stored Google Ads credentials are unreadable. Reconnect Google Ads.', 'ads_reconnect_required');
  }
}

export function oauthClient() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID?.trim() ||
    '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.CLIENT_SECRET?.trim();
  if (!clientSecret) throw new BillingError(503, 'Google Ads connection is not configured yet.', 'ads_oauth_unavailable');
  return { clientId, clientSecret, redirectUri: `${appOrigin()}/api/google-ads/oauth-callback` };
}

export async function beginAuthorization(userId: string): Promise<string> {
  const { clientId, redirectUri } = oauthClient();
  const state = encode(bytes(32));
  const verifier = encode(bytes(32));
  const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const db = await billingDb();
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare('DELETE FROM google_ads_oauth_states WHERE expires_at < ?').bind(now),
    db.prepare('INSERT INTO google_ads_oauth_states (state_hash, user_id, verifier_cipher, expires_at) VALUES (?, ?, ?, ?)')
      .bind(hash(state), userId, await seal(verifier, `verifier:${userId}`), now + STATE_TTL_SECONDS),
  ]);
  const params = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: GOOGLE_ADS_SCOPE,
    state, code_challenge: challenge, code_challenge_method: 'S256',
    access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// States are single use: DELETE ... RETURNING makes consumption atomic.
export async function completeAuthorization(state: string, code: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(state) || !code || code.length > 2048) {
    throw new BillingError(400, 'The Google authorization response was invalid.');
  }
  const db = await billingDb();
  const row = await db.prepare('DELETE FROM google_ads_oauth_states WHERE state_hash = ? RETURNING user_id, verifier_cipher, expires_at')
    .bind(hash(state)).first<{ user_id: string; verifier_cipher: string; expires_at: number }>();
  if (!row || row.expires_at < Math.floor(Date.now() / 1000)) {
    throw new BillingError(400, 'The Google authorization expired. Please try again.');
  }
  const verifier = await open(row.verifier_cipher, `verifier:${row.user_id}`);
  const { clientId, clientSecret, redirectUri } = oauthClient();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cache: 'no-store',
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, code_verifier: verifier,
    }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  const scopes = String(data.scope || '').split(' ');
  if (!response.ok || typeof data.access_token !== 'string') throw new BillingError(401, 'Google rejected the authorization. Please try again.');
  if (!scopes.includes(GOOGLE_ADS_SCOPE)) throw new BillingError(403, 'Google Ads access was not granted.');
  if (typeof data.refresh_token !== 'string') throw new BillingError(409, 'Google did not return offline access. Please try again.');
  await saveTokens(row.user_id, {
    refreshToken: data.refresh_token, accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  });
  return row.user_id;
}

async function saveTokens(userId: string, tokens: { refreshToken?: string; accessToken: string; expiresAt: number }): Promise<void> {
  const db = await billingDb();
  const access = await seal(tokens.accessToken, `access:${userId}`);
  const now = Math.floor(Date.now() / 1000);
  if (tokens.refreshToken) {
    await db.prepare(`INSERT INTO google_ads_tokens (user_id, refresh_cipher, access_cipher, access_expires_at, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET refresh_cipher = excluded.refresh_cipher,
      access_cipher = excluded.access_cipher, access_expires_at = excluded.access_expires_at,
      scope = excluded.scope, updated_at = excluded.updated_at`)
      .bind(userId, await seal(tokens.refreshToken, `refresh:${userId}`), access, tokens.expiresAt, GOOGLE_ADS_SCOPE, now).run();
  } else {
    await db.prepare('UPDATE google_ads_tokens SET access_cipher = ?, access_expires_at = ?, updated_at = ? WHERE user_id = ?')
      .bind(access, tokens.expiresAt, now, userId).run();
  }
}

export async function hasStoredTokens(userId: string): Promise<boolean> {
  return Boolean(await (await billingDb()).prepare('SELECT 1 AS present FROM google_ads_tokens WHERE user_id = ?').bind(userId).first());
}

export async function deleteStoredTokens(userId: string): Promise<void> {
  const db = await billingDb();
  await db.batch([
    db.prepare('DELETE FROM google_ads_tokens WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM google_ads_oauth_states WHERE user_id = ?').bind(userId),
  ]);
}

export async function freshAccessToken(userId: string): Promise<{ accessToken?: string; expiresAt?: number; error?: string }> {
  const row = await (await billingDb()).prepare(
    'SELECT refresh_cipher, access_cipher, access_expires_at FROM google_ads_tokens WHERE user_id = ?')
    .bind(userId).first<{ refresh_cipher: string; access_cipher: string | null; access_expires_at: number | null }>();
  if (!row) return { error: 'Google Ads is not connected. Connect Google Ads to continue.' };
  if (row.access_cipher && row.access_expires_at && row.access_expires_at - Date.now() > REFRESH_MARGIN_MS) {
    return { accessToken: await open(row.access_cipher, `access:${userId}`), expiresAt: row.access_expires_at };
  }
  const refreshToken = await open(row.refresh_cipher, `refresh:${userId}`);
  const { clientId, clientSecret } = oauthClient();
  // The user's own refresh token is always passed so the shared environment fallback is never used.
  const refreshed = await executeGoogleAdsTokenRefresh({ refreshToken, clientId, clientSecret });
  if (!refreshed.success || !refreshed.accessToken) {
    if (refreshed.requiresInteractive) await deleteStoredTokens(userId);
    return { error: 'Google Ads access expired. Reconnect Google Ads.' };
  }
  const expiresAt = Date.now() + (refreshed.expiresIn || 3600) * 1000;
  await saveTokens(userId, {
    accessToken: refreshed.accessToken, expiresAt,
    ...(refreshed.refreshToken && refreshed.refreshToken !== refreshToken ? { refreshToken: refreshed.refreshToken } : {}),
  });
  return { accessToken: refreshed.accessToken, expiresAt };
}
