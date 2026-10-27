'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Send,
  Square,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Layers,
  Sparkles,
  ExternalLink,
  Sliders,
  History,
  MessageSquare,
  Search,
  Zap,
} from 'lucide-react';
import { ChatMarkdown } from './markdown-renderer';
import { DeepSeekIcon, ChatGPTIcon, GeminiIcon } from '@/components/ui/ai-model-icons';
import { useClickOutside } from '@/hooks/use-click-outside';
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
  InteractiveRecommendationCard,
  AnalysisSummaryDetail,
} from '@/types/adoptimize';

export type ActiveAiModel = 'deepseek' | 'chatgpt' | 'gemini';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ActiveAiModel;
  messages: ChatMessage[];
}

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

const WELCOME_TEXT = `Your Google Ads Assistant

Hi! I can help you understand your campaign performance, find wasted spend, and identify opportunities to improve your results.

Ask a question, investigate a campaign, or get recommendations for your advertising budget.

What would you like to investigate?`;

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
  // Model selector: DeepSeek, ChatGPT, Gemini
  const [selectedModel, setSelectedModel] = useState<ActiveAiModel>('deepseek');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useClickOutside<HTMLDivElement>(() => setShowModelDropdown(false), showModelDropdown);

  // Conversation history / Sessions
  const storageKey = useMemo(() => `adoptimize_chat_sessions_${userId || 'guest'}`, [userId]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  // Active message input & streaming/loading
  const [inputValue, setInputValue] = useState('');
  const [preservedDraft, setPreservedDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const [expandedAnalysisIds, setExpandedAnalysisIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Initialize or load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setSelectedModel(parsed[0].model || 'deepseek');
          return;
        }
      }
    } catch {
      // fallback
    }

    // Default initial session
    const initialSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Performance Analysis',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'deepseek',
      messages: [
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: WELCOME_TEXT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Google Ads Assistant',
        },
      ],
    };

    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
  }, [storageKey]);

  // Persist sessions
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
    } catch {
      // storage unavailable
    }
  };

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;
  }, [sessions, currentSessionId]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  // Scroll to bottom only if user was already near bottom
  const scrollToBottomIfAppropriate = (force = false) => {
    if (force || isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottomIfAppropriate();
  }, [messages, isLoading, loadingStep]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputValue]);

  // Simulate realistic progress steps during analysis
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    setLoadingStep(1); // "Retrieving campaign data"
    const timer1 = setTimeout(() => {
      setLoadingStep(2); // "Comparing results"
    }, 1200);

    const timer2 = setTimeout(() => {
      setLoadingStep(3); // "Preparing recommendations"
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  // Primary 4 quick suggestions
  const primarySuggestions = [
    {
      label: 'Find Wasted Spend',
      prompt: 'Analyze my Google Ads account and tell me what is wasting money.',
      icon: TrendingDown,
    },
    {
      label: 'Analyze My Campaigns',
      prompt: 'Analyze all my active campaigns and give me a clear performance breakdown with metrics and recommendations.',
      icon: Layers,
    },
    {
      label: 'Improve My Budget',
      prompt: 'Recommend how to redistribute my daily budget across campaigns to maximize conversions and ROAS.',
      icon: TrendingUp,
    },
    {
      label: 'Explain Performance Changes',
      prompt: 'Compare my current performance against the previous period and explain what changed and why.',
      icon: Sliders,
    },
  ];

  const secondarySuggestions = [
    {
      label: 'Inspect Search Term Leakage',
      prompt: 'Find search terms with high spend and zero conversions and recommend negative keywords.',
      icon: Search,
    },
    {
      label: 'Identify Underperforming Campaigns',
      prompt: 'List campaigns operating with high CPA or low ROAS and propose corrective actions.',
      icon: AlertTriangle,
    },
    {
      label: 'Recent Change History',
      prompt: 'Show me recent changes and budget modifications in my account audit log.',
      icon: History,
    },
  ];

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setPreservedDraft(query);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active session messages
    const updatedMessages = [...messages, userMessage];
    const isFirstUserMessage = messages.filter((m) => m.role === 'user').length === 0;

    let updatedSessionTitle = currentSession?.title || 'Performance Analysis';
    if (isFirstUserMessage) {
      // Auto-title session from first query
      updatedSessionTitle = query.length > 32 ? `${query.slice(0, 32)}...` : query;
    }

    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          title: updatedSessionTitle,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setIsLoading(true);
    scrollToBottomIfAppropriate(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          model: selectedModel,
          modelTier: selectedModel,
          conversationHistory: updatedMessages.map((m) => ({
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
        actionProposal: data.actionProposal,
        recommendations: data.recommendations,
        analysisDetails: data.analysisDetails,
        tableData: data.tableData,
        modelUsed: data.modelUsed,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      saveSessions(
        sessions.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: finalMessages, updatedAt: Date.now() }
            : s
        )
      );
      setPreservedDraft('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const cancelledMessage: ChatMessage = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'Analysis was stopped.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        saveSessions(
          sessions.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...updatedMessages, cancelledMessage] }
              : s
          )
        );
      } else {
        setErrorMessage(err.message || 'Unable to complete request. Please try again or switch model.');
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      scrollToBottomIfAppropriate(true);
    }
  };

  const handleStopRequest = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleRetryFailedDraft = () => {
    if (preservedDraft) {
      setInputValue(preservedDraft);
      setErrorMessage(null);
    }
  };

  // Start a fresh new conversation session
  const handleNewConversation = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: WELCOME_TEXT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Google Ads Assistant',
        },
      ],
    };

    const nextSessions = [newSession, ...sessions];
    saveSessions(nextSessions);
    setCurrentSessionId(newSession.id);
    setErrorMessage(null);
    setInputValue('');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      handleNewConversation();
    } else {
      saveSessions(remaining);
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
    }
  };

  const handleRenameSession = (id: string) => {
    if (!editingSessionTitle.trim()) return;
    saveSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, title: editingSessionTitle.trim() } : s
      )
    );
    setEditingSessionId(null);
    setEditingSessionTitle('');
  };

  // Safe Account Change Execution
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

      if (resData.data?.updatedCampaign && onMutateCampaign) {
        onMutateCampaign(resData.data.updatedCampaign, resData.data.auditLog);
      }

      saveSessions(
        sessions.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((msg) => {
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
              }),
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      saveSessions(
        sessions.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((msg) => {
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
              }),
            };
          }
          return s;
        })
      );
    } finally {
      setExecutingProposalId(null);
    }
  };

  const handleDeclineProposal = (proposalId: string, messageId: string) => {
    saveSessions(
      sessions.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: s.messages.map((msg) => {
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
            }),
          };
        }
        return s;
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

  const toggleAnalysisDetails = (msgId: string) => {
    setExpandedAnalysisIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Model options: DeepSeek, ChatGPT, Gemini
  const aiModelDetails: Record<ActiveAiModel, { label: string; sub: string; badge: string; icon: any }> = {
    deepseek: {
      label: 'DeepSeek',
      sub: 'Advanced analytical reasoning & CPA math',
      badge: 'DeepSeek R1/V3',
      icon: DeepSeekIcon,
    },
    chatgpt: {
      label: 'ChatGPT',
      sub: 'PPC strategy & ad copy analysis',
      badge: 'OpenAI GPT-4o',
      icon: ChatGPTIcon,
    },
    gemini: {
      label: 'Gemini',
      sub: 'Fast SearchStream auction diagnostics',
      badge: 'Google Gemini 2.5',
      icon: GeminiIcon,
    },
  };

  const isInitialState = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200/80 bg-slate-50/70 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.svg"
            alt="AdOptimize AI"
            width={34}
            height={34}
            className="w-8 h-8 rounded-xl object-contain shadow-xs shadow-[#00d67d]/20"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">AI Chat Assistant</h2>
              {/* Connected Google Ads account indicator - Professional without raw CID repetition */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d67d] animate-pulse" />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[180px]">
                  {account?.accountName || 'Google Ads Account'}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded font-bold">
                  Connected
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Interactive Google Ads optimization &amp; real-time performance diagnostics
            </p>
          </div>
        </div>

        {/* Right Controls: Model Selector (DeepSeek, ChatGPT, Gemini) + Session Manager + New Chat */}
        <div className="flex items-center gap-2.5">
          {/* Explicit Model Selector: DeepSeek, ChatGPT, Gemini */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer"
              title="Select AI model"
            >
              <span className="text-[11px] font-normal text-slate-500">Model:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                {(() => {
                  const Icon = aiModelDetails[selectedModel].icon;
                  return <Icon className="w-3.5 h-3.5" />;
                })()}
                <span>{aiModelDetails[selectedModel].label}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                {(['deepseek', 'chatgpt', 'gemini'] as ActiveAiModel[]).map((mKey) => {
                  const meta = aiModelDetails[mKey];
                  const Icon = meta.icon;
                  const isSelected = selectedModel === mKey;
                  return (
                    <button
                      key={mKey}
                      onClick={() => {
                        setSelectedModel(mKey);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-[#00d67d]/10 border border-[#00d67d]/30 text-slate-950 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="p-1 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{meta.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{meta.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{meta.sub}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00a85e] shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversations Drawer Toggle */}
          <button
            onClick={() => setShowSessionsDrawer((p) => !p)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              showSessionsDrawer
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Conversation history"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">History ({sessions.length})</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleNewConversation}
            className="px-3.5 py-1.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Start fresh conversation"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Side History Drawer (if open) */}
      {showSessionsDrawer && (
        <div className="absolute top-[61px] right-0 bottom-0 w-80 bg-white border-l border-slate-200 z-30 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Saved Conversations
            </span>
            <button
              onClick={() => setShowSessionsDrawer(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSessionId;
              const isEditing = editingSessionId === sess.id;

              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    if (!isEditing) {
                      setCurrentSessionId(sess.id);
                      setShowSessionsDrawer(false);
                    }
                  }}
                  className={`group p-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingSessionTitle}
                        onChange={(e) => setEditingSessionTitle(e.target.value)}
                        className="px-2 py-1 text-xs bg-white text-slate-900 border rounded-lg flex-1 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSession(sess.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                      />
                      <button
                        onClick={() => handleRenameSession(sess.id)}
                        className="p-1 text-emerald-400 hover:text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{sess.title}</div>
                        <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                          {new Date(sess.updatedAt).toLocaleDateString()} · {sess.messages.length} messages
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(sess.id);
                            setEditingSessionTitle(sess.title);
                          }}
                          className="p-1 hover:text-slate-200 text-slate-400 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 hover:text-rose-400 text-slate-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                handleNewConversation();
                setShowSessionsDrawer(false);
              }}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start New Conversation</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Conversation Area */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30"
      >
        {/* Render Conversation Messages */}
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isAnalysisExpanded = expandedAnalysisIds.has(message.id);

          return (
            <div
              key={message.id}
              className={`flex gap-3 max-w-3xl sm:max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              {isUser ? (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  You
                </div>
              ) : (
                <Image
                  src="/icon.svg"
                  alt="AdOptimize AI"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0 shadow-[#00d67d]/20"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Message Bubble & Cards */}
              <div className="space-y-3.5 max-w-[90%] sm:max-w-[85%]">
                {/* Speech Bubble */}
                <div
                  className={`p-4 sm:p-5 rounded-3xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Clean Markdown Response Formatting */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap text-sm text-white font-medium">
                      {message.content}
                    </div>
                  ) : (
                    <ChatMarkdown content={message.content} />
                  )}

                  {/* Expandable "Analysis Details" section explaining data & date ranges examined without internal function names */}
                  {!isUser && message.analysisDetails && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => toggleAnalysisDetails(message.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Analysis Details</span>
                        <span className="text-[10px] text-slate-400">
                          ({message.analysisDetails.campaignsCount || 0} campaigns · {message.analysisDetails.dateRangeExamined})
                        </span>
                        {isAnalysisExpanded ? (
                          <ChevronUp className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>

                      {isAnalysisExpanded && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1.5 animate-in fade-in duration-150">
                          <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">
                            Scope of Evaluation:
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                            {message.analysisDetails.aspectsExamined.map((asp, i) => (
                              <li key={i}>{asp}</li>
                            ))}
                          </ul>
                          <div className="text-[10px] text-slate-400 pt-1">
                            Evaluated against live Google Ads auction data and conversion metrics.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Structured Table if returned */}
                  {message.tableData && message.tableData.rows?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
                      {message.tableData.caption && (
                        <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{message.tableData.caption}</span>
                        </div>
                      )}
                      <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
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

                {/* 4. STRUCTURED INTERACTIVE RECOMMENDATION CARDS */}
                {!isUser && message.recommendations && message.recommendations.length > 0 && (
                  <div className="space-y-2.5">
                    {message.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                {rec.title}
                              </span>
                              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1">
                                <span>Campaign:</span>
                                <button
                                  onClick={() => handleCampaignClick(rec.campaignName)}
                                  className="text-slate-900 hover:text-emerald-700 underline font-extrabold cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <span>{rec.campaignName}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </h4>
                            </div>
                          </div>

                          {rec.metrics?.spend !== undefined && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-medium">Spend</span>
                              <span className="font-mono font-bold text-xs text-rose-600">
                                ${rec.metrics.spend.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          {rec.finding}
                        </p>

                        {/* Interactive Action Buttons */}
                        <div className="pt-1 flex flex-wrap gap-2">
                          {rec.actions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              onClick={() => handleSendMessage(act.prompt)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all hover:border-slate-300 cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Zap className="w-3 h-3 text-[#00a85e]" />
                              <span>{act.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. SAFE ACCOUNT CHANGE CONFIRMATION CARD (For Consequential Modifications) */}
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

                {/* Message Timestamp */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                  <span>{message.timestamp}</span>
                  {!isUser && message.modelUsed && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-slate-500">{message.modelUsed}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 6. Clean Multi-Step Progress Indicator During Execution */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl mr-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#00d67d]" />
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-xs space-y-2 w-full max-w-md">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Analyzing campaign performance...</span>
                <button
                  onClick={handleStopRequest}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Square className="w-3 h-3 fill-rose-600" />
                  <span>Stop</span>
                </button>
              </div>

              {/* Multi-step progress list */}
              <div className="space-y-1.5 text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Retrieving campaign data</span>
                </div>

                <div className="flex items-center gap-2">
                  {loadingStep >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin inline-block shrink-0" />
                  )}
                  <span className={loadingStep >= 2 ? 'text-slate-700' : 'text-slate-400'}>
                    Comparing results
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {loadingStep >= 3 ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin inline-block shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 ml-0.5 shrink-0" />
                  )}
                  <span className={loadingStep >= 3 ? 'text-slate-700' : 'text-slate-400'}>
                    Preparing recommendations
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actionable Error State with Retry */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start justify-between gap-3 max-w-2xl animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Request Encountered an Issue</p>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            {preservedDraft && (
              <button
                onClick={handleRetryFailedDraft}
                className="px-3 py-1.5 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs"
              >
                Restore &amp; Retry
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Suggestions (Visible when starting or toggled) */}
      {isInitialState && !isLoading && (
        <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-200/70 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Suggested Starting Questions
            </span>
            <button
              onClick={() => setShowMoreSuggestions((p) => !p)}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              {showMoreSuggestions ? 'Fewer Suggestions' : 'More Suggestions'}
            </button>
          </div>

          {/* 4 Primary Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {primarySuggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all cursor-pointer shadow-2xs group flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-[#00d67d] group-hover:text-slate-950 transition-colors shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">Click to run analysis</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Additional suggestions when requested */}
          {showMoreSuggestions && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in duration-150">
              {secondarySuggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all cursor-pointer shadow-2xs flex items-center gap-2.5"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Fixed Message Composer Area */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2.5"
        >
          <div className="flex-1 relative bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00d67d]/20 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about your campaigns, find wasted spend, or request an optimization..."
              className="w-full px-4 py-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-36 leading-relaxed"
              disabled={isLoading}
            />
          </div>

          {isLoading ? (
            <button
              type="button"
              onClick={handleStopRequest}
              className="h-[46px] px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Stop response generation"
            >
              <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="h-[46px] px-5 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
              title="Send message (Enter)"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            </button>
          )}
        </form>

        {/* Subtle Safety Note */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>You approve important campaign changes before they&apos;re applied.</span>
          <span className="hidden sm:inline text-[10px]">Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
