'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendPasswordResetEmail, updateProfile, type User } from 'firebase/auth';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck, User as UserIcon,
} from 'lucide-react';
import { auth, signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/firebase';
import { GoogleIcon } from '@/components/ui/google-icon';
import { BrandLogoIcon } from '@/components/ui/brand-logo';
import { useAuthUser } from '@/hooks/use-auth-user';
import { parseInterval, safeNext, type PlanInterval } from '@/lib/auth-redirect';
import { BillingClientError, fetchBillingStatus, startCheckout, type BillingStatus } from '@/lib/billing-client';
import { synchronizeServerSession } from '@/lib/auth-session';
import { PostPaymentConnect } from '@/components/billing/post-payment-connect';

type Mode = 'sign-in' | 'sign-up';
const STEPS = ['Account', 'Plan', 'Payment', 'Connect'];

function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/email-already-in-use': return 'An account already exists with this email. Please sign in instead.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential': return 'Invalid email or password. Please try again.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Choose a stronger password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    default: return error instanceof Error && !code ? error.message : 'Something went wrong. Please try again.';
  }
}

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-[11px] font-semibold" aria-label="Sign-up progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-emerald-700 text-white' : active ? 'bg-[#234e40] text-white' : 'bg-slate-100 text-slate-400'}`}>
              {done ? <Check className="w-3 h-3" /> : index + 1}
            </span>
            <span className={active ? 'text-slate-900' : 'text-slate-400'}>{label}</span>
            {index < STEPS.length - 1 && <span className="w-4 sm:w-8 h-px bg-slate-200" />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ icon, valid, children }: { icon: React.ReactNode; valid?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 focus-within:border-[#234e40] transition-colors py-2.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      {children}
      {valid && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />}
    </div>
  );
}

const inputClass = 'flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

function ShowcasePanel() {
  return (
    <aside className="hidden lg:flex flex-col justify-between gap-10 bg-[#edf0e8] border-l border-[#dce2d6] p-10 xl:p-12">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5f7063]">AdOptimize / Google Ads workspace</p>
        <h2 className="mt-7 font-serif text-[38px] xl:text-[44px] leading-[1.12] tracking-tight text-[#253b30]">A clearer view of<br />your Google Ads.</h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-[#59665b]">See where your budget goes, review the search terms behind it, and decide what to change. All in one place.</p>
      </div>
      <div className="relative py-2 px-1">
        <div className="absolute inset-x-3 top-5 bottom-0 rounded-sm border border-[#d6ddcf] bg-[#e3e8dc] rotate-3" aria-hidden="true" />
        <div className="relative -rotate-1 rounded-sm border border-[#d6ddcf] bg-[#fffefb] px-6 py-7 shadow-[0_8px_24px_rgba(37,59,48,0.06)]">
          <div className="flex items-center justify-between border-b border-[#e6e8de] pb-4">
            <span className="font-serif text-xl text-[#253b30]">The weekly check-in</span>
            <span className="text-[9px] uppercase tracking-widest text-[#7e8779]">Sample</span>
          </div>
          <div className="divide-y divide-[#e6e8de]">
            {[
              ['01', 'Search terms', 'Which searches are spending without converting?'],
              ['02', 'Campaign budgets', 'Where is the daily cap holding things back?'],
              ['03', 'Next steps', 'A short list of changes worth reviewing.'],
            ].map(([number, title, detail]) => (
              <div key={number} className="flex gap-4 py-4">
                <span className="pt-0.5 font-mono text-[10px] text-[#8b9586]">{number}</span>
                <div><p className="text-xs font-semibold text-[#344536]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#788171]">{detail}</p></div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e6e8de] py-4">
            <div className="flex items-center justify-between text-[9px] text-[#788171]">
              <span>A week, at a glance</span>
              <span className="flex gap-3"><span className="border-b-2 border-[#758969]">Spend</span><span className="border-b-2 border-[#baa77f]">Conversions</span></span>
            </div>
            <svg viewBox="0 0 280 64" className="mt-3 h-16 w-full" fill="none" aria-hidden="true">
              <path d="M0 16H280M0 40H280M0 63H280" stroke="#e6e8de" strokeDasharray="2 4" />
              <path d="M4 44L48 33L92 37L136 19L180 29L224 16L276 24" stroke="#758969" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 52L48 45L92 49L136 37L180 40L224 29L276 31" stroke="#baa77f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="border-t border-[#e6e8de] pt-4 font-serif text-base italic text-[#53664f]">Review first. Make changes when you are ready.</p>
        </div>
      </div>
      <p className="border-t border-[#d6ddcf] pt-5 text-[11px] leading-5 text-[#697561]">Illustrative review. Your campaigns appear after you connect Google Ads.</p>
    </aside>
  );
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'At least one number (0-9) or a symbol', test: (value: string) => /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value) },
  { label: 'Lowercase (a-z) and uppercase (A-Z)', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
];

function AccountForm({ mode, next, onDone }: { mode: Mode; next: string; onDone: (user: User) => void }) {
  const signUp = mode === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const rules = PASSWORD_RULES.map((rule) => rule.test(password));
  const passwordValid = rules.every(Boolean);
  const canSubmit = emailValid && (signUp ? name.trim().length >= 2 && passwordValid && confirm === password : password.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      let user: User;
      if (signUp) {
        user = await signUpWithEmail(email.trim(), password);
        await updateProfile(user, { displayName: name.trim() }).catch(() => undefined);
      } else {
        user = await signInWithEmail(email.trim(), password);
      }
      onDone(user);
    } catch (failure) {
      setError(describeAuthError(failure));
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await signInWithGoogle();
      if (result?.user) onDone(result.user); else setBusy(false);
    } catch (failure) {
      setError(describeAuthError(failure));
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!emailValid) { setError('Enter your email above, then choose "Forgot password".'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch { /* The same message is shown either way so accounts cannot be enumerated. */ }
    setError(null);
    setNotice('If an account exists for that email, a reset link is on its way.');
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
      {signUp && (
        <Field icon={<UserIcon className="w-4 h-4" />} valid={name.trim().length >= 2}>
          <input className={inputClass} placeholder="Full name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-label="Full name" maxLength={80} />
        </Field>
      )}
      <Field icon={<Mail className="w-4 h-4" />} valid={emailValid}>
        <input className={inputClass} type="email" placeholder="you@company.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" maxLength={254} />
      </Field>
      <Field icon={<Lock className="w-4 h-4" />}>
        <input className={inputClass} type={reveal ? 'text' : 'password'} placeholder="Password" autoComplete={signUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Password" maxLength={128} />
        <button type="button" onClick={() => setReveal(!reveal)} className="text-slate-400 hover:text-slate-700" aria-label={reveal ? 'Hide password' : 'Show password'}>
          {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </Field>
      {signUp && (
        <>
          <ul className="space-y-1 pl-7 text-[11px]">
            {PASSWORD_RULES.map((rule, index) => (
              <li key={rule.label} className={`flex items-center gap-2 ${rules[index] ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> {rule.label}
              </li>
            ))}
          </ul>
          <Field icon={<Lock className="w-4 h-4" />} valid={confirm.length > 0 && confirm === password}>
            <input className={inputClass} type={reveal ? 'text' : 'password'} placeholder="Re-type password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-label="Re-type password" maxLength={128} />
          </Field>
        </>
      )}
      {!signUp && (
        <div className="text-right">
          <button type="button" onClick={reset} className="text-xs font-semibold text-[#234e40] hover:underline">Forgot password?</button>
        </div>
      )}
      <div className="flex items-center gap-4 pt-3">
        <button type="submit" disabled={!canSubmit || busy} className="flex-1 sm:flex-none sm:min-w-[11rem] rounded-lg bg-[#234e40] hover:bg-[#193c30] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 flex items-center justify-between gap-4 transition-colors">
          <span>{signUp ? 'Create account' : 'Sign in'}</span>
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
        <span className="text-xs text-slate-400">Or</span>
        <button type="button" onClick={google} disabled={busy} aria-label="Continue with Google" className="w-11 h-11 rounded-full border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center transition-colors">
          <GoogleIcon className="w-5 h-5" />
        </button>
      </div>
      <p className="pt-2 text-[11px] text-slate-400">
        {signUp ? 'Already a member? ' : 'New to AdOptimize? '}
        <Link href={`${signUp ? '/sign-in' : '/sign-up'}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-[#234e40] hover:underline">
          {signUp ? 'Sign in' : 'Create an account'}
        </Link>
        {' '}· By continuing you agree to our <Link href="/terms-of-service" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

const PRO_FEATURES = ['AI Marketing Agent with saved chat history', 'Period-specific Ads Audit and Reports', 'Budget Optimizer and approved campaign changes'];
// Paid pages would just bounce an unpaid user back here, so the free plan only continues to free ones.
const FREE_PATHS = ['/dashboard', '/campaigns', '/activity-log', '/settings', '/billing'];

function PlanStep({ user, status, initial, next }: { user: User; status: BillingStatus; initial: PlanInterval; next: string }) {
  const router = useRouter();
  const [interval, setInterval] = useState<PlanInterval>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await startCheckout(user, interval);
    } catch (failure) {
      if (failure instanceof BillingClientError && failure.status === 409) { router.replace('/billing'); return; }
      setError(failure instanceof Error ? failure.message : 'Unable to open checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {status.environment === 'sandbox' && <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Sandbox mode: checkout uses test payments only.</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}
      <div role="radiogroup" aria-label="Billing interval" className="grid grid-cols-2 gap-3">
        {([['monthly', '$29', 'per month', null], ['yearly', '$99', 'per year', 'Save 72%']] as const).map(([value, price, unit, badge]) => (
          <button key={value} type="button" role="radio" aria-checked={interval === value} onClick={() => setInterval(value)}
            className={`relative rounded-xl border p-4 text-left transition-all ${interval === value ? 'border-[#234e40] ring-2 ring-[#234e40]/10 bg-[#edf0e8]/50' : 'border-slate-200 hover:border-slate-300'}`}>
            {badge && <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
            <div className="text-xs font-semibold capitalize text-slate-500">{value}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{price}</div>
            <div className="text-[11px] text-slate-500">{unit}</div>
          </button>
        ))}
      </div>
      <ul className="space-y-1.5 text-xs text-slate-600">
        {PRO_FEATURES.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />{feature}</li>)}
      </ul>
      <button type="button" onClick={checkout} disabled={busy} className="w-full rounded-lg bg-[#234e40] hover:bg-[#193c30] disabled:opacity-60 text-white text-sm font-semibold px-6 py-3 flex items-center justify-center gap-2 transition-colors">
        {busy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Opening secure checkout...</> : <>Continue to secure checkout <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5" /> Payments are handled by Polar. Taxes are calculated at checkout. Cancel anytime.</p>
      <button type="button" onClick={() => router.replace(FREE_PATHS.includes(next) ? next : '/dashboard')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">
        Continue with the free plan
      </button>
    </div>
  );
}

export function AuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const plan = parseInterval(params.get('plan'));
  const { user, ready } = useAuthUser();
  const [loaded, setLoaded] = useState<{ uid: string; status?: BillingStatus; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const signUp = mode === 'sign-up';

  // The step is derived from server-side truth, so a returning user resumes exactly where they left off.
  useEffect(() => {
    if (!ready || !user || !signUp) return;
    let active = true;
    fetchBillingStatus(user).then(
      (status) => { if (active) setLoaded({ uid: user.uid, status }); },
      (failure) => { if (active) setLoaded({ uid: user.uid, error: failure instanceof Error ? failure.message : 'Unable to load your plan.' }); },
    );
    return () => { active = false; };
  }, [ready, user, signUp, attempt]);

  useEffect(() => {
    if (!ready || !user || signUp) return;
    let active = true;
    synchronizeServerSession(user).then(
      () => { if (active) router.replace(next); },
      (failure) => { if (active) setLoaded({ uid: user.uid, error: failure instanceof Error ? failure.message : 'Unable to synchronize your secure session.' }); },
    );
    return () => { active = false; };
  }, [ready, user, signUp, next, router, attempt]);

  const current = user && loaded?.uid === user.uid ? loaded : null;
  const status = current?.status ?? null;
  const statusError = current?.error ?? null;
  const retry = () => { setLoaded(null); setAttempt((value) => value + 1); };

  const step = useMemo(() => {
    if (!user) return 0;
    if (status?.hasAccess) return 3;
    return 1;
  }, [user, status]);

  const heading = signUp
    ? step === 0 ? 'Sign Up' : step === 1 ? 'Choose your plan' : 'Bring your campaigns to life'
    : 'Sign In';
  const subtitle = signUp
    ? step === 0 ? 'Create your account to launch your AI marketing agent' : step === 1 ? 'Unlock the full agent. Upgrade, downgrade, or cancel anytime.' : 'Pro is active. Connect Google Ads to get started.'
    : 'Welcome back. Pick up where your agent left off.';

  return (
    <main className="min-h-screen bg-[#f5f3ee] p-3 sm:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-6xl min-h-[640px] rounded-2xl border border-[#e2e3da] bg-white shadow-[0_16px_60px_rgba(35,50,38,0.06)] overflow-hidden grid lg:grid-cols-[1.05fr_1fr]">
        <section className="p-6 sm:p-12 flex flex-col">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Back to home" className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <BrandLogoIcon size={20} className="w-5 h-5 rounded-md" />
              <span>{signUp ? 'Already member?' : 'New here?'}</span>
              <Link href={signUp ? '/sign-in' : '/sign-up'} className="font-semibold text-[#234e40] rounded-md bg-[#edf0e8] px-2 py-1">{signUp ? 'Sign in' : 'Sign up'}</Link>
            </div>
          </div>

          <div className="mt-10 sm:mt-14 max-w-md w-full space-y-6 flex-1">
            {signUp && <Stepper current={step} />}
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{heading}</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400">{subtitle}</p>
            </div>

            {!ready ? <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</p>
              : !user ? <AccountForm mode={mode} next={next} onDone={() => {}} />
              : !signUp ? statusError ? <div role="alert" className="space-y-3 text-sm text-rose-700"><p>{statusError}</p><button type="button" onClick={retry} className="font-semibold underline">Retry sign-in</button></div> : <p role="status" className="text-sm text-slate-500">Synchronizing secure sign-in...</p>
              : statusError ? (
                <div className="space-y-3">
                  <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{statusError}</p>
                  <div className="flex gap-3">
                    <button onClick={retry} className="rounded-lg bg-[#234e40] text-white text-xs font-semibold px-5 py-2.5">Try again</button>
                    <Link href="/dashboard" className="rounded-full border border-slate-200 text-slate-700 text-xs font-semibold px-5 py-2.5">Continue with the free plan</Link>
                  </div>
                </div>
              )
              : !status ? <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Checking your plan...</p>
              : step === 3 ? <PostPaymentConnect next={next} />
              : <PlanStep user={user} status={status} initial={plan} next={next} />}
          </div>
        </section>
        <ShowcasePanel />
      </div>
    </main>
  );
}
