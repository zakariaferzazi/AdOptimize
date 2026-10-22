'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Terminal,
  Paperclip,
  Check
} from 'lucide-react';

export type SupportedModel = 'claude' | 'chatgpt' | 'gemini';

interface ModelPreset {
  id: SupportedModel;
  name: string;
  creator: string;
  accentColor: string;
  themeBg: string;
  themeBorder: string;
  activePillBg: string;
  activePillText: string;
  versions: string[];
  defaultPrompt: string;
  headline: string;
  disclaimer: string;
  quickPrompts: { label: string; text: string }[];
  sampleResult: {
    title: string;
    actionBadge: string;
    account: string;
    summary: string;
    checks: string[];
    details: { label: string; value: string; highlight?: boolean }[];
  };
}

const MODEL_PRESETS: Record<SupportedModel, ModelPreset> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    creator: 'Anthropic',
    accentColor: '#D97706', // warm amber / terracotta
    themeBg: 'bg-amber-500/5',
    themeBorder: 'border-amber-200/60',
    activePillBg: 'bg-amber-900 text-amber-50 border-amber-800 shadow-sm',
    activePillText: 'text-amber-950 font-semibold',
    versions: ['Claude 3.7 Sonnet', 'Claude Opus 4.5', 'Claude 3.5 Haiku'],
    headline: 'What shall we optimize in Google Ads today?',
    defaultPrompt: 'Build the approved Q3 search campaign. Keep CPC under $8 and create it paused with 4 ad groups.',
    disclaimer: 'Claude generates paused campaigns and negative keyword lists with safe human approval.',
    quickPrompts: [
      {
        label: 'Build Q3 Search Campaign',
        text: 'Build the approved Q3 search campaign. Keep CPC under $8 and create it paused with 4 ad groups.'
      },
      {
        label: 'Audit Wasted Spend > $150',
        text: 'Audit search queries with spend > $150 and 0 conversions in the last 30 days. Draft negative keywords.'
      },
      {
        label: 'Quality Score & RSA Check',
        text: 'Review ad groups with Quality Score below 5 and generate 3 dynamic keyword insertion headlines.'
      }
    ],
    sampleResult: {
      title: 'Q3 Search Campaign Structure Created',
      actionBadge: 'Campaign Drafted (Paused)',
      account: 'Growth Portfolio (CID: 482-192-8012)',
      summary: 'Generated 4 ad groups (High-Intent B2B, Solutions, Enterprise, Features) with 12 Responsive Search Ads. CPC cap enforced at $7.85.',
      checks: [
        'Max CPC bid cap respected: $7.85 (Target < $8.00)',
        'Initial deployment status: PAUSED (safe review mode)',
        'Negative exact match list attached (38 excluded search terms)',
        '1-click instant rollback snapshot created in audit log'
      ],
      details: [
        { label: 'Target CPC Cap', value: '$7.85 max', highlight: true },
        { label: 'Campaign Status', value: 'PAUSED' },
        { label: 'Ad Groups Created', value: '4 groups' },
        { label: 'RSAs Composed', value: '12 responsive ads' }
      ]
    }
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    creator: 'OpenAI',
    accentColor: '#10A37F', // OpenAI green
    themeBg: 'bg-emerald-500/5',
    themeBorder: 'border-emerald-200/60',
    activePillBg: 'bg-emerald-900 text-emerald-50 border-emerald-800 shadow-sm',
    activePillText: 'text-emerald-950 font-semibold',
    versions: ['GPT-4o', 'o3-mini (Reasoning)', 'GPT-4.5 Turbo'],
    headline: 'How can I assist your Google Ads campaigns today?',
    defaultPrompt: 'Audit high-CPA search queries with zero conversions and generate an exact-match negative keyword list.',
    disclaimer: 'ChatGPT analyzes Google Ads SearchStream API logs. Changes require your explicit approval.',
    quickPrompts: [
      {
        label: 'Audit High-CPA Queries',
        text: 'Audit high-CPA search queries with zero conversions and generate an exact-match negative keyword list.'
      },
      {
        label: 'Rebalance PMax to Search',
        text: 'Reallocate $1,500/mo ad spend from low-ROAS PMax asset groups into high-converting exact search keywords.'
      },
      {
        label: 'Competitive Headline Polish',
        text: 'Scan competitor positioning and write 5 high-converting RSA headlines emphasizing free trial and no card required.'
      }
    ],
    sampleResult: {
      title: 'Search Query Audit & Negative Keyword Harvest',
      actionBadge: '24 Negative Terms Flagged',
      account: 'SaaS Growth (CID: 319-804-9912)',
      summary: 'Scanned 1,480 search terms from past 30 days. Found 24 irrelevant queries (support logins, crack downloads, jobs) burning $412.80.',
      checks: [
        'Waste elimination estimated: $412.80/month saved',
        'Filtered irrelevant non-converting search intents',
        'Prepared account-level negative keyword list: "B2B_Waste_Filter_Auto"',
        'Zero impact on existing converting keyword phrases'
      ],
      details: [
        { label: 'Wasted Spend Found', value: '$412.80', highlight: true },
        { label: 'Queries Scanned', value: '1,480 terms' },
        { label: 'Negative Keywords', value: '24 filtered' },
        { label: 'Projected ROAS Lift', value: '+18.4%' }
      ]
    }
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    creator: 'Google DeepMind',
    accentColor: '#2563EB', // Google blue
    themeBg: 'bg-blue-500/5',
    themeBorder: 'border-blue-200/60',
    activePillBg: 'bg-blue-900 text-blue-50 border-blue-800 shadow-sm',
    activePillText: 'text-blue-950 font-semibold',
    versions: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.0 Ultra'],
    headline: 'Ask Gemini to inspect your Google Ads auction.',
    defaultPrompt: 'Detect ROAS anomalies across Performance Max campaigns and simulate reallocating budget to Top Search.',
    disclaimer: 'Gemini connects natively to Google Ads SearchStream API v25 with real-time auction telemetry.',
    quickPrompts: [
      {
        label: 'Performance Max Anomaly Scan',
        text: 'Detect ROAS anomalies across Performance Max campaigns and simulate reallocating budget to Top Search.'
      },
      {
        label: 'Marginal ROAS Simulation',
        text: 'Simulate the conversion impact of raising target ROAS by 15% on high-volume search campaigns.'
      },
      {
        label: 'Auction Impression Share Drop',
        text: 'Identify campaigns that lost >20% search lost impression share to rank over the last 14 days.'
      }
    ],
    sampleResult: {
      title: 'PMax Diagnostic & Budget Rebalance Plan',
      actionBadge: 'Capital Rebalancing Recommended',
      account: 'Primary Production (CID: 601-445-1209)',
      summary: 'Detected asset group cannibalization in Performance Max. Moving $85/day to High-Intent Brand & Core Search yields +31.2% incremental conversions.',
      checks: [
        'Live SearchStream v25 auction data synchronized',
        'Search Impression Share gain projected: +14.6%',
        'Budget velocity cap set to maximum 10% daily variation',
        'Full snapshot stored for 1-click rollback restoration'
      ],
      details: [
        { label: 'Shift Recommendation', value: '$85.00 / day', highlight: true },
        { label: 'Primary Destination', value: 'Top Core Search' },
        { label: 'Expected Conv. Gain', value: '+31.2%' },
        { label: 'Auction Overlap', value: 'Resolved' }
      ]
    }
  }
};

export function ModelDemoSimulator({
  onConnectGoogleAds,
  onOpenApp
}: {
  onConnectGoogleAds?: () => void;
  onOpenApp?: () => void;
}) {
  const [selectedModel, setSelectedModel] = useState<SupportedModel>('claude');
  const [selectedVersion, setSelectedVersion] = useState<string>(MODEL_PRESETS['claude'].versions[0]);
  const [promptText, setPromptText] = useState<string>(MODEL_PRESETS['claude'].defaultPrompt);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [executionResult, setExecutionResult] = useState<typeof MODEL_PRESETS['claude']['sampleResult'] | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);

  const activePreset = MODEL_PRESETS[selectedModel];

  // When switching model, update default prompt and version
  const handleModelChange = (model: SupportedModel) => {
    setSelectedModel(model);
    setSelectedVersion(MODEL_PRESETS[model].versions[0]);
    setPromptText(MODEL_PRESETS[model].defaultPrompt);
    setExecutionResult(null);
    setIsApplied(false);
    setIsVersionDropdownOpen(false);
  };

  const handleSelectQuickPrompt = (text: string) => {
    setPromptText(text);
    setExecutionResult(null);
    setIsApplied(false);
  };

  const handleExecute = () => {
    if (!promptText.trim()) return;
    setIsThinking(true);
    setExecutionResult(null);
    setIsApplied(false);

    setTimeout(() => {
      setIsThinking(false);
      setExecutionResult(activePreset.sampleResult);
    }, 750);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 1. FLOATING MODEL SELECTOR DOCK */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-800">
          {/* Claude Tab */}
          <button
            onClick={() => handleModelChange('claude')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
              selectedModel === 'claude'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {/* Claude Asterisk icon */}
            <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a1 1 0 0 1 1 1v4.07l2.88-2.88a1 1 0 1 1 1.41 1.41L14.41 8.5H18.5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4.09l2.88 2.88a1 1 0 1 1-1.41 1.41L13 13.91V18a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4.09l-2.88 2.88a1 1 0 0 1-1.41-1.41L7.59 13.5H3.5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h4.09L4.71 6.6a1 1 0 0 1 1.41-1.41L9 8.07V4a1 1 0 0 1 1-1h2Z" />
            </svg>
            <span className="font-semibold">Claude</span>
            {selectedModel === 'claude' && (
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono">
                Opus 4.5
              </span>
            )}
          </button>

          {/* ChatGPT Tab */}
          <button
            onClick={() => handleModelChange('chatgpt')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
              selectedModel === 'chatgpt'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {/* OpenAI Spiral */}
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.5 10.3a5.2 5.2 0 0 0-.4-4 5.3 5.3 0 0 0-4.9-2.7 5.2 5.2 0 0 0-3.2-1.6 5.3 5.3 0 0 0-5.1 2.9 5.2 5.2 0 0 0-3.5 1.7 5.3 5.3 0 0 0-.7 5.5 5.2 5.2 0 0 0-1.8 3.5 5.3 5.3 0 0 0 2 5.3 5.2 5.2 0 0 0 3.2 1.6 5.3 5.3 0 0 0 5.1-2.9 5.2 5.2 0 0 0 3.5-1.7 5.3 5.3 0 0 0 .8-5.5 5.2 5.2 0 0 0 1.8-3.5 5.3 5.3 0 0 0-2-5.3l-.2.1Zm-7.7 11.2a3.8 3.8 0 0 1-2.4-.9l.1-.1 4-2.3a.8.8 0 0 0 .4-.7v-5.6l1.7 1v4.8a3.8 3.8 0 0 1-3.8 3.8Zm-8.6-4.1a3.8 3.8 0 0 1-.5-2.5l.1.1 4 2.3a.8.8 0 0 0 .8 0l4.8-2.8v2l-4.1 2.4a3.8 3.8 0 0 1-5.1-1.5Zm-1.4-8.8a3.8 3.8 0 0 1 1.9-1.7v4.7a.8.8 0 0 0 .4.7l4.8 2.8-1.7 1-4.1-2.4a3.8 3.8 0 0 1-1.3-5.1Zm13.5 4.3-4.8-2.8 1.7-1 4.1 2.4a3.8 3.8 0 0 1 1.3 5.1 3.8 3.8 0 0 1-1.9 1.7v-4.7a.8.8 0 0 0-.4-.7Zm2.1-3.8-4-2.3a.8.8 0 0 0-.8 0l-4.8 2.8v-2l4.1-2.4a3.8 3.8 0 0 1 5.5 3.9ZM9.5 12.8l2.5-1.5 2.5 1.5v2.9l-2.5 1.5-2.5-1.5v-2.9Z" />
            </svg>
            <span className="font-semibold">ChatGPT</span>
            {selectedModel === 'chatgpt' && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-400/20 text-emerald-300 rounded font-mono">
                GPT-4o
              </span>
            )}
          </button>

          {/* Gemini Tab */}
          <button
            onClick={() => handleModelChange('gemini')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
              selectedModel === 'gemini'
                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {/* Google DeepMind Radiant Sparkle */}
            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c.3 6.6 5.4 11.7 12 12-6.6.3-11.7 5.4-12 12-.3-6.6-5.4-11.7-12-12C6.6 11.7 11.7 6.6 12 0Z" />
            </svg>
            <span className="font-semibold">Gemini</span>
            {selectedModel === 'gemini' && (
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-400/20 text-blue-300 rounded font-mono">
                2.5 Pro
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. THE SIMULATION WINDOW */}
      <div className="bg-[#FAF9F6] border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-300/40 overflow-hidden transition-all duration-300">
        {/* Window Chrome / Title Bar */}
        <div className="bg-white/80 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] inline-block" />
            
            <div className="ml-3 flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                AdOptimize Engine · {activePreset.name} Bridge
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SearchStream API v25</span>
            </div>
          </div>
        </div>

        {/* Window Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Brand Glyph & Model Headline */}
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200/80 mx-auto">
              {selectedModel === 'claude' && (
                <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a1 1 0 0 1 1 1v4.07l2.88-2.88a1 1 0 1 1 1.41 1.41L14.41 8.5H18.5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4.09l2.88 2.88a1 1 0 1 1-1.41 1.41L13 13.91V18a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4.09l-2.88 2.88a1 1 0 0 1-1.41-1.41L7.59 13.5H3.5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h4.09L4.71 6.6a1 1 0 0 1 1.41-1.41L9 8.07V4a1 1 0 0 1 1-1h2Z" />
                </svg>
              )}
              {selectedModel === 'chatgpt' && (
                <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 10.3a5.2 5.2 0 0 0-.4-4 5.3 5.3 0 0 0-4.9-2.7 5.2 5.2 0 0 0-3.2-1.6 5.3 5.3 0 0 0-5.1 2.9 5.2 5.2 0 0 0-3.5 1.7 5.3 5.3 0 0 0-.7 5.5 5.2 5.2 0 0 0-1.8 3.5 5.3 5.3 0 0 0 2 5.3 5.2 5.2 0 0 0 3.2 1.6 5.3 5.3 0 0 0 5.1-2.9 5.2 5.2 0 0 0 3.5-1.7 5.3 5.3 0 0 0 .8-5.5 5.2 5.2 0 0 0 1.8-3.5 5.3 5.3 0 0 0-2-5.3l-.2.1Zm-7.7 11.2a3.8 3.8 0 0 1-2.4-.9l.1-.1 4-2.3a.8.8 0 0 0 .4-.7v-5.6l1.7 1v4.8a3.8 3.8 0 0 1-3.8 3.8Zm-8.6-4.1a3.8 3.8 0 0 1-.5-2.5l.1.1 4 2.3a.8.8 0 0 0 .8 0l4.8-2.8v2l-4.1 2.4a3.8 3.8 0 0 1-5.1-1.5Zm-1.4-8.8a3.8 3.8 0 0 1 1.9-1.7v4.7a.8.8 0 0 0 .4.7l4.8 2.8-1.7 1-4.1-2.4a3.8 3.8 0 0 1-1.3-5.1Zm13.5 4.3-4.8-2.8 1.7-1 4.1 2.4a3.8 3.8 0 0 1 1.3 5.1 3.8 3.8 0 0 1-1.9 1.7v-4.7a.8.8 0 0 0-.4-.7Zm2.1-3.8-4-2.3a.8.8 0 0 0-.8 0l-4.8 2.8v-2l4.1-2.4a3.8 3.8 0 0 1 5.5 3.9ZM9.5 12.8l2.5-1.5 2.5 1.5v2.9l-2.5 1.5-2.5-1.5v-2.9Z" />
                </svg>
              )}
              {selectedModel === 'gemini' && (
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c.3 6.6 5.4 11.7 12 12-6.6.3-11.7 5.4-12 12-.3-6.6-5.4-11.7-12-12C6.6 11.7 11.7 6.6 12 0Z" />
                </svg>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-serif text-slate-800 tracking-tight font-medium">
              {activePreset.headline}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Simulate plain-English campaign orchestration directly connected to Google Ads guardrails.
            </p>
          </div>

          {/* Quick Prompt Recommendation Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {activePreset.quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectQuickPrompt(item.text)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  promptText === item.text
                    ? 'bg-slate-900 text-white border-slate-900 font-medium shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 3. INTERACTIVE CHAT / PROMPT BOX */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-200/50 p-3 sm:p-4 transition-all focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
            {/* Textarea */}
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ask AdOptimize to audit queries, cap bids, or balance budgets..."
              rows={2}
              className="w-full text-slate-800 text-sm placeholder:text-slate-400 focus:outline-hidden resize-none bg-transparent leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleExecute();
                }
              }}
            />

            {/* Prompt Box Bottom Controls Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Attach File / Data Pill */}
                <button
                  type="button"
                  onClick={() => setHasAttachment(!hasAttachment)}
                  title="Attach Google Ads Report / CSV"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                    hasAttachment
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {hasAttachment && <span className="text-[11px] font-medium hidden sm:inline">SearchTerms.csv</span>}
                </button>

                {/* Schedule Run Pill */}
                <button
                  type="button"
                  onClick={() => setHasSchedule(!hasSchedule)}
                  title="Schedule automated recurring execution"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                    hasSchedule
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {hasSchedule && <span className="text-[11px] font-medium hidden sm:inline">Hourly Guard</span>}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Sub-model selector dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <span>{selectedVersion}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isVersionDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                      {activePreset.versions.map((ver) => (
                        <button
                          key={ver}
                          type="button"
                          onClick={() => {
                            setSelectedVersion(ver);
                            setIsVersionDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                            selectedVersion === ver ? 'text-slate-900 font-semibold bg-slate-50' : 'text-slate-600'
                          }`}
                        >
                          <span>{ver}</span>
                          {selectedVersion === ver && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Execute Button */}
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isThinking || !promptText.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                    promptText.trim() && !isThinking
                      ? 'bg-slate-900 hover:bg-black text-white hover:scale-105'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  aria-label="Execute simulation"
                >
                  {isThinking ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Model Disclaimer */}
          <div className="text-center">
            <span className="text-[11px] text-slate-400">
              {activePreset.disclaimer}
            </span>
          </div>

          {/* 4. EXECUTION / REASONING SIMULATION RESULT */}
          {isThinking && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs animate-pulse flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="text-xs text-slate-600 font-mono">
                {activePreset.name} {selectedVersion} is querying SearchStream logs & enforcing budget guardrails...
              </div>
            </div>
          )}

          {executionResult && !isThinking && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Header with status badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h4 className="font-semibold text-sm text-slate-900">
                    {executionResult.title}
                  </h4>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {executionResult.actionBadge}
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {executionResult.account}
                </div>
              </div>

              {/* Summary Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {executionResult.summary}
              </p>

              {/* Guardrail & Compliance Checks */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Ads Safety & Compliance Passed</span>
                </div>
                <div className="space-y-1 pt-1">
                  {executionResult.checks.map((chk, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {executionResult.details.map((d, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-left ${
                      d.highlight
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      {d.label}
                    </div>
                    <div className="text-sm font-bold mt-0.5">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsApplied(true);
                    }}
                    disabled={isApplied}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-slate-900 hover:bg-black text-white shadow-xs'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simulated Approval Active (Paused)</span>
                      </>
                    ) : (
                      <>
                        <span>Approve & Push to Google Ads</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {isApplied && onConnectGoogleAds && (
                    <button
                      onClick={onConnectGoogleAds}
                      className="px-3.5 py-2 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Connect Live Account</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setExecutionResult(null);
                      setIsApplied(false);
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Edit Instructions
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>1-click rollback active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
