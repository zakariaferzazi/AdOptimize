import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with auto-detect long polling and specific firestoreDatabaseId
// This prevents WebChannel long stream drops and aborts behind proxies and in iframes.
function initDb(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db: Firestore = initDb();
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');

// Backwards-compatible alias for standard Google login/signup
export const googleProvider = googleAuthProvider;

// Dedicated provider specifically for Google Ads authorization (used ONLY when user clicks 'Connect My Google Ads Account')
export const googleAdsProvider = new GoogleAuthProvider();
googleAdsProvider.addScope('email');
googleAdsProvider.addScope('profile');
googleAdsProvider.addScope('https://www.googleapis.com/auth/adwords');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errName = error instanceof Error ? error.name : '';

  // If the request was cancelled, aborted, or interrupted during navigation/unmount, ignore it safely
  if (
    errName === 'AbortError' ||
    errMsg.includes('aborted') ||
    errMsg.includes('signal is aborted')
  ) {
    console.warn(`Firestore operation ${operationType} on ${path} was aborted:`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test utility per Firebase integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

// Token storage helpers
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

export function clearStoredGoogleAdsToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('google_ads_oauth_token');
  sessionStorage.removeItem('google_ads_oauth_token_timestamp');
  try {
    localStorage.removeItem('google_ads_oauth_token');
    localStorage.removeItem('google_ads_oauth_token_timestamp');
    localStorage.removeItem('google_ads_oauth_token_broadcast');
  } catch {}
}

export function getStoredGoogleAdsToken(): { token: string | null; isExpired: boolean } {
  if (typeof window === 'undefined') return { token: null, isExpired: true };
  let token = sessionStorage.getItem('google_ads_oauth_token');

  // Fallback to localStorage if sessionStorage was cleared or in another tab
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

// Auth helpers
let activeSignInPromise: Promise<{
  user: any;
  accessToken: string | null;
  credential: any;
} | null> | null = null;

export async function signInWithGoogle(): Promise<{
  user: any;
  accessToken: string | null;
  credential: any;
} | null> {
  // Prevent duplicate concurrent popup calls which trigger auth/cancelled-popup-request & assertion failures
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
      // Standard Google user sign-in/sign-up (email & profile only, no Google Ads access requested)
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return {
        user: result.user,
        accessToken: null,
        credential,
      };
    } catch (error: any) {
      const code = error?.code || '';
      const msg = error?.message || '';

      // User closed or superseded popup - handle gracefully without noisy crashes
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('cancelled')
      ) {
        return null;
      }

      if (code === 'auth/popup-blocked' || msg.includes('popup-blocked') || msg.includes('blocked')) {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups or use email sign-in.');
      }

      console.warn('Notice during Google sign in:', code || msg);
      throw error;
    } finally {
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
}

export async function refreshGoogleAdsOAuthToken(emailHint?: string): Promise<string | null> {
  try {
    clearStoredGoogleAdsToken();

    // 1. First attempt: Firebase Auth with dedicated googleAdsProvider (has AdWords scope)
    try {
      googleAdsProvider.setCustomParameters(
        emailHint ? { prompt: 'select_account', login_hint: emailHint } : { prompt: 'select_account' }
      );
      const result = await signInWithPopup(auth, googleAdsProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        storeGoogleAdsToken(credential.accessToken);
        return credential.accessToken;
      }
    } catch (firebaseErr: any) {
      if (
        firebaseErr?.code === 'auth/popup-closed-by-user' ||
        firebaseErr?.code === 'auth/cancelled-popup-request'
      ) {
        throw new Error('Google authorization window was closed.');
      }
      console.warn('Firebase re-auth notice, trying identity service:', firebaseErr);
    }

    const { acquireGoogleAdsToken } = await import('@/lib/google-identity');
    const token = await acquireGoogleAdsToken({ emailHint });
    return token || null;
  } catch (error) {
    console.error('Error refreshing Google Ads OAuth token:', error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, pass: string) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

export async function logOut() {
  try {
    clearStoredGoogleAdsToken();
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
