import firebaseConfig from '@/firebase-applet-config.json';

/**
 * Server-side Google Ads account binding.
 *
 * The browser may *display* an account, but it cannot assert which account the
 * server is allowed to read or mutate. The binding is read from the user's own
 * Firestore documents using the user's verified ID token, so Firestore security
 * rules remain the authority on ownership.
 */

export interface AccountBinding {
  userId: string;
  customerId: string;
  loginCustomerId?: string;
  accountName: string;
  currency: string;
  isConnected: boolean;
}

export interface GoogleAdsCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

type FirestoreValue = Record<string, unknown>;

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, FirestoreValue> }).fields || {};
    return decodeFields(fields);
  }
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] }).values || [];
    return values.map(decodeValue);
  }
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = decodeValue(value);
  }
  return result;
}

function documentUrl(path: string): string {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${path}`;
}

async function readDocument(
  path: string,
  idToken: string
): Promise<Record<string, unknown> | undefined> {
  const response = await fetch(documentUrl(path), {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Unable to read ${path} (${response.status}). ${detail.slice(0, 200)}`.trim()
    );
  }
  const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  return decodeFields(body.fields || {});
}

function normalizeCustomerId(raw: unknown): string {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Resolve the Google Ads account the server is allowed to act on for this user.
 * Returns undefined when the user has not connected an account.
 */
export async function resolveAccountBinding(
  userId: string,
  idToken: string
): Promise<AccountBinding | undefined> {
  const account = await readDocument(`users/${userId}/accounts/primary`, idToken);
  if (!account) return undefined;

  const customerId = normalizeCustomerId(account.clientCustomerId);
  if (customerId.length !== 10) return undefined;

  return {
    userId,
    customerId,
    loginCustomerId: account.loginCustomerId
      ? normalizeCustomerId(account.loginCustomerId)
      : undefined,
    accountName: String(account.accountName || `Google Ads (${customerId})`),
    currency: String(account.currency || 'USD'),
    isConnected: account.isConnected !== false,
  };
}

/**
 * Resolve stored Google Ads OAuth credentials for this user.
 * The access token is refreshed by the caller when it is close to expiry.
 */
export async function resolveGoogleAdsCredentials(
  userId: string,
  idToken: string
): Promise<GoogleAdsCredentials | undefined> {
  const tokenDoc = await readDocument(`users/${userId}/tokens/google_ads`, idToken);
  if (tokenDoc?.accessToken) {
    return {
      accessToken: String(tokenDoc.accessToken),
      refreshToken: tokenDoc.refreshToken ? String(tokenDoc.refreshToken) : undefined,
      expiresAt: tokenDoc.expiresAt ? Number(tokenDoc.expiresAt) : undefined,
    };
  }

  const account = await readDocument(`users/${userId}/accounts/primary`, idToken);
  if (account?.accessToken) {
    return {
      accessToken: String(account.accessToken),
      refreshToken: account.refreshToken ? String(account.refreshToken) : undefined,
      expiresAt: account.expiresAt ? Number(account.expiresAt) : undefined,
    };
  }

  return undefined;
}

export class AccountBindingError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AccountBindingError';
  }
}

/**
 * Assert that a proposal belongs to the caller's bound account.
 * This is the check that stops a browser from executing a proposal against a
 * different Google Ads account than the one it is authorised for.
 */
export function assertProposalAccount(
  proposalAccountId: string,
  binding: AccountBinding
): void {
  const proposalCustomer = normalizeCustomerId(proposalAccountId);
  if (!proposalCustomer || proposalCustomer !== binding.customerId) {
    throw new AccountBindingError(
      'This proposal belongs to a different Google Ads account than the one connected to your login.'
    );
  }
}

/**
 * Resolve a usable Google Ads access token, refreshing it when it is about to
 * expire. Returns an error message instead of throwing so routes can respond
 * with a clear reconnect instruction.
 */
export async function resolveFreshAccessToken(
  userId: string,
  idToken: string
): Promise<{ accessToken?: string; error?: string }> {
  const credentials = await resolveGoogleAdsCredentials(userId, idToken);
  if (!credentials) return { error: 'No Google Ads credentials are stored for this account. Reconnect Google Ads.' };

  const expiresSoon =
    typeof credentials.expiresAt === 'number' && credentials.expiresAt - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon || !credentials.refreshToken) return { accessToken: credentials.accessToken };

  const { executeGoogleAdsTokenRefresh } = await import('@/lib/google-token-refresh');
  const refreshed = await executeGoogleAdsTokenRefresh({ refreshToken: credentials.refreshToken });
  if (refreshed.success && refreshed.accessToken) return { accessToken: refreshed.accessToken };
  return { accessToken: credentials.accessToken };
}
