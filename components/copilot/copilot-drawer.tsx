'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  User,
  Sliders
} from 'lucide-react';
import { Campaign, AnomalyAlert, ChatMessage, GoogleAdsAccount } from '@/types/adoptimize';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  anomalies: AnomalyAlert[];
  totalSpend: number;
  totalConversions: number;
  overallCpa: number;
  overallRoas: number;
  account?: GoogleAdsAccount;
  userName?: string;
  onSelectCampaignByName?: (name: string) => void;
}

export function CopilotDrawer({
  isOpen,
  onClose,
  campaigns,
  anomalies,
  totalSpend,
  totalConversions,
  overallCpa,
  overallRoas,
  account,
  userName,
  onSelectCampaignByName,
}: CopilotDrawerProps) {
  const getInitialGreeting = (): string => {
    const name = userName || 'there';
    const accLabel = account?.clientCustomerId && account.clientCustomerId !== 'Not Connected'
      ? ` (**Customer ID: ${account.clientCustomerId}**)`
      : '';

    if (campaigns.length === 0) {
      return `Hello ${name}! I am your **AdOptimize Copilot**${accLabel}.\n\nNo active campaigns are currently synchronized in this account. Connect your Google Ads account or click **+ New Campaign** to begin live monitoring, CPA anomaly detection, and AI recommendations.`;
    }

    const highestRoas = [...campaigns].sort((a, b) => b.roas - a.roas)[0];
    const lowestRoas = [...campaigns].sort((a, b) => a.roas - b.roas)[0];

    let summary = `Hello ${name}! I am your **AdOptimize Copilot**${accLabel}. I am actively monitoring ${campaigns.length} campaigns.\n\n`;
    if (highestRoas && highestRoas.roas > 0) {
      summary += `- **Top Performer:** "${highestRoas.name}" is leading at **${highestRoas.roas.toFixed(2)}x ROAS** ($${highestRoas.cpa.toFixed(2)} CPA).\n`;
    }
    if (lowestRoas && lowestRoas.spend > 0 && lowestRoas.roas < 2.0) {
      summary += `- **Optimization Candidate:** "${lowestRoas.name}" has generated $${lowestRoas.spend.toLocaleString()} spend at **${lowestRoas.roas.toFixed(2)}x ROAS**.\n`;
    }
    summary += `\nAsk me any question below to inspect search query logs, adjust budgets, or run live simulations!`;
    return summary;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-01',
      role: 'assistant',
      content: getInitialGreeting(),
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(1);

  const quickQuestions = [
    'Why did my CPA increase?',
    'Which campaigns are wasting money?',
    'Where should I reduce budget?',
    'Which campaign deserves more budget?',
    'What should I fix today?',
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isLoading) return;

    msgCountRef.current += 1;
    const currentId = msgCountRef.current;

    const userMsg: ChatMessage = {
      id: `user-${currentId}`,
      role: 'user',
      content: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            totalSpend,
            totalConversions,
            overallCpa,
            overallRoas,
            campaigns,
            anomalies,
          },
        }),
      });

      const data = await res.json();
      msgCountRef.current += 1;
      const assistantMsg: ChatMessage = {
        id: `assistant-${msgCountRef.current}`,
        role: 'assistant',
        content: data.reply || 'Analysis complete.',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      msgCountRef.current += 1;
      const errorMsg: ChatMessage = {
        id: `err-${msgCountRef.current}`,
        role: 'assistant',
        content: 'Failed to retrieve analysis from server. Please verify network connection.',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Marketing Copilot</h3>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-[#00d67d] px-2 py-0.5 rounded-full font-bold">
                  Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {account?.clientCustomerId && account.clientCustomerId !== 'Not Connected'
                  ? `Connected to Google Ads (Account ${account.clientCustomerId})`
                  : 'Google Ads Account Intelligence'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isUser = m.role === 'user';

            return (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
                    isUser
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div
                    className={`text-[10px] font-mono ${
                      isUser ? 'text-slate-400 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200/80 max-w-[70%]">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Analyzing campaign metrics & auction signals...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 border-t border-slate-100 bg-white overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about CPA, wasted spend, budget shifts..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            disabled={isLoading}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-50 text-slate-950 flex items-center justify-center shadow-md transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
