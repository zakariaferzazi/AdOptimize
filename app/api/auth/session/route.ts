import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { appOrigin, BillingError } from '@/lib/billing/config';
import { billingFailure, billingIdentity, checkOrigin } from '@/lib/billing/http';
import { billingDb, hash, rateLimit } from '@/lib/billing/store';

export const dynamic = 'force-dynamic';
const SESSION_COOKIE = 'adoptimize_session';
function cookieToken(request: Request): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const identity = await billingIdentity(request);
    await rateLimit(`session:${hash(identity.uid)}`, 20, 60);
    const expires = Math.min(identity.expiresAt, Math.floor(Date.now() / 1000) + 3600);
    if (expires <= Date.now() / 1000) throw new BillingError(401, 'Sign in again to continue.');
    const token = randomBytes(32).toString('hex');
    const old = cookieToken(request);
    const db = await billingDb();
    await db.batch([
      db.prepare('DELETE FROM app_sessions WHERE expires_at < ? OR token_hash = ?').bind(Math.floor(Date.now() / 1000), old ? hash(old) : ''),
      db.prepare('INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(hash(token), identity.uid, expires),
    ]);
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: appOrigin().startsWith('https:'), sameSite: 'lax', path: '/', expires: new Date(expires * 1000) });
    return response;
  } catch (error) { return billingFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const token = cookieToken(request);
    if (token) await (await billingDb()).prepare('DELETE FROM app_sessions WHERE token_hash = ?').bind(hash(token)).run();
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: appOrigin().startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (error) { return billingFailure(error); }
}
