'use client';

import React, { useState } from 'react';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/firebase';
import { GoogleIcon } from '@/components/ui/google-icon';

interface AuthGateProps {
  onSignInSuccess?: () => void;
  onExploreDemo?: () => void;
  onBack?: () => void;
}

export function AuthGate({ onSignInSuccess, onExploreDemo, onBack }: AuthGateProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (onSignInSuccess) onSignInSuccess();
    } catch (err: any) {
      setIsLoading(false);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err?.message || 'Could not sign in with Google.');
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      if (onSignInSuccess) onSignInSuccess();
    } catch (err: any) {
      setIsLoading(false);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account already exists with this email. Please sign in.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-[#00d67d]/20 selection:text-white font-sans relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5"
        >
          <span>← Back to Homepage</span>
        </button>
      )}

      <div className="max-w-sm w-full bg-[#111622] rounded-3xl p-8 sm:p-9 shadow-2xl border border-slate-800 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Logo */}
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#00d67d] text-slate-950 font-extrabold text-sm tracking-tight shadow-lg shadow-[#00d67d]/20 select-none">
            <span>AD</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-xs text-slate-400">
            {isSignUp ? 'Get started with automated Google Ads optimization' : 'Sign in to access your AdOptimize command center'}
          </p>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-tight">{errorMessage}</p>
          </div>
        )}

        {/* Social Auth: Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs disabled:opacity-60"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-500 uppercase font-semibold">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:border-[#00d67d] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:border-[#00d67d] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00d67d]/20 disabled:opacity-60 pt-2.5"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="text-center pt-1 border-t border-slate-800 text-xs">
          {isSignUp ? (
            <p className="text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
                className="font-bold text-[#00d67d] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-slate-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
                className="font-bold text-[#00d67d] hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          )}
        </div>

        {onExploreDemo && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onExploreDemo}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Explore live preview as guest →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
