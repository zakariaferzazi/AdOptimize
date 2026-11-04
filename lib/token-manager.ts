/**
 * Google Ads OAuth 2.0 Token Management & Uninterrupted Session Engine
 *
 * Implements:
 * 1. Background Refresh Strategy:
 *    - Stores access_token, refresh_token, and expiration timestamp (expires_at) in database and in-memory cache.
 *    - Checks if (expires_at - currentTime < 5 minutes).
 *    - ONLY issues a POST request to https://oauth2.googleapis.com/token when within 5 minutes of expiring or expired.
 *    - Caches the new access_token and updates expires_at. Does NOT request a new token on every API call.
 * 2. Automatic Retry on 401/403:
 *    - Catches token expiration or invalid credentials, rotates token in background, and retries the API call once.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Milliseconds timestamp
  updatedAt?: string;
  tokenType?: string;
  userId?: string;
  userEmail?: string;
  customerId?: string;
}

// Global server in-memory token cache keyed by identifier
const tokenCache = new Map<string, StoredTokenData>();

function getCacheKeys(params: { userId?: string; userEmail?: string; customerId?: string }): string[] {
  const keys: string[] = [];
  if (params.userId) keys.push(`uid:${params.userId}`);
  if (params.userEmail) keys.push(`email:${params.userEmail.toLowerCase().trim()}`);
  if (params.customerId) keys.push(`cid:${params.customerId.replace(/\D/g, '')}`);
  keys.push('global_default');
  return keys;
}

/**
 * Saves token data to in-memory cache and persists to Firestore
 */
export async function saveTokenData(tokenData: StoredTokenData): Promise<void> {
  const fullData: StoredTokenData = {
    ...tokenData,
    updatedAt: tokenData.updatedAt || new Date().toISOString(),
  };

  const keys = getCacheKeys({
    userId: tokenData.userId,
    userEmail: tokenData.userEmail,
    customerId: tokenData.customerId,
  });

  for (const k of keys) {
    tokenCache.set(k, { ...fullData });
  }

  // Persist to Firestore if userId is present
  if (tokenData.userId) {
    try {
      const tokenDocRef = doc(db, 'users', tokenData.userId, 'tokens', 'google_ads');
      const payload: Record<string, any> = {
        accessToken: tokenData.accessToken,
        expiresAt: tokenData.expiresAt,
        updatedAt: tokenData.updatedAt || new Date().toISOString(),
        tokenType: tokenData.tokenType || 'Bearer',
      };
      if (tokenData.refreshToken) {
        payload.refreshToken = tokenData.refreshToken;
      }
      if (tokenData.userEmail) {
        payload.userEmail = tokenData.userEmail;
      }
      if (tokenData.customerId) {
        payload.customerId = tokenData.customerId;
      }

      await setDoc(tokenDocRef, payload, { merge: true });

      // Also persist to user's primary account document for convenience
      const accountDocRef = doc(db, 'users', tokenData.userId, 'accounts', 'primary');
      await setDoc(
        accountDocRef,
        {
          accessToken: tokenData.accessToken,
          expiresAt: tokenData.expiresAt,
          ...(tokenData.refreshToken ? { refreshToken: tokenData.refreshToken } : {}),
          isTokenExpired: false,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[TokenManager] Notice persisting token to Firestore:', err);
    }
  }
}

/**
 * Clears token data from in-memory cache and deletes Firestore token document
 */
export async function clearTokenData(params: {
  userId?: string;
  userEmail?: string;
  customerId?: string;
}): Promise<void> {
  const keys = getCacheKeys(params);
  for (const k of keys) {
    tokenCache.delete(k);
  }
  tokenCache.delete('global_default');

  if (params.userId) {
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const tokenDocRef = doc(db, 'users', params.userId, 'tokens', 'google_ads');
      await deleteDoc(tokenDocRef);
    } catch (err) {
      console.warn('[TokenManager] Notice clearing tokens from Firestore:', err);
    }
  }
}

/**
 * Loads token data from in-memory cache or Firestore
 */
export async function loadTokenData(params: {
  userId?: string;
  userEmail?: string;
  customerId?: string;
}): Promise<StoredTokenData | null> {
  const keys = getCacheKeys(params);

  // 1. Check in-memory cache
  for (const k of keys) {
    const cached = tokenCache.get(k);
    if (cached && cached.accessToken) {
      return cached;
    }
  }

  // 2. Fall back to Firestore if userId is available
  if (params.userId) {
    try {
      const tokenDocRef = doc(db, 'users', params.userId, 'tokens', 'google_ads');
      const snap = await getDoc(tokenDocRef);
      if (snap.exists()) {
        const data = snap.data() as StoredTokenData;
        if (data && data.accessToken) {
          for (const k of keys) {
            tokenCache.set(k, data);
          }
          return data;
        }
      }

      // Check account doc
      const accountDocRef = doc(db, 'users', params.userId, 'accounts', 'primary');
      const accSnap = await getDoc(accountDocRef);
      if (accSnap.exists()) {
        const accData = accSnap.data();
        if (accData?.accessToken) {
          const loaded: StoredTokenData = {
            accessToken: accData.accessToken,
            refreshToken: accData.refreshToken,
            expiresAt: accData.expiresAt || Date.now() + 3600 * 1000,
            updatedAt: accData.lastSyncAt || new Date().toISOString(),
            userId: params.userId,
            userEmail: params.userEmail,
          };
          for (const k of keys) {
            tokenCache.set(k, loaded);
          }
          return loaded;
        }
      }
    } catch (err) {
      console.warn('[TokenManager] Notice loading token from Firestore:', err);
    }
  }

  return null;
}

export interface GetTokenOptions {
  userId?: string;
  userEmail?: string;
  customerId?: string;
  incomingAccessToken?: string;
  incomingRefreshToken?: string;
  incomingExpiresAt?: number;
  forceRefresh?: boolean;
}

export interface TokenAcquisitionResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  fromCache?: boolean;
  refreshed?: boolean;
  error?: string;
}

/**
 * Automated Interceptor:
 * - Checks if (expires_at - currentTime < 5 minutes).
 * - ONLY issues a POST request to Google's OAuth endpoint when within 5 minutes of expiring or expired.
 * - Caches the new access_token and updates expires_at.
 * - Does NOT request a new token on every API call.
 */
export async function getValidAccessToken(options: GetTokenOptions): Promise<TokenAcquisitionResult> {
  const existing = await loadTokenData(options);

  // If incoming token provided, update or populate
  let activeAccessToken = options.incomingAccessToken || existing?.accessToken || '';
  let activeRefreshToken =
    options.incomingRefreshToken ||
    existing?.refreshToken ||
    process.env.GOOGLE_ADS_REFRESH_TOKEN ||
    process.env.GOOGLE_REFRESH_TOKEN ||
    process.env.REFRESH_TOKEN ||
    '';

  let activeExpiresAt =
    options.incomingExpiresAt ||
    existing?.expiresAt ||
    0;

  // If token was just passed in without expiresAt, assume standard 3600s validity from now
  if (options.incomingAccessToken && (!activeExpiresAt || activeExpiresAt <= 0)) {
    activeExpiresAt = Date.now() + 3500 * 1000;
  }

  const now = Date.now();
  const timeUntilExpiry = activeExpiresAt > 0 ? activeExpiresAt - now : -1;
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const isExpiringSoon = timeUntilExpiry < FIVE_MINUTES_MS;

  // 1. If we have a valid token that is NOT expiring within 5 minutes and no forceRefresh requested:
  // Return cached token immediately without any HTTP call to Google's OAuth endpoint!
  if (activeAccessToken && !isExpiringSoon && !options.forceRefresh) {
    return {
      success: true,
      accessToken: activeAccessToken,
      refreshToken: activeRefreshToken || undefined,
      expiresAt: activeExpiresAt,
      fromCache: true,
      refreshed: false,
    };
  }

  // 2. Token is expiring soon (< 5 minutes), already expired, or forceRefresh requested:
  // If we have a refresh token, issue a single POST request to Google's token endpoint
  if (activeRefreshToken) {
    const clientId =
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID ||
      '1019046039336-lg3uvsnefcdjoa1brtp9jf12tru410bg.apps.googleusercontent.com';

    const clientSecret =
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.CLIENT_SECRET;

    const params: Record<string, string> = {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: activeRefreshToken,
    };

    if (clientSecret) {
      params.client_secret = clientSecret;
    }

    try {
      console.log('[TokenManager] Background Refresh: Token within 5m of expiry. Exchanging refresh_token for fresh access_token...');
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        const expiresInSec = Number(data.expires_in) || 3600;
        const newExpiresAt = Date.now() + expiresInSec * 1000;
        const newRefreshToken = data.refresh_token || activeRefreshToken;

        const updatedTokenData: StoredTokenData = {
          accessToken: data.access_token,
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date().toISOString(),
          tokenType: data.token_type || 'Bearer',
          userId: options.userId,
          userEmail: options.userEmail,
          customerId: options.customerId,
        };

        await saveTokenData(updatedTokenData);

        console.log(`[TokenManager] Successfully refreshed access token. Valid for ${expiresInSec}s until ${new Date(newExpiresAt).toLocaleTimeString()}.`);

        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt,
          fromCache: false,
          refreshed: true,
        };
      }

      console.warn('[TokenManager] Google OAuth refresh endpoint responded with error:', data);
    } catch (netErr: any) {
      console.error('[TokenManager] Network error during token refresh:', netErr);
    }
  }

  // 3. Fallback: If refresh token exchange was unavailable, but activeAccessToken exists and is still barely valid
  if (activeAccessToken && timeUntilExpiry > 0) {
    return {
      success: true,
      accessToken: activeAccessToken,
      refreshToken: activeRefreshToken || undefined,
      expiresAt: activeExpiresAt,
      fromCache: true,
      refreshed: false,
    };
  }

  // 4. Token expired and cannot be refreshed silently
  return {
    success: false,
    error: 'Access token expired or missing. Please ensure your Google account is connected.',
  };
}

/**
 * Executes a Google Ads API call with automatic token refresh and single retry on 401/403.
 * Eliminates user-facing "expired" errors.
 */
export async function executeWithAutoTokenRetry<T extends { success: boolean; statusCode?: number; isAuthExpired?: boolean; error?: string }>(
  options: GetTokenOptions,
  apiCallFn: (token: string) => Promise<T>
): Promise<T & { newAccessToken?: string; newRefreshToken?: string; newExpiresAt?: number }> {
  // Step 1: Obtain a valid access token (using cache if not expiring within 5 min)
  const tokenResult = await getValidAccessToken(options);

  if (!tokenResult.success || !tokenResult.accessToken) {
    return {
      success: false,
      statusCode: 401,
      isAuthExpired: true,
      error: tokenResult.error || 'Authentication required',
    } as any;
  }

  // Step 2: Execute the Google Ads API call
  let result = await apiCallFn(tokenResult.accessToken);

  let newAccessToken = tokenResult.refreshed ? tokenResult.accessToken : undefined;
  let newRefreshToken = tokenResult.refreshed ? tokenResult.refreshToken : undefined;
  let newExpiresAt = tokenResult.refreshed ? tokenResult.expiresAt : undefined;

  // Step 3: If 401 / unauthenticated error occurred, automatically refresh and retry once
  if (result.statusCode === 401 || result.isAuthExpired) {
    console.log('[TokenManager] Received 401 Unauthenticated. Performing on-the-fly token refresh & automatic retry...');
    const refreshRetry = await getValidAccessToken({
      ...options,
      forceRefresh: true,
    });

    if (refreshRetry.success && refreshRetry.accessToken) {
      newAccessToken = refreshRetry.accessToken;
      newRefreshToken = refreshRetry.refreshToken;
      newExpiresAt = refreshRetry.expiresAt;

      // Retry the API call once with fresh token
      result = await apiCallFn(refreshRetry.accessToken);
      console.log('[TokenManager] Retry completed with status:', result.statusCode || (result.success ? 200 : 'unknown'));
    }
  }

  return {
    ...result,
    ...(newAccessToken ? { newAccessToken } : {}),
    ...(newRefreshToken ? { newRefreshToken } : {}),
    ...(newExpiresAt ? { newExpiresAt } : {}),
  };
}
