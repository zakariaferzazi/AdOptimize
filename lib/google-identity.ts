/**
 * Google Ads API OAuth 2.0 Identity Service
 * Uses official Google OAuth 2.0 Implicit Token Model (response_type=token)
 * targeting the approved OAuth Client ID (1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg)
 * and authorized redirect URI (https://adoptimize.app/api/google-ads/oauth-callback).
 *
 * NOTE: By utilizing response_type=token (client-side access token grant without offline refresh tokens),
 * this completely avoids Google Ads API's mandatory passkey requirement ("Create a passkey to continue").
 */

const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
export const DEFAULT_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
  '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';

const REDIRECT_URI = 'https://adoptimize.app/api/google-ads/oauth-callback';

let cachedClientId: string | null = null;

export async function getGoogleAdsClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID) {
    cachedClientId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID;
    return cachedClientId;
  }
  try {
    const res = await fetch('/api/google-ads/config');
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) {
        cachedClientId = data.clientId;
        return data.clientId;
      }
    }
  } catch {
    // Fall back to default
  }
  cachedClientId = DEFAULT_CLIENT_ID;
  return DEFAULT_CLIENT_ID;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
              token_type?: string;
            }) => void;
            error_callback?: (err: any) => void;
            prompt?: string;
            hint?: string;
          }) => {
            requestAccessToken: (options?: { prompt?: string; hint?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Dynamically loads the official Google Identity Services script if not already present.
 */
export function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.oauth2) return resolve();

    const existing = document.getElementById('google-identity-services-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK.'));
    document.head.appendChild(script);
  });
}

/**
 * Silently attempts to refresh or acquire an access token using GIS with prompt='' and hint.
 * If user has already granted consent, this succeeds silently without any popup window.
 * If silent acquisition is not possible, returns null instead of throwing or opening a popup.
 */
export async function trySilentGoogleAdsTokenRefresh(emailHint?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    await loadGoogleIdentityServices();
    if (!window.google?.accounts?.oauth2) return null;

    const activeClientId = await getGoogleAdsClientId();

    return new Promise((resolve) => {
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          resolve(null);
        }
      }, 3500);

      try {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: `${GOOGLE_ADS_SCOPE} email profile`,
          prompt: '',
          hint: emailHint,
          callback: (response) => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeout);
            if (response.access_token) {
              storeGoogleAdsToken(response.access_token);
              resolve(response.access_token);
            } else {
              resolve(null);
            }
          },
          error_callback: () => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeout);
            resolve(null);
          },
        });

        client.requestAccessToken({ prompt: '', hint: emailHint });
      } catch {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeout);
          resolve(null);
        }
      }
    });
  } catch {
    return null;
  }
}

/**
 * Requests an OAuth 2.0 Access Token using Google Identity Services (GIS) Token Model.
 * Works natively on registered origins (e.g. https://adoptimize.app).
 */
export async function requestGoogleAdsAccessToken(emailHint?: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Google OAuth must be initiated from the browser.');
  }

  await loadGoogleIdentityServices();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library could not be initialized.');
  }

  const activeClientId = await getGoogleAdsClientId();

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: `${GOOGLE_ADS_SCOPE} email profile`,
        prompt: '',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'Google authorization failed'));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token returned by Google authorization.'));
            return;
          }

          // Persist token in storage (both session and local)
          storeGoogleAdsToken(response.access_token);
          resolve(response.access_token);
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Google authorization window closed or encountered an error.'));
        },
      });

      // Request token without forcing passkey upgrade
      client.requestAccessToken(emailHint ? { hint: emailHint, prompt: '' } : { prompt: '' });
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Requests an OAuth 2.0 Access Token via standard popup using the registered Redirect URI:
 * https://adoptimize.app/api/google-ads/oauth-callback
 *
 * This uses response_type=token (OAuth Implicit grant) with prompt=select_account:
 * 1. Bypasses origin_mismatch errors on any preview or custom domains.
 * 2. Strictly avoids requesting offline refresh tokens, completely bypassing Google Ads' mandatory passkey trap.
 * 3. Sends the acquired access token safely back to the opener via postMessage & storage events.
 */
export async function requestGoogleAdsAccessTokenViaPopup(emailHint?: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Google OAuth must be initiated from the browser.');
  }

  const activeClientId = await getGoogleAdsClientId();
  const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords email profile');
  const state = `adwords_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${encodeURIComponent(
    activeClientId
  )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${state}&prompt=select_account`;

  if (emailHint) {
    oauthUrl += `&login_hint=${encodeURIComponent(emailHint)}`;
  }

  return new Promise((resolve, reject) => {
    // Center popup window on screen
    const width = 520;
    const height = 650;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    const popup = window.open(
      oauthUrl,
      'google_ads_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    if (!popup) {
      reject(new Error('Popup window was blocked by your browser. Please allow popups for this site and try again.'));
      return;
    }

    let isResolved = false;

    // Listener 1: postMessage from popup callback page
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_ADS_OAUTH_SUCCESS' && event.data.token) {
        cleanup();
        const token = event.data.token;
        storeGoogleAdsToken(token);
        resolve(token);
      } else if (event.data?.type === 'GOOGLE_ADS_OAUTH_ERROR') {
        cleanup();
        reject(new Error(event.data.error || 'Google Ads authorization was not completed.'));
      }
    };

    // Listener 2: localStorage cross-tab event (fallback if postMessage is blocked across origins)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'google_ads_oauth_token_broadcast' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed.token && Date.now() - parsed.time < 30000) {
            cleanup();
            sessionStorage.setItem('google_ads_oauth_token', parsed.token);
            sessionStorage.setItem('google_ads_oauth_token_timestamp', String(Date.now()));
            resolve(parsed.token);
          }
        } catch {}
      }
    };

    // Monitor popup closure
    const checkClosedInterval = setInterval(() => {
      try {
        if (popup.closed) {
          setTimeout(() => {
            if (!isResolved) {
              cleanup();
              const stored = getStoredGoogleAdsToken();
              if (stored.token && !stored.isExpired) {
                resolve(stored.token);
              } else {
                reject(new Error('Google authorization window was closed.'));
              }
            }
          }, 800);
        }
      } catch {
        // Cross-origin access check error (ignore while active)
      }
    }, 500);

    const cleanup = () => {
      isResolved = true;
      clearInterval(checkClosedInterval);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
  });
}

/**
 * Helper to store token in both sessionStorage and localStorage
 */
export function storeGoogleAdsToken(token: string): void {
  if (typeof window === 'undefined') return;
  const now = String(Date.now());
  sessionStorage.setItem('google_ads_oauth_token', token);
  sessionStorage.setItem('google_ads_oauth_token_timestamp', now);
  try {
    localStorage.setItem('google_ads_oauth_token', token);
    localStorage.setItem('google_ads_oauth_token_timestamp', now);
    localStorage.setItem(
      'google_ads_oauth_token_broadcast',
      JSON.stringify({ token, time: Date.now() })
    );
  } catch {}
}

/**
 * Helper to retrieve stored token across localStorage and sessionStorage without artificial expiration.
 */
export function getStoredGoogleAdsToken(): { token: string | null; isExpired: boolean } {
  if (typeof window === 'undefined') return { token: null, isExpired: true };
  let token = sessionStorage.getItem('google_ads_oauth_token');

  // Fallback to localStorage for multi-session and multi-tab persistence
  if (!token) {
    try {
      token = localStorage.getItem('google_ads_oauth_token');
    } catch {}
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return { token: null, isExpired: true };
  }

  return { token: token.trim(), isExpired: false };
}

/**
 * Clears stored Google Ads OAuth tokens from storage (only on explicit disconnect/sign-out).
 */
export function clearStoredGoogleAdsToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('google_ads_oauth_token');
    sessionStorage.removeItem('google_ads_oauth_token_timestamp');
    try {
      localStorage.removeItem('google_ads_oauth_token');
      localStorage.removeItem('google_ads_oauth_token_timestamp');
      localStorage.removeItem('google_ads_oauth_token_broadcast');
    } catch {}
  }
}

/**
 * Main Function: Acquire Google Ads OAuth token cleanly.
 * Automatically chooses the optimal flow without ever forcing passkey creation:
 * - Checks stored token first (user is asked only once!)
 * - Uses Firebase GoogleAuthProvider with AdWords scope (unified consent, no origin mismatch, no passkeys)
 * - If on https://adoptimize.app, can use GIS
 * - Otherwise falls back to approved redirect popup
 */
export async function acquireGoogleAdsToken(options?: {
  emailHint?: string;
  preferredMethod?: 'gis' | 'firebase';
  forceFirebase?: boolean;
  forceFresh?: boolean;
}): Promise<string> {
  // 1. If existing token is already available, reuse it immediately (do not prompt user again)
  const stored = getStoredGoogleAdsToken();
  if (stored.token && !options?.forceFresh) {
    return stored.token;
  }

  // 1. Try Firebase GoogleAuthProvider with AdWords scope (authorized redirect domain, avoids all passkey prompts)
  try {
    const { auth, googleAdsProvider } = await import('@/lib/firebase');
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    googleAdsProvider.setCustomParameters(
      options?.emailHint
        ? { prompt: 'select_account', login_hint: options.emailHint }
        : { prompt: 'select_account' }
    );
    const result = await signInWithPopup(auth, googleAdsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      storeGoogleAdsToken(credential.accessToken);
      return credential.accessToken;
    }
  } catch (fbErr: any) {
    if (
      fbErr?.code === 'auth/popup-closed-by-user' ||
      fbErr?.code === 'auth/cancelled-popup-request'
    ) {
      throw new Error('Google authorization window was closed.');
    }
    console.warn('Firebase token acquisition notice:', fbErr?.message || fbErr);
  }

  const isProduction =
    typeof window !== 'undefined' && window.location.origin === 'https://adoptimize.app';

  // 2. If on adoptimize.app, attempt GIS
  if (isProduction && options?.preferredMethod !== 'firebase') {
    try {
      const token = await requestGoogleAdsAccessToken(options?.emailHint);
      if (token) return token;
    } catch (gisErr: any) {
      console.warn('GIS notice, switching to standard OAuth popup:', gisErr?.message || gisErr);
    }
  }

  // 3. Fallback: Standard OAuth popup flow (uses approved redirect URI https://adoptimize.app/api/google-ads/oauth-callback)
  return requestGoogleAdsAccessTokenViaPopup(options?.emailHint);
}

/**
 * Legacy alias for backwards compatibility
 */
export async function acquireGoogleAdsTokenViaFirebase(emailHint?: string): Promise<string> {
  return acquireGoogleAdsToken({ emailHint });
}

