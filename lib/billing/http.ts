import { NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { extractBearerToken, verifyFirebaseIdToken, type VerifiedIdentity } from '@/lib/ai/identity';
import { appOrigin, BillingError } from './config';
import { hash, rateLimit } from './store';

export async function billingIdentity(request: Request): Promise<VerifiedIdentity> {
  const token = extractBearerToken(request);
  if (!token || token.length > 16384) throw new BillingError(401, 'Sign in to continue.', 'authentication_required');
  const ip = clientIp(request);
  if (ip) await rateLimit(`auth-ip:${hash(ip)}`, 120, 60);
  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    throw new BillingError(401, 'Sign in again to continue.', 'authentication_required');
  }
}

export function clientIp(request: Request): string | undefined {
  const ip = request.headers.get('cf-connecting-ip');
  if (ip && !isIP(ip)) throw new BillingError(400, 'Invalid client network address.');
  return ip || undefined;
}

export function checkOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (origin && origin !== appOrigin()) throw new BillingError(403, 'Cross-origin billing requests are not allowed.');
}

export async function readJson(request: Request, maximum = 2048): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new BillingError(415, 'A JSON request is required.');
  }
  const text = await readBody(request, maximum);
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new BillingError(400, 'Invalid JSON request.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BillingError(400, 'A JSON object is required.');
  return data as Record<string, unknown>;
}

export async function readBody(request: Request, maximum: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new BillingError(400, 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new BillingError(413, 'Request body is too large.');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(body); }
  catch { throw new BillingError(400, 'Invalid request encoding.'); }
}

export function billingFailure(error: unknown): NextResponse {
  if (error instanceof BillingError) {
    return NextResponse.json({ error: error.message, code: error.code }, {
      status: error.status, headers: {
        'Cache-Control': 'no-store',
        ...(error.status === 429 && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
      },
    });
  }
  const upstream = error as { name?: unknown; statusCode?: unknown };
  console.error('[Billing] Operation failed.', {
    error: typeof upstream?.name === 'string' ? upstream.name : 'unknown',
    upstreamStatus: typeof upstream?.statusCode === 'number' ? upstream.statusCode : undefined,
  });
  return NextResponse.json({ error: 'Billing is temporarily unavailable. Please try again.' }, {
    status: 503, headers: { 'Cache-Control': 'no-store' },
  });
}
