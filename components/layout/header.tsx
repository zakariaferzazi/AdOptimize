'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Search,
  Bell,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Bot,
  LogOut,
  LogIn,
  User as UserIcon,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { GoogleAdsAccount, AnomalyAlert } from '@/types/adoptimize';
import { User } from 'firebase/auth';

interface HeaderProps {
  title: string;
  account: GoogleAdsAccount;
  anomalies: AnomalyAlert[];
  isSyncing: boolean;
  user: User | null;
  authLoading: boolean;
  onRefreshSync: () => void;
  onOpenConnectModal: () => void;
  onOpenCopilot: () => void;
  onSelectAnomaly: (anomaly: AnomalyAlert) => void;
  onSearchQuery?: (q: string) => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onClearData?: () => void;
}

export function Header({
  title,
  account,
  anomalies,
  isSyncing,
  user,
  authLoading,
  onRefreshSync,
  onOpenConnectModal,
  onOpenCopilot,
  onSelectAnomaly,
  onSearchQuery,
  onSignInWithGoogle,
  onSignOut,
  onClearData,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearchQuery) {
      onSearchQuery(e.target.value);
    }
  };

  return (
    <header className="h-20 bg-transparent px-8 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: View Title & Account Badge */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">
          {title}
        </h1>

        {/* Real Google Ads Account Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-full shadow-xs hover:border-slate-300 text-xs text-slate-700 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                account.isConnected && account.clientCustomerId !== 'Not Connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-slate-900">{account.accountName}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-slate-500">
              {account.isConnected && account.clientCustomerId !== 'Not Connected'
                ? account.clientCustomerId
                : 'Not Connected'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Account Dropdown */}
          {showAccountDropdown && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">Active Google Ads Account</div>
                <div className="text-[11px] text-slate-500">{account.timezone}</div>
              </div>

              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium truncate max-w-[150px]">{account.accountName}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700">Connected</span>
                </div>
              </div>

              <div className="p-2 border-t border-slate-100 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setShowAccountDropdown(false);
                    onOpenConnectModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>Connect / Switch Google Ads ID</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {onClearData && (
                  <button
                    onClick={() => {
                      setShowAccountDropdown(false);
                      onClearData();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Clear All Demo Campaigns</span>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions, Search, Alerts & Real Firebase Profile */}
      <div className="flex items-center gap-3.5">
        {/* Search Input */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns, keywords, CPAs..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-64 pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d]/40 focus:border-[#00d67d] transition-all shadow-xs"
          />
        </div>

        {/* Sync Trigger Button */}
        <button
          onClick={onRefreshSync}
          disabled={isSyncing}
          title="Force refresh Google Ads API data"
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium shadow-xs transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Ads'}</span>
        </button>

        {/* AI Copilot Quick Button */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-xs transition-colors group"
        >
          <Bot className="w-3.5 h-3.5 text-[#00d67d] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-semibold">AI Copilot</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-xs relative"
            aria-label="Alerts and notifications"
          >
            <Bell className="w-4 h-4" />
            {unresolvedAnomalies.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Detected Anomalies ({unresolvedAnomalies.length})
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">Real-time</span>
              </div>

              <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
                {unresolvedAnomalies.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active anomalies detected. All campaign metrics healthy.
                  </div>
                ) : (
                  unresolvedAnomalies.map((anom) => (
                    <div
                      key={anom.id}
                      onClick={() => {
                        onSelectAnomaly(anom);
                        setShowNotifications(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            anom.severity === 'CRITICAL'
                              ? 'bg-rose-500'
                              : anom.severity === 'WARNING'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 leading-snug">
                            {anom.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {anom.whatChanged}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real Firebase User Profile / Google Sign-In */}
        <div className="relative pl-2 border-l border-slate-200/80">
          {authLoading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-slate-100 transition-colors"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-900 text-white font-bold flex items-center justify-center ring-2 ring-slate-200 shrink-0">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {user.displayName || 'Google Ads User'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold leading-tight flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Firebase Auth</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {user.displayName || 'Google Account'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {user.email}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSignInWithGoogle}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs transition-colors cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                G
              </div>
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
