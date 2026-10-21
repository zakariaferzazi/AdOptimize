import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

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

// Token status helper
export function getStoredGoogleAdsToken(): { token: string | null; isExpired: boolean } {
  if (typeof window === 'undefined') return { token: null, isExpired: true };
  const token = sessionStorage.getItem('google_ads_oauth_token');
  const timestampStr = sessionStorage.getItem('google_ads_oauth_token_timestamp');
  if (!token) return { token: null, isExpired: true };
  if (timestampStr) {
    const ageMs = Date.now() - parseInt(timestampStr, 10);
    // Google OAuth access tokens expire after 3600 seconds (60 mins).
    // Mark as expired after 50 minutes (3000 seconds) so we can proactively renew.
    if (ageMs > 50 * 60 * 1000) {
      return { token, isExpired: true };
    }
  }
  return { token, isExpired: false };
}

// Auth helpers
export async function signInWithGoogle() {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function refreshGoogleAdsOAuthToken(emailHint?: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('google_ads_oauth_token');
      sessionStorage.removeItem('google_ads_oauth_token_timestamp');
    }

    const { acquireGoogleAdsToken } = await import('@/lib/google-identity');
    const token = await acquireGoogleAdsToken({ emailHint });
    return token || null;
  } catch (error) {
    console.error('Error refreshing Google Ads OAuth token:', error);
    throw error;
  }
}

export async function logOut() {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('google_ads_oauth_token');
      sessionStorage.removeItem('google_ads_oauth_token_timestamp');
    }
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
