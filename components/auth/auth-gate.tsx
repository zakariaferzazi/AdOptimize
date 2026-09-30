'use client';

import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Bot,
  Zap,
  Layers,
  ArrowRight,
  Lock,
  Database,
  Sparkles
} from 'lucide-react';

interface AuthGateProps {
  onSignInWithGoogle: () => void;
  onExploreDemo?: () => void;
  isLoading?: boolean;
}

export function AuthGate({ onSignInWithGoogle, onExploreDemo, isLoading }: AuthGateProps) {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col justify-center items-center p-6 selection:bg-[#00d67d]/20 selection:text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80 space-y-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-950 text-[#00d67d] shadow-lg shadow-[#00d67d]/10 mx-auto">
          <TrendingUp className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Marketing Manager for Google Ads</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Connect Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Sign in with your Google Account to access continuous 24/7 campaign monitoring, budget reallocation, and automated audit logs.
          </p>
        </div>

        {/* Action Button: Sign In with Google */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onSignInWithGoogle}
            disabled={isLoading}
            className="w-full py-3.5 px-5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 group"
          >
            <div className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">
              G
            </div>
            <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
            <ArrowRight className="w-4 h-4 text-[#00d67d] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {onExploreDemo && (
            <button
              onClick={onExploreDemo}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer block mx-auto"
            >
              Continue to command center as Guest →
            </button>
          )}
        </div>

        {/* Trust Badges */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-left">
          <div className="flex items-start gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-slate-900">Firebase Auth</div>
              <div className="text-[10px] text-slate-500">Encrypted token isolation</div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-600">
            <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-slate-900">Real Cloud DB</div>
              <div className="text-[10px] text-slate-500">Live Firestore sync</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
