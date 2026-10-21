import firebaseConfig from '@/firebase-applet-config.json';

const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
const DEFAULT_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
  firebaseConfig.oAuthClientId ||
  '1019046039336-bi6a6loj5gtlhq2b9kno56j4h8nidapt.apps.googleusercontent.com';

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
 * Requests an OAuth 2.0 Access Token for Google Ads using the official Google Identity Services (GIS) Token Model.
 * This utilizes client-side response_type=token (no offline refresh token request), avoiding passkey enforcement.
 */
export async function requestGoogleAdsAccessToken(emailHint?: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Google OAuth must be initiated from the browser.');
  }

  await loadGoogleIdentityServices();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library could not be initialized.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: DEFAULT_CLIENT_ID,
        scope: GOOGLE_ADS_SCOPE,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'Google authorization failed'));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token returned by Google authorization.'));
            return;
          }

          // Persist token in session storage
          sessionStorage.setItem('google_ads_oauth_token', response.access_token);
          sessionStorage.setItem('google_ads_oauth_token_timestamp', String(Date.now()));
          resolve(response.access_token);
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Google authorization window closed or encountered an error.'));
        },
      });

      // Request token with optional account hint
      client.requestAccessToken(emailHint ? { hint: emailHint } : undefined);
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Helper to retrieve stored token and check freshness (Google tokens expire in 60 mins; renew after 50 mins).
 */
export function getStoredGoogleAdsToken(): { token: string | null; isExpired: boolean } {
  if (typeof window === 'undefined') return { token: null, isExpired: true };
  const token = sessionStorage.getItem('google_ads_oauth_token');
  const timestampStr = sessionStorage.getItem('google_ads_oauth_token_timestamp');
  if (!token) return { token: null, isExpired: true };
  if (timestampStr) {
    const ageMs = Date.now() - parseInt(timestampStr, 10);
    if (ageMs > 50 * 60 * 1000) {
      return { token, isExpired: true };
    }
  }
  return { token, isExpired: false };
}

/**
 * Clears stored Google Ads OAuth tokens from session storage.
 */
export function clearStoredGoogleAdsToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('google_ads_oauth_token');
    sessionStorage.removeItem('google_ads_oauth_token_timestamp');
  }
}
