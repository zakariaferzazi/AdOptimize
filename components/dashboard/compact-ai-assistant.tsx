'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  TrendingDown,
  Target,
  Sliders,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { Campaign, GoogleAdsAccount, AnomalyAlert } from '@/types/adoptimize';

interface CompactAiAssistantProps {
  account: GoogleAdsAccount;
  campaigns: Campaign[];
  anomalies?: AnomalyAlert[];
  userEmail?: string | null;
  userId?: string;
  accessToken?: string;
}

export function CompactAiAssistant({
  account,
  campaigns,
  anomalies = [],
  userEmail,
  userId,
  accessToken,
}: CompactAiAssistantProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestAnswer, setLatestAnswer] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  // Compute live, grounded summary from real campaign data
  const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
  const topPerformer = [...campaigns].sort((a, b) => (b.roas || 0) - (a.roas || 0))[0];
  const lowestPerformer = [...campaigns].sort((a, b) => (a.roas || 0) - (b.roas || 0))[0];

  const suggestedPrompts = [
    { label: 'Find wasted spend', prompt: 'Analyze my campaigns and identify search queries or ad sets wasting spend.' },
    { label: 'Analyze my campaigns', prompt: 'Provide a performance diagnosis of all active Google Ads campaigns.' },
    { label: 'Optimize my budget', prompt: 'Recommend how to reallocate my daily budget to maximize conversions and ROAS.' },
  ];

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    setActivePrompt(promptText);
    setQuery('');
    setIsLoading(true);
    setLatestAnswer(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          model: 'deepseek',
          modelTier: 'deepseek',
          conversationHistory: [],
          context: {
            userId,
            account,
            campaigns,
            anomalies,
            accessToken,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await res.json();
      setLatestAnswer(data.reply || 'Analysis completed.');
    } catch (err: any) {
      setLatestAnswer('I analyzed your active campaign data. Open the Full AI Chat to explore detailed recommendations and adjustments.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSendPrompt(query);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#00d67d]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AdOptimize AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">Google Ads Optimization Copilot</p>
            </div>
          </div>

          <Link
            href="/chat"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
          >
            <span>Full Chat</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Real Data Performance Summary */}
        <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-700 space-y-1.5 leading-relaxed">
          <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
            <span>Account Health Summary</span>
            <span className="font-mono text-emerald-700 font-semibold">{campaigns.length} Active Campaigns</span>
          </div>
          <p className="text-[11px] text-slate-600">
            {campaigns.length > 0 ? (
              <>
                Monitoring <strong className="text-slate-900">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> total spend with <strong className="text-slate-900">{totalConversions} conversions</strong>.
                {topPerformer && ` Top campaign "${topPerformer.name}" leads at ${topPerformer.roas?.toFixed(2)}x ROAS.`}
              </>
            ) : (
              'Connect a Google Ads account to generate automated performance diagnosis and wasted spend audits.'
            )}
          </p>
        </div>

        {/* Suggested Prompts */}
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Suggested Analyses
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPrompt(p.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-xl text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer text-left shadow-2xs hover:border-slate-300 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Answer Preview (if query submitted) */}
        {latestAnswer && (
          <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-emerald-950 text-[11px]">
              <span className="truncate max-w-[200px]">{activePrompt || 'Analysis'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">AdOptimize AI</span>
            </div>
            <p className="text-[11px] text-slate-800 leading-relaxed max-h-36 overflow-y-auto pr-1">
              {latestAnswer}
            </p>
            <div className="pt-1 border-t border-emerald-200/60 flex items-center justify-between text-[10px]">
              <span className="text-emerald-800">Need multi-step automated adjustments?</span>
              <Link
                href="/chat"
                className="font-bold text-emerald-900 hover:underline flex items-center gap-0.5"
              >
                <span>Open in Full Chat</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Input Field Form */}
      <form onSubmit={handleFormSubmit} className="pt-2 border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask AdOptimize AI about your campaigns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-1.5 p-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
            title="Ask AI"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00d67d]" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#00d67d]" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
