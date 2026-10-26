'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Layers,
  ChevronDown,
  ExternalLink,
  Table as TableIcon,
  Check,
  X,
  Sparkles,
  Cpu
} from 'lucide-react';
import {
  ChatMessage,
  Campaign,
  Keyword,
  SearchTerm,
  AuditLog,
  AnomalyAlert,
  AIInsight,
  BudgetRecommendation,
  AutomationRule,
  GoogleAdsAccount,
  ProposedAccountChange,
  ToolCallExecution
} from '@/types/adoptimize';

interface AiChatViewProps {
  account: GoogleAdsAccount;
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  auditLogs: AuditLog[];
  anomalies: AnomalyAlert[];
  insights: AIInsight[];
  recommendations: BudgetRecommendation[];
  rules: AutomationRule[];
  userId?: string;
  accessToken?: string;
  onMutateCampaign?: (campaign: Campaign, auditLog: AuditLog) => void;
  onSelectCampaign?: (campaign: Campaign) => void;
  onSelectCampaignByName?: (name: string) => void;
}

export function AiChatView({
  account,
  campaigns,
  keywords,
  searchTerms,
  auditLogs,
  anomalies,
  insights,
  recommendations,
  rules,
  userId,
  accessToken,
  onMutateCampaign,
  onSelectCampaign,
  onSelectCampaignByName,
}: AiChatViewProps) {
  const [modelTier, setModelTier] = useState<'fast' | 'analysis' | 'advanced'>('analysis');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const getWelcomeContent = () => {
    const accLabel = account?.clientCustomerId && account.clientCustomerId !== 'Not Connected'
      ? `connected to **CID ${account.clientCustomerId}**`
      : 'in Google Ads preview mode';

    return `Hello. I am your **Google Ads Optimization Specialist**, ${accLabel}.

I have direct access to your live campaign data, auction search terms, conversion metrics, and budget allocations. 

Ask me to inspect performance, identify wasted spend, diagnose high CPA, or propose budget reallocations. Whenever you want to modify budgets or pause campaigns, I will prepare a transparent change proposal for your explicit approval before executing.`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: getWelcomeContent(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'OpenRouter / Analysis Model',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const promptSuggestions = [
    {
      label: 'Find Wasted Spend',
      prompt: 'Analyze my Google Ads account and tell me what is wasting money.',
      icon: TrendingDown,
    },
    {
      label: 'Worst Performing Campaigns',
      prompt: 'Which campaigns performed worst over the last 7 days and why?',
      icon: AlertTriangle,
    },
    {
      label: 'Search Terms Leakage',
      prompt: 'Find search terms that are spending money without generating conversions.',
      icon: Layers,
    },
    {
      label: 'Budget Reallocation',
      prompt: 'Recommend how to redistribute my daily budget to maximize ROAS.',
      icon: TrendingUp,
    },
    {
      label: 'Pause Inefficient Ad Sets',
      prompt: 'Show me any campaign spending without conversions and propose pausing it.',
      icon: ShieldCheck,
    },
    {
      label: 'Recent Change History',
      prompt: 'Show me the changes made to my account recently.',
      icon: Sliders,
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setInputValue('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          modelTier,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            userId,
            account,
            campaigns,
            keywords,
            searchTerms,
            auditLogs,
            anomalies,
            insights,
            recommendations,
            rules,
            accessToken,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: data.toolCalls,
        actionProposal: data.actionProposal,
        tableData: data.tableData,
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-abort-${Date.now()}`,
            role: 'assistant',
            content: 'Request was cancelled.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `I encountered an issue processing your request: ${err.message || 'Unknown error'}. Please try again or switch model tiers.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleCancelRequest = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: getWelcomeContent(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'OpenRouter / Analysis Model',
      },
    ]);
  };

  // Handle Approve & Execute on Confirmation Card
  const handleApproveProposal = async (proposal: ProposedAccountChange, messageId: string) => {
    setExecutingProposalId(proposal.id);

    try {
      const response = await fetch('/api/ai/chat/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          context: {
            userId,
            account,
            campaigns,
            keywords,
            searchTerms,
            auditLogs,
            recommendations,
            rules,
            accessToken,
          },
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to execute Google Ads change.');
      }

      // If campaign mutated, notify parent
      if (resData.data?.updatedCampaign && onMutateCampaign) {
        onMutateCampaign(resData.data.updatedCampaign, resData.data.auditLog);
      }

      // Update message proposal status in state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.actionProposal) {
            return {
              ...msg,
              actionProposal: {
                ...msg.actionProposal,
                status: 'EXECUTED',
                executionResult: resData.message || 'Change successfully verified and executed in Google Ads.',
                appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            };
          }
          return msg;
        })
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.actionProposal) {
            return {
              ...msg,
              actionProposal: {
                ...msg.actionProposal,
                status: 'FAILED',
                executionResult: err.message || 'Execution failed. Please retry.',
              },
            };
          }
          return msg;
        })
      );
    } finally {
      setExecutingProposalId(null);
    }
  };

  // Handle Decline Proposal
  const handleDeclineProposal = (proposalId: string, messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.actionProposal) {
          return {
            ...msg,
            actionProposal: {
              ...msg.actionProposal,
              status: 'DECLINED',
              executionResult: 'Proposal declined by user. No modifications were made to Google Ads.',
            },
          };
        }
        return msg;
      })
    );
  };

  const handleCampaignClick = (campName: string) => {
    if (onSelectCampaignByName) {
      onSelectCampaignByName(campName);
    } else {
      const match = campaigns.find(
        (c) => c.name.toLowerCase() === campName.toLowerCase() || c.id === campName
      );
      if (match && onSelectCampaign) {
        onSelectCampaign(match);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold shadow-xs">
            <Cpu className="w-4 h-4 text-[#00d67d]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">AI Chat Assistant</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected Tools Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Direct natural language interaction with your Google Ads account
            </p>
          </div>
        </div>

        {/* Model Tier Selector (OpenRouter 3-Model Strategy) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
            <span className="px-2 text-[11px] font-semibold text-slate-400">Model:</span>
            <button
              onClick={() => setModelTier('fast')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                modelTier === 'fast'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fast Model: quick questions and simple data retrieval"
            >
              Fast
            </button>
            <button
              onClick={() => setModelTier('analysis')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                modelTier === 'analysis'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Analysis Model: in-depth diagnostics, search terms, wasted spend"
            >
              Analysis
            </button>
            <button
              onClick={() => setModelTier('advanced')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                modelTier === 'advanced'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Advanced Model: complex multi-step reasoning and deep optimization"
            >
              Advanced
            </button>
          </div>

          <button
            onClick={handleNewConversation}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Start new conversation"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Chat Conversation Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={message.id}
              className={`flex gap-3.5 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-950 text-[#00d67d] border border-slate-800 shadow-2xs'
                }`}
              >
                {isUser ? 'You' : 'Ad'}
              </div>

              {/* Message Content Container */}
              <div className="space-y-3 max-w-[85%]">
                {/* Speech Bubble */}
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-sm shadow-xs'
                      : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-sm shadow-xs'
                  }`}
                >
                  {/* Tool Executions Badges (if any tools were called) */}
                  {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mb-3.5 pb-3 border-b border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#00d67d]" />
                        <span>Connected Tools Executed:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {message.toolCalls.map((tc) => (
                          <span
                            key={tc.id}
                            className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                          >
                            <span className="font-semibold">{tc.name}</span>
                            {tc.executionTimeMs && (
                              <span className="text-slate-400 text-[10px]">({tc.executionTimeMs}ms)</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="whitespace-pre-line text-sm text-slate-800">
                    {message.content}
                  </div>

                  {/* Render Table Data if returned by a tool */}
                  {message.tableData && message.tableData.rows?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
                      {message.tableData.caption && (
                        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{message.tableData.caption}</span>
                        </div>
                      )}
                      <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            {message.tableData.headers.map((h, i) => (
                              <th key={i} className="p-2.5">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {message.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/70">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 text-slate-800 font-medium">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. SAFE ACCOUNT CHANGE CONFIRMATION CARD */}
                {message.actionProposal && (
                  <div className="bg-white rounded-3xl border-2 border-slate-900 p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                            Proposed Google Ads Change · Explicit Approval Required
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            No modifications will occur in Google Ads until you approve
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          message.actionProposal.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : message.actionProposal.status === 'EXECUTED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : message.actionProposal.status === 'DECLINED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {message.actionProposal.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Affected Campaign: </span>
                        <button
                          onClick={() => handleCampaignClick(message.actionProposal!.campaignName)}
                          className="font-bold text-slate-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{message.actionProposal.campaignName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Current Settings
                          </span>
                          <span className="font-mono text-slate-800 font-semibold">
                            {message.actionProposal.currentSettings}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-[#00a85e] uppercase tracking-wider block">
                            Proposed Modifications
                          </span>
                          <span className="font-mono text-slate-950 font-bold">
                            {message.actionProposal.proposedChanges}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">Optimization Reason: </span>
                        <span className="text-slate-600">{message.actionProposal.reason}</span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">Performance Evidence: </span>
                        <span className="font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {message.actionProposal.evidence}
                        </span>
                      </div>

                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Potential Risks:</strong> {message.actionProposal.potentialRisks}
                        </span>
                      </div>
                    </div>

                    {/* Result state if already handled */}
                    {message.actionProposal.executionResult && (
                      <div
                        className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                          message.actionProposal.status === 'EXECUTED'
                            ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                            : message.actionProposal.status === 'DECLINED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-rose-50 text-rose-950 border border-rose-300'
                        }`}
                      >
                        {message.actionProposal.status === 'EXECUTED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : message.actionProposal.status === 'DECLINED' ? (
                          <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{message.actionProposal.executionResult}</span>
                      </div>
                    )}

                    {/* Action Execution Buttons */}
                    {message.actionProposal.status === 'PENDING_APPROVAL' && (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleApproveProposal(message.actionProposal!, message.id)}
                          disabled={executingProposalId === message.actionProposal.id}
                          className="px-5 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-50 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                        >
                          {executingProposalId === message.actionProposal.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                          )}
                          <span>
                            {executingProposalId === message.actionProposal.id
                              ? 'Executing in Google Ads...'
                              : 'Approve & Execute Change'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleDeclineProposal(message.actionProposal!.id, message.id)}
                          disabled={executingProposalId === message.actionProposal.id}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-2xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 text-slate-500" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Footer: Timestamp & Model */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                  <span>{message.timestamp}</span>
                  {!isUser && message.modelUsed && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{message.modelUsed}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3.5 max-w-2xl mr-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] border border-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin text-[#00d67d]" />
            </div>
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs text-xs text-slate-600 flex items-center gap-3">
              <span>Querying account data and executing optimization tools...</span>
              <button
                onClick={handleCancelRequest}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Prompt Suggestions Carousel (Shown when few messages) */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-6 py-2 bg-slate-50/50 border-t border-slate-200/80 overflow-x-auto shrink-0">
          <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Quick Prompts
          </div>
          <div className="flex gap-2">
            {promptSuggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-slate-300"
                >
                  <Icon className="w-3 h-3 text-[#00a85e]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Chat Input Bar */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about your campaigns, search terms, wasted spend, or request a budget change..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d]/40 focus:bg-white transition-all"
            disabled={isLoading}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={handleCancelRequest}
              className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-5 py-3 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-slate-950" />
            </button>
          )}
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>
            Read-only queries execute instantly. Consequential campaign changes always require approval.
          </span>
          <span className="font-mono text-slate-400">
            Tier: {modelTier.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
