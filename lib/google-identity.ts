'use client';

/**
 * Google Ads authorization (client side).
 *
 * Signing in never grants Google Ads access. Ads access is a separate, incremental
 * authorization-code flow that runs on the server: the browser only opens Google's consent
 * screen, then receives short-lived access tokens. The refresh token stays encrypted on the server.
 */

import { authenticatedFetch } from '@/lib/authenticated-fetch';

const TOKEN_KEYS = [
  'google_ads_oauth_token',
  'google_ads_oauth_token_timestamp',
  'google_ads_token_expires_at',
  'google_ads_oauth_token_broadcast',
  'google_ads_refresh_token',
  'google_ads_login_cid',
  'google_ads_quota_reset_at',
];

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Helper to store a short-lived access token with expiration tracking.
 */
export function storeGoogleAdsToken(token: string, expiresInSeconds = 3600, expiresAtMs?: number): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const expiresAt = String(expiresAtMs || now + expiresInSeconds * 1000);
  const values: Record<string, string> = {
    google_ads_oauth_token: token,
    google_ads_oauth_token_timestamp: String(now),
    google_ads_token_expires_at: expiresAt,
  };
  for (const [key, value] of Object.entries(values)) {
    try { sessionStorage.setItem(key, value); } catch {}
    try { localStorage.setItem(key, value); } catch {}
  }
}

export function isGoogleAdsTokenExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const token = readStorage('google_ads_oauth_token');
  if (!token || !token.trim()) return true;

  const expiresAt = Number(readStorage('google_ads_token_expires_at'));
  if (!isNaN(expiresAt) && expiresAt > 0) return Date.now() >= expiresAt;

  const issuedAt = Number(readStorage('google_ads_oauth_token_timestamp'));
  if (!isNaN(issuedAt) && issuedAt > 0) return Date.now() >= issuedAt + 3600 * 1000;
  return false;
}

/**
 * True when the access token is within 5 minutes of expiring and should be renewed in the background.
 */
export function isTokenEligibleForAutoRenewal(): boolean {
  if (typeof window === 'undefined') return false;
  const expiresAt = Number(readStorage('google_ads_token_expires_at'));
  if (!isNaN(expiresAt) && expiresAt > 0) return expiresAt - Date.now() < 5 * 60 * 1000;

  const issuedAt = Number(readStorage('google_ads_oauth_token_timestamp'));
  if (isNaN(issuedAt) || issuedAt <= 0) return false;
  return Date.now() - issuedAt > 50 * 60 * 1000;
}

export function getStoredGoogleAdsToken(): { token: string | null; isExpired: boolean; expiresAt?: number } {
  if (typeof window === 'undefined') return { token: null, isExpired: true };
  const token = readStorage('google_ads_oauth_token');
  if (!token || !token.trim()) return { token: null, isExpired: true };
  const expiresAt = Number(readStorage('google_ads_token_expires_at'));
  return {
    token: token.trim(),
    isExpired: isGoogleAdsTokenExpired(),
    expiresAt: !isNaN(expiresAt) && expiresAt > 0 ? expiresAt : undefined,
  };
}

// Refresh tokens are never held by the browser; these remain only so older callers compile.
export function storeGoogleAdsRefreshToken(_refreshToken: string): void {}

export function getStoredGoogleAdsRefreshToken(): string | null {
  return null;
}

export function clearStoredGoogleAdsToken(): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  }
}

async function fetchServerAccessToken(): Promise<string | null> {
  const response = await authenticatedFetch('/api/google-ads/token', { method: 'POST' });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  if (typeof data.accessToken !== 'string') return null;
  storeGoogleAdsToken(data.accessToken, undefined, data.expiresAt);
  return data.accessToken;
}

/**
 * Opens Google's consent screen in a popup. The server completes the code exchange in the
 * callback route and stores the credentials encrypted; the popup only reports success or failure.
 */
async function authorizeGoogleAdsViaPopup(): Promise<void> {
  const start = await authenticatedFetch('/api/google-ads/authorize', { method: 'POST' });
  const body = await start.json().catch(() => ({}));
  if (!start.ok || typeof body.url !== 'string') {
    throw new Error(body.error || 'Google Ads authorization could not be started.');
  }

  await new Promise<void>((resolve, reject) => {
    const width = 520;
    const height = 650;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      body.url,
      'google_ads_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`,
    );
    if (!popup) {
      reject(new Error('Popup window was blocked by your browser. Please allow popups for this site and try again.'));
      return;
    }

    let settled = false;
    const finish = (outcome?: Error) => {
      settled = true;
      clearInterval(closeCheck);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      if (outcome) reject(outcome); else resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup) return;
      if (event.data?.type === 'GOOGLE_ADS_AUTHORIZED') finish();
      else if (event.data?.type === 'GOOGLE_ADS_OAUTH_ERROR') finish(new Error('Google Ads authorization was not completed.'));
    };
    // Google's consent pages may sever window.opener, so the callback also signals through storage.
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'google_ads_authorized' && event.newValue && !settled) finish();
    };
    const closeCheck = setInterval(() => {
      if (popup.closed && !settled) {
        // The popup may have succeeded without a message; the server is the source of truth.
        setTimeout(() => {
          if (settled) return;
          void fetchServerAccessToken().then((token) => {
            if (!settled) finish(token ? undefined : new Error('Google authorization window was closed.'));
          }, () => { if (!settled) finish(new Error('Google authorization window was closed.')); });
        }, 800);
      }
    }, 500);
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
  });
}

/**
 * Returns a valid Google Ads access token. Reuses a live local token, then asks the server
 * to mint one from the stored encrypted credentials, and only then opens consent.
 */
export async function acquireGoogleAdsToken(options?: {
  emailHint?: string;
  forceFresh?: boolean;
}): Promise<string> {
  const stored = getStoredGoogleAdsToken();
  if (stored.token && !stored.isExpired && !options?.forceFresh) return stored.token;

  if (!options?.forceFresh) {
    const silent = await fetchServerAccessToken();
    if (silent) return silent;
  }

  await authorizeGoogleAdsViaPopup();
  const token = await fetchServerAccessToken();
  if (!token) throw new Error('Google Ads authorization did not complete. Please try again.');
  return token;
}

/**
 * Legacy alias for backwards compatibility
 */
export async function acquireGoogleAdsTokenViaFirebase(emailHint?: string): Promise<string> {
  return acquireGoogleAdsToken({ emailHint });
}
