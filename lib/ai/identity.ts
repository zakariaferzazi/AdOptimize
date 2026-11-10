import firebaseConfig from '@/firebase-applet-config.json';

/**
 * Server-side Firebase ID token verification.
 *
 * The browser is never trusted to assert who it is. Every AI route resolves the
 * caller from a signed Firebase ID token and uses the resulting `uid` for all
 * storage and account lookups.
 */

export interface VerifiedIdentity {
  uid: string;
  email?: string;
  emailVerified: boolean;
  expiresAt: number;
}

interface Jwk {
  kid: string;
  n: string;
  e: string;
  alg?: string;
  kty?: string;
  use?: string;
}

interface JwkSet {
  keys: Jwk[];
}

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwksCache: { keys: Jwk[]; fetchedAt: number } | undefined;
const JWKS_TTL_MS = 60 * 60 * 1000;

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
}

async function loadJwks(force = false): Promise<Jwk[]> {
  if (!force && jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const response = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load Firebase signing keys (${response.status}).`);
  }
  const body = (await response.json()) as JwkSet;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

async function verifySignature(
  signingInput: string,
  signature: Uint8Array<ArrayBuffer>,
  jwk: Jwk
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    new TextEncoder().encode(signingInput)
  );
}

export interface VerifyOptions {
  /** Override the expected audience (defaults to the configured Firebase project). */
  projectId?: string;
  /** Clock skew allowance in seconds. */
  clockSkewSeconds?: number;
}

export async function verifyFirebaseIdToken(
  token: string,
  options: VerifyOptions = {}
): Promise<VerifiedIdentity> {
  const projectId = options.projectId || firebaseConfig.projectId;
  const skew = options.clockSkewSeconds ?? 60;

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed identity token.');

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header = decodeJsonSegment<{ alg?: string; kid?: string }>(headerSegment);
  if (header.alg !== 'RS256') throw new Error('Unsupported identity token algorithm.');
  if (!header.kid) throw new Error('Identity token is missing a key identifier.');

  const payload = decodeJsonSegment<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
    user_id?: string;
  }>(payloadSegment);

  if (payload.aud !== projectId) throw new Error('Identity token audience mismatch.');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Identity token issuer mismatch.');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp + skew < nowSeconds) {
    throw new Error('Identity token has expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat - skew > nowSeconds) {
    throw new Error('Identity token was issued in the future.');
  }
  const uid = payload.sub || payload.user_id;
  if (!uid) throw new Error('Identity token is missing a subject.');

  const signature = base64UrlToBytes(signatureSegment);
  const signingInput = `${headerSegment}.${payloadSegment}`;

  let keys = await loadJwks();
  let jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) {
    keys = await loadJwks(true);
    jwk = keys.find((candidate) => candidate.kid === header.kid);
  }
  if (!jwk) throw new Error('Identity token signing key is unknown.');

  const valid = await verifySignature(signingInput, signature, jwk);
  if (!valid) throw new Error('Identity token signature is invalid.');

  return {
    uid,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    expiresAt: payload.exp,
  };
}

export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Sign in again to continue.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Resolve the caller identity for an API route.
 *
 * `AI_ALLOW_ANONYMOUS=1` is only honoured outside production so local tooling
 * and the existing test suite can exercise routes without minting tokens.
 */
export async function requireIdentity(request: Request): Promise<VerifiedIdentity> {
  const token = extractBearerToken(request);
  if (token) {
    try {
      return await verifyFirebaseIdToken(token);
    } catch (error) {
      throw new UnauthorizedError(
        error instanceof Error ? error.message : 'Identity token could not be verified.'
      );
    }
  }

  if (process.env.AI_ALLOW_ANONYMOUS === '1' && process.env.NODE_ENV !== 'production') {
    return { uid: 'anonymous-dev', emailVerified: false, expiresAt: 0 };
  }

  throw new UnauthorizedError('Sign in again to continue.');
}
