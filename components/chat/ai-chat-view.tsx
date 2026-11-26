'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppLoader } from '@/components/ui/app-loader';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Layers,
  ExternalLink,
  Sliders,
  History,
  MessageSquare,
  Search,
  Zap,
  Copy,
} from 'lucide-react';
import { ChatMarkdown } from './markdown-renderer';
import { auth } from '@/lib/firebase';
import {
  loadAccountChatSessions,
  loadChatMessages,
  mergeChatHistory,
  normalizeModel,
  type ActiveAiModel,
  type ChatSession,
} from '@/lib/ai/chat-history';
import { AgentIcon, ClaudeIcon, ChatGPTIcon, GeminiIcon } from '@/components/ui/ai-model-icons';
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
} from '@/types/adoptimize';

function isInterruptedErrorReply(content: string | undefined | null): boolean {
  if (!content) return false;
  return /stopped responding partway through this request/i.test(content);
}

interface FailedAttempt {
  query: string;
  message: string;
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
  userId,
  onMutateCampaign,
  onSelectCampaign,
  onSelectCampaignByName,
}: AiChatViewProps) {
  const [selectedModel, setSelectedModel] = useState<ActiveAiModel>('claude');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useClickOutside<HTMLDivElement>(() => setShowModelDropdown(false), showModelDropdown);
  const sessionsToggleRef = useRef<HTMLButtonElement>(null);
  const sessionsDrawerRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => `adoptimize_chat_sessions_${userId || 'guest'}`, [userId]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isHistoryMutating, setIsHistoryMutating] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReload, setHistoryReload] = useState(0);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const quickPromptsRef = useClickOutside<HTMLDivElement>(() => setShowQuickPrompts(false), showQuickPrompts);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [failedAttempt, setFailedAttempt] = useState<FailedAttempt | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isHistoryBusy = isHistoryLoading || isConversationLoading || isHistoryMutating;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!showSessionsDrawer) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !sessionsToggleRef.current?.contains(target) &&
        !sessionsDrawerRef.current?.contains(target)
      ) {
        setShowSessionsDrawer(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSessionsDrawer(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSessionsDrawer]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const restore = async () => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      let cached: ChatSession[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed: ChatSession[] = JSON.parse(stored);
          if (Array.isArray(parsed)) cached = parsed;
        }
      } catch (error) {
        console.warn('[AI Chat] Browser history cache could not be read:', error);
      }

      setSessions(cached);
      try {
        let restored = cached;
        if (userId) {
          if (auth.currentUser?.uid !== userId) throw new Error('Sign in again to restore your chat history.');
          const idToken = await auth.currentUser.getIdToken();
          restored = await loadAccountChatSessions(idToken, cached, controller.signal);
        }
        if (cancelled) return;
        if (restored.length === 0) {
          restored = [{
            id: `session-${Date.now()}`,
            title: 'New Conversation',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            model: 'claude',
            messages: [],
          }];
        }
        setSessions(restored);
        setCurrentSessionId(restored[0].id);
        setSelectedModel(normalizeModel(restored[0].model));
        try {
          localStorage.setItem(storageKey, JSON.stringify(restored));
        } catch (error) {
          console.warn('[AI Chat] Browser history cache could not be saved:', error);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[AI Chat] Account history could not be restored:', error);
        setHistoryError(error instanceof Error ? error.message : 'Account chat history could not be restored.');
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [storageKey, userId, historyReload]);

  useEffect(() => {
    if (!userId || isHistoryLoading || currentSessionId === 'default') return;
    let cancelled = false;
    const controller = new AbortController();
    const restoreMessages = async () => {
      setIsConversationLoading(true);
      try {
        if (auth.currentUser?.uid !== userId) throw new Error('Sign in again to restore your conversation.');
        const idToken = await auth.currentUser.getIdToken();
        const hydrated = await loadChatMessages(idToken, currentSessionId, controller.signal);
        if (cancelled) return;
        setSessions((current) => {
          const next = current.map((session) => session.id === currentSessionId
            ? { ...session, messages: mergeChatHistory(session.messages, hydrated) }
            : session);
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (error) {
            console.warn('[AI Chat] Restored messages could not be cached:', error);
          }
          return next;
        });
      } catch (error) {
        if (cancelled) return;
        console.error('[AI Chat] Conversation messages could not be restored:', error);
        setHistoryError(error instanceof Error ? error.message : 'Conversation messages could not be restored.');
      } finally {
        if (!cancelled) setIsConversationLoading(false);
      }
    };
    void restoreMessages();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentSessionId, userId, storageKey, isHistoryLoading, historyReload]);

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
    } catch {
      // storage unavailable
    }
  };

  const updateSessions = (updater: (current: ChatSession[]) => ChatSession[]) => {
    setSessions((current) => {
      const updated = updater(current);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // storage unavailable
      }
      return updated;
    });
  };

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;
  }, [sessions, currentSessionId]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      });
    });
  };

  const handleScroll = () => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distanceFromBottom > 160);
  };

  const lastMessage = messages[messages.length - 1];
  const lastMessageSignature = `${currentSessionId}:${messages.length}:${lastMessage?.id || ''}:${lastMessage?.content?.length || 0}`;

  useEffect(() => {
    scrollToBottom('smooth');
  }, [lastMessageSignature, isLoading, failedAttempt]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    setLoadingStep(1);
    const timer1 = setTimeout(() => {
      setLoadingStep(2);
    }, 1100);

    const timer2 = setTimeout(() => {
      setLoadingStep(3);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  const primarySuggestions = [
    {
      label: 'Find Wasted Spend',
      subtitle: 'Spot non-converting clicks & budget leaks',
      prompt: 'Analyze my Google Ads account and tell me what is wasting money.',
      icon: TrendingDown,
    },
    {
      label: 'Analyze My Campaigns',
      subtitle: 'Full metrics breakdown & opportunities',
      prompt: 'Analyze all my active campaigns and give me a clear performance breakdown with metrics and recommendations.',
      icon: Layers,
    },
    {
      label: 'Optimize Daily Budget',
      subtitle: 'Shift spend toward highest-ROAS campaigns',
      prompt: 'Recommend how to redistribute my daily budget across campaigns to maximize conversions and ROAS.',
      icon: TrendingUp,
    },
    {
      label: 'Explain Performance Shifts',
      subtitle: 'Compare current vs previous period deltas',
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

  const handleSendMessage = async (
    textToSend?: string,
    opts?: { isRetry?: boolean }
  ) => {
    const query = (textToSend ?? inputValue).trim();
    if (!query || isLoading || isHistoryBusy || historyError) return;
    const isRetry = Boolean(opts?.isRetry);
    const requestSessionId = currentSessionId;

    setFailedAttempt(null);
    if (!isRetry) {
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    let updatedMessages: ChatMessage[];
    if (isRetry) {
      updatedMessages = [...messages];
      const hasSameLastUserMessage =
        updatedMessages.length > 0 &&
        updatedMessages[updatedMessages.length - 1].role === 'user' &&
        updatedMessages[updatedMessages.length - 1].content.trim() === query;

      if (!hasSameLastUserMessage) {
        updatedMessages.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } else {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updatedMessages = [...messages, userMessage];
    }

    const isFirstUserMessage = messages.filter((m) => m.role === 'user').length === 0;
    let updatedSessionTitle = currentSession?.title || 'Performance Analysis';
    if (isFirstUserMessage) {
      updatedSessionTitle = query.length > 36 ? `${query.slice(0, 36)}...` : query;
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
    scrollToBottom('smooth');

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          model: selectedModel,
          modelTier: selectedModel,
          conversationId: requestSessionId,
          history: updatedMessages
            .filter(
              (m) =>
                (m.role === 'user' || m.role === 'assistant') &&
                !isInterruptedErrorReply(m.content)
            )
            .map((m) => ({
              role: m.role,
              content: m.content || '',
            })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${response.status})`);
      }

      const data = await response.json();

      const serverConversationId = data.conversationId as string | undefined;
      const targetSessionId = serverConversationId || requestSessionId;
      if (serverConversationId && serverConversationId !== requestSessionId) {
        setCurrentSessionId(serverConversationId);
        updateSessions((current) =>
          current.map((s) => (s.id === requestSessionId ? { ...s, id: targetSessionId } : s))
        );
      }

      const proposals: ProposedAccountChange[] = Array.isArray(data.actionProposals)
        ? data.actionProposals
        : data.actionProposal
        ? [data.actionProposal]
        : [];

      const isModelInterrupted =
        Boolean(data.retryable) ||
        (data.stopReason === 'model_error' && proposals.length === 0) ||
        (isInterruptedErrorReply(data.reply) && proposals.length === 0);

      if (isModelInterrupted) {
        setFailedAttempt({
          query,
          message:
            data.error ||
            'The AI model could not finish responding. Nothing in your account was changed.',
        });
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionProposal: proposals[0],
        recommendations: data.recommendations,
        analysisDetails: data.analysisDetails,
        tableData: data.tableData,
        activeCampaign: data.activeCampaign,
        toolCalls: data.toolCalls,
        modelUsed: data.modelUsed,
      };

      const extraCards: ChatMessage[] = proposals.slice(1).map((proposal, index) => ({
        id: `assistant-${Date.now()}-card-${index + 1}`,
        role: 'assistant',
        content: proposal.title ? `Also prepared: ${proposal.title}.` : 'Another change is ready for review.',
        timestamp: assistantMessage.timestamp,
        actionProposal: proposal,
        modelUsed: assistantMessage.modelUsed,
      }));

      const newIds = new Set(proposals.map((proposal) => proposal.proposalId));
      const replacedIds = new Set<string>(
        Array.isArray(data.supersededProposalIds) ? data.supersededProposalIds : []
      );
      const messagesWithSupersession = updatedMessages.map((message) =>
        message.actionProposal &&
        message.actionProposal.status === 'PENDING_APPROVAL' &&
        message.actionProposal.proposalId &&
        !newIds.has(message.actionProposal.proposalId) &&
        replacedIds.has(message.actionProposal.proposalId)
          ? {
              ...message,
              actionProposal: {
                ...message.actionProposal,
                status: 'SUPERSEDED' as const,
                executionResult: 'Replaced by a newer version of this proposal.',
              },
            }
          : message
      );

      const finalMessages = [...messagesWithSupersession, assistantMessage, ...extraCards];
      updateSessions((current) =>
        current.map((s) =>
          s.id === requestSessionId || s.id === targetSessionId
            ? { ...s, id: targetSessionId, messages: finalMessages, updatedAt: Date.now(), persisted: true }
            : s
        )
      );
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'AbortError') {
        const cancelledMessage: ChatMessage = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'Response generation was stopped.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        updateSessions((current) =>
          current.map((s) =>
            s.id === requestSessionId
              ? { ...s, messages: [...updatedMessages, cancelledMessage] }
              : s
          )
        );
      } else {
        setFailedAttempt({
          query,
          message:
            errorObj?.message ||
            'Unable to complete request. No Google Ads changes were made.',
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      scrollToBottom('smooth');
    }
  };

  const handleStopRequest = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleRetryNow = () => {
    if (!failedAttempt || isLoading) return;
    void handleSendMessage(failedAttempt.query, { isRetry: true });
  };

  const handleRegenerateLastResponse = () => {
    if (isLoading) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;
    const actualUserIndex = messages.length - 1 - lastUserIndex;
    const lastUserPrompt = messages[actualUserIndex]?.content?.trim();
    if (!lastUserPrompt) return;

    const trimmedMessages = messages.slice(0, actualUserIndex + 1);
    updateSessions((current) =>
      current.map((s) =>
        s.id === currentSessionId ? { ...s, messages: trimmedMessages } : s
      )
    );
    void handleSendMessage(lastUserPrompt, { isRetry: true });
  };

  const mutateAccountHistory = async (method: 'PATCH' | 'DELETE', id?: string, title?: string) => {
    if (!userId || auth.currentUser?.uid !== userId) {
      throw new Error('Sign in again to update your account chat history.');
    }
    const idToken = await auth.currentUser.getIdToken();
    const query = method === 'DELETE'
      ? (id ? `?conversationId=${encodeURIComponent(id)}` : '?all=true')
      : '';
    const response = await fetch(`/api/ai/conversations${query}`, {
      method,
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      ...(method === 'PATCH' ? { body: JSON.stringify({ conversationId: id, title }) } : {}),
    });
    if (!response.ok) {
      const data: { error?: string } = await response.json();
      throw new Error(data.error || 'Account chat history could not be updated.');
    }
  };

  const handleClearHistory = async () => {
    if (isLoading || isHistoryBusy) return;
    setIsHistoryMutating(true);
    try {
      await mutateAccountHistory('DELETE');
    } catch (error) {
      console.error('[AI Chat] Clearing account history failed:', error);
      setHistoryError(error instanceof Error ? error.message : 'Account history could not be cleared.');
      return;
    } finally {
      setIsHistoryMutating(false);
    }
    const freshSession: ChatSession = {
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
    saveSessions([freshSession]);
    setCurrentSessionId(freshSession.id);
    setFailedAttempt(null);
    setConfirmClearHistory(false);
    setSearchQuery('');
  };

  const getSessionPreview = (sess: ChatSession): string => {
    const reversed = [...sess.messages].reverse();
    const meaningful =
      reversed.find((m) => m.role === 'user' && m.content.trim()) ||
      reversed.find((m) => m.content.trim() && m.content !== WELCOME_TEXT);
    if (!meaningful) return 'Start asking about campaigns, spend, or optimizations';
    return meaningful.content.replace(/[#*`>\n]+/g, ' ').trim();
  };

  const handleEditFailedPrompt = () => {
    if (!failedAttempt) return;
    setInputValue(failedAttempt.query);
    setFailedAttempt(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleNewConversation = () => {
    if (isLoading || isHistoryBusy) return;
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

    updateSessions((current) => [newSession, ...current]);
    setCurrentSessionId(newSession.id);
    setFailedAttempt(null);
    setInputValue('');
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || isHistoryBusy) return;
    setIsHistoryMutating(true);
    try {
      await mutateAccountHistory('DELETE', id);
    } catch (error) {
      console.error('[AI Chat] Deleting account conversation failed:', error);
      setHistoryError(error instanceof Error ? error.message : 'Conversation could not be deleted.');
      return;
    } finally {
      setIsHistoryMutating(false);
    }
    setFailedAttempt(null);
    const remaining = sessions.filter((s) => s.id !== id);
    const nextCurrentId = currentSessionId === id ? remaining[0]?.id : currentSessionId;
    if (remaining.length > 0) {
      saveSessions(remaining);
      if (currentSessionId === id) setCurrentSessionId(nextCurrentId);
      return;
    }

    const emptySession: ChatSession = {
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
    saveSessions([emptySession]);
    setCurrentSessionId(emptySession.id);
  };

  const handleRenameSession = async (id: string) => {
    if (!editingSessionTitle.trim() || isLoading || isHistoryBusy) return;
    const session = sessions.find((item) => item.id === id);
    if (session?.persisted || session?.messages.some((message) => message.role === 'user')) {
      setIsHistoryMutating(true);
      try {
        await mutateAccountHistory('PATCH', id, editingSessionTitle.trim());
      } catch (error) {
        console.error('[AI Chat] Renaming account conversation failed:', error);
        setHistoryError(error instanceof Error ? error.message : 'Conversation could not be renamed.');
        return;
      } finally {
        setIsHistoryMutating(false);
      }
    }
    updateSessions((current) =>
      current.map((s) =>
        s.id === id ? { ...s, title: editingSessionTitle.trim() } : s
      )
    );
    setEditingSessionId(null);
    setEditingSessionTitle('');
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const handleApproveProposal = async (proposal: ProposedAccountChange, messageId: string) => {
    if (!proposal || !proposal.actionType || !proposal.proposalId || !proposal.revision || !proposal.payloadHash) {
      updateSessions((current) =>
        current.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((msg) =>
                  msg.id === messageId && msg.actionProposal
                    ? {
                        ...msg,
                        actionProposal: {
                          ...msg.actionProposal,
                          status: 'FAILED',
                          executionResult:
                            'This approval is no longer valid. Request the action again and approve the latest card.',
                        },
                      }
                    : msg
                ),
              }
            : s
        )
      );
      return;
    }

    if (
      proposal.destructive &&
      typeof window !== 'undefined' &&
      !window.confirm(
        `This change stops delivery or removes something in your live account:\n\n${proposal.proposedChanges}\n\nDo you want to approve it?`
      )
    ) {
      return;
    }

    setExecutingProposalId(proposal.id);

    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };

      const approvalResponse = await fetch('/api/ai/chat/approve', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          proposal_id: proposal.proposalId || proposal.id,
          revision: proposal.revision,
          payload_hash: proposal.payloadHash,
          acknowledge_risk: Boolean(proposal.destructive),
        }),
      });
      const approvalData = await approvalResponse.json();
      if (!approvalResponse.ok) {
        throw new Error(
          approvalResponse.status === 404
            ? 'This proposal expired or is from a previous server session. Ask the AI to prepare this change again.'
            : approvalData.error || 'This proposal is no longer pending approval.'
        );
      }

      const response = await fetch('/api/ai/chat/execute', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          proposal_id: proposal.proposalId || proposal.id,
          revision: proposal.revision,
          payload_hash: proposal.payloadHash,
        }),
      });

      const resData = await response.json();
      const unverified = resData.status === 'executed_unverified';
      if (!unverified && (!response.ok || !resData.success)) {
        throw new Error(resData.error || resData.message || 'Failed to execute Google Ads change.');
      }

      if (resData.data?.updatedCampaign && onMutateCampaign) {
        onMutateCampaign(resData.data.updatedCampaign, resData.data.auditLog);
      }

      updateSessions((current) =>
        current.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((msg) => {
                if (msg.id === messageId && msg.actionProposal) {
                  const createdCampaignId = resData.data?.campaignId;
                  return {
                    ...msg,
                    actionProposal: {
                      ...msg.actionProposal,
                      status: unverified ? 'EXECUTED_UNVERIFIED' : 'EXECUTED',
                      ...(createdCampaignId
                        ? { campaignId: String(createdCampaignId) }
                        : {}),
                      executionResult:
                        resData.message || 'Change successfully verified and executed in Google Ads.',
                      appliedAt: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
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
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      updateSessions((current) =>
        current.map((s) => {
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
                      executionResult:
                        errorObj?.message || 'Execution failed. No changes were confirmed.',
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

  const handleDeclineProposal = async (proposalId: string, messageId: string) => {
    let declineError: string | undefined;
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const response = await fetch('/api/ai/chat/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: 'Bearer ' + idToken } : {}),
        },
        body: JSON.stringify({ proposal_id: proposalId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        declineError = data.error || 'The proposal could not be declined.';
      }
    } catch {
      declineError = 'The proposal could not be declined. Check your connection and try again.';
    }
    if (declineError) {
      setFailedAttempt({
        query: '',
        message: declineError,
      });
      return;
    }
    updateSessions((current) =>
      current.map((s) => {
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

  const aiModelDetails: Record<ActiveAiModel, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    claude: { label: 'Claude', icon: ClaudeIcon },
    chatgpt: { label: 'ChatGPT', icon: ChatGPTIcon },
    gemini: { label: 'Gemini', icon: GeminiIcon },
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const isInitialState = !hasUserMessages;
  const isConnectedAccount = Boolean(
    account?.isConnected && account.clientCustomerId !== 'Not Connected'
  );

  const ActiveModelMeta = aiModelDetails[selectedModel];
  const ActiveModelIcon = ActiveModelMeta.icon;

  const loadingStageLabel =
    loadingStep >= 3
      ? 'Drafting recommendations'
      : loadingStep >= 2
      ? 'Reviewing campaign performance'
      : 'Analyzing your request';

  const visibleMessages = useMemo(() => {
    const base = messages.filter(
      (m) => !(m.id.startsWith('welcome') && hasUserMessages && m.content === WELCOME_TEXT)
    );
    const term = searchQuery.trim().toLowerCase();
    if (!term) return base;
    return base.filter(
      (m) =>
        m.content.toLowerCase().includes(term) ||
        m.actionProposal?.campaignName?.toLowerCase().includes(term) ||
        m.actionProposal?.proposedChanges?.toLowerCase().includes(term)
    );
  }, [messages, hasUserMessages, searchQuery]);

  const canRegenerate =
    hasUserMessages &&
    !isLoading &&
    !failedAttempt &&
    !searchQuery.trim() &&
    visibleMessages.length > 0 &&
    visibleMessages[visibleMessages.length - 1]?.role === 'assistant';

  const renderHistoryList = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3.5 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-950 tracking-tight">History</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            {sessions.length}
          </span>
          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => setShowSessionsDrawer(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              aria-label="Close history"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.map((sess) => {
          const isCurrent = sess.id === currentSessionId;
          const isEditing = editingSessionId === sess.id;
          const preview = getSessionPreview(sess);

          return (
            <div
              key={sess.id}
              onClick={() => {
                if (!isEditing && !isLoading && !isHistoryBusy) {
                  setCurrentSessionId(sess.id);
                  setSelectedModel(normalizeModel(sess.model));
                  setShowSessionsDrawer(false);
                  setFailedAttempt(null);
                  setSearchQuery('');
                }
              }}
              className={`group p-3 rounded-xl text-xs transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-white border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.06)]'
                  : 'bg-transparent border-transparent hover:bg-white/80 hover:border-slate-200/60'
              }`}
            >
              {isEditing ? (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editingSessionTitle}
                    onChange={(e) => setEditingSessionTitle(e.target.value)}
                    className="px-2 py-1 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg flex-1 outline-none focus:border-[#6D28D9]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSession(sess.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameSession(sess.id)}
                    className="p-1 text-[#B45309] hover:text-[#B45309] cursor-pointer"
                    aria-label="Save title"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-1 w-3 h-3 rounded-[4px] shrink-0 flex items-center justify-center transition-colors ${
                      isCurrent
                        ? 'bg-[#6D28D9] border border-[#5B21B6]'
                        : 'border border-slate-300 bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {isCurrent && <span className="w-1 h-1 rounded-full bg-slate-950" />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className={`truncate text-xs ${
                          isCurrent ? 'font-semibold text-slate-950' : 'font-medium text-slate-800'
                        }`}
                      >
                        {sess.title}
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(sess.id);
                            setEditingSessionTitle(sess.title);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          title="Rename conversation"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mt-1">
                      {preview}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200/80 bg-white shrink-0">
        {confirmClearHistory ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Confirm clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearHistory(false)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClearHistory(true)}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear history</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-118px)] min-h-[600px] bg-white rounded-2xl border border-slate-200/85 shadow-[0_2px_16px_rgba(15,23,42,0.04)] overflow-hidden relative">
      {/* Main Left/Center Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* 1. Clean Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200/80 bg-white gap-3 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <AgentIcon className="w-8 h-8 rounded-xl shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-950 tracking-tight whitespace-nowrap">
                  AI Marketing Agent
                </h2>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-xs text-slate-500 font-medium truncate max-w-[170px] sm:max-w-[240px]">
                  {account?.accountName || 'Google Ads Account'} ·{' '}
                  <span className={isConnectedAccount ? 'text-[#B45309] font-semibold' : 'text-amber-700 font-semibold'}>
                    {isConnectedAccount ? 'Connected' : 'Offline'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Functional Controls (Search, Model Switcher, Mobile/Collapsed History, New Chat) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Conversation Search */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 focus-within:border-[#6D28D9] focus-within:bg-white rounded-xl transition-colors w-44 lg:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chat..."
                aria-label="Search current conversation"
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => setShowModelDropdown((p) => !p)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Select AI model"
              >
                <ActiveModelIcon className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-900">{ActiveModelMeta.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-40">
                  {(['claude', 'chatgpt', 'gemini'] as ActiveAiModel[]).map((mKey) => {
                    const meta = aiModelDetails[mKey];
                    const Icon = meta.icon;
                    const isSelected = normalizeModel(selectedModel) === mKey;
                    return (
                      <button
                        type="button"
                        key={mKey}
                        onClick={() => {
                          setSelectedModel(mKey);
                          updateSessions((current) =>
                            current.map((session) =>
                              session.id === currentSessionId ? { ...session, model: mKey } : session
                            )
                          );
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-[#FFFBEB]/90 text-slate-950 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs flex-1">{meta.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#92400E] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History Toggle (Always on mobile/tablet, and on desktop when docked rail is collapsed) */}
            <button
              type="button"
              ref={sessionsToggleRef}
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setIsHistoryCollapsed(false);
                } else {
                  setShowSessionsDrawer((p) => !p);
                }
              }}
              className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition-colors cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isHistoryCollapsed ? 'flex' : 'flex lg:hidden'
              } ${
                showSessionsDrawer
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
              }`}
              title="Conversation history"
            >
              <MessageSquare className="w-3.5 h-3.5 opacity-75" />
              <span className="hidden sm:inline">History</span>
              <span className="tabular-nums text-[11px] opacity-70">{sessions.length}</span>
            </button>

            {/* Primary AdOptimize CTA */}
            <button
              type="button"
              onClick={handleNewConversation}
              className="px-3.5 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Start fresh conversation"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {isHistoryBusy && (
          <div className="px-4 py-2 text-xs text-slate-500" role="status">
            {isHistoryMutating ? 'Saving account history...' : 'Loading account chat history...'}
          </div>
        )}
        {historyError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 text-amber-900 text-xs" role="alert">
            <span>{historyError} Please retry before continuing.</span>
            <button type="button" onClick={() => setHistoryReload((current) => current + 1)}
              className="font-semibold underline shrink-0 cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* 2. Conversation Stream Viewport */}
        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 bg-[#f8fafc] relative"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {searchQuery.trim() && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600">
                <span>
                  Showing <strong className="text-slate-950 tabular-nums">{visibleMessages.length}</strong>{' '}
                  {visibleMessages.length === 1 ? 'message' : 'messages'} matching &ldquo;{searchQuery}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#B45309] hover:text-[#92400E] font-semibold cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Empty / Initial Welcome Canvas */}
            {isInitialState && !isLoading && !isHistoryBusy ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="py-6 sm:py-10 space-y-7"
              >
                <div className="text-center space-y-2.5 max-w-xl mx-auto">
                  <AgentIcon className="w-12 h-12 rounded-2xl mx-auto mb-3" />
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 [text-wrap:balance]">
                    What would you like to investigate?
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Diagnose wasted ad spend, compare period deltas, inspect search terms, or prepare Google Ads updates with explicit approval before any change runs.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-semibold text-slate-500">
                      Suggested Starting Points
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMoreSuggestions((p) => !p)}
                      className="text-xs text-[#B45309] hover:text-[#92400E] font-semibold cursor-pointer"
                    >
                      {showMoreSuggestions ? 'Show fewer' : 'More prompts'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {primarySuggestions.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => void handleSendMessage(item.prompt)}
                          className="p-4 bg-white hover:border-[#6D28D9] border border-slate-200/85 rounded-2xl text-left transition-all cursor-pointer group flex items-start gap-3 shadow-[0_1px_4px_rgba(15,23,42,0.03)]"
                        >
                          <div className="p-2 rounded-xl bg-[#FFFBEB] text-[#B45309] group-hover:bg-[#6D28D9] group-hover:text-white transition-colors shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-950">{item.label}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {item.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {showMoreSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 overflow-hidden"
                      >
                        {secondarySuggestions.map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => void handleSendMessage(item.prompt)}
                              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/85 hover:border-slate-300 rounded-xl text-left transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                            >
                              <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-800 truncate">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              /* Active Conversation Thread */
              visibleMessages.map((message) => {
                const isUser = message.role === 'user';
                const modelName = message.modelUsed?.toLowerCase();
                const modelMeta = modelName === 'claude' || modelName === 'chatgpt' || modelName === 'gemini'
                  ? aiModelDetails[modelName]
                  : null;
                const MsgIcon = modelMeta?.icon || AgentIcon;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      <div className="max-w-[84%] sm:max-w-[74%] space-y-1.5">
                        <div className="px-4 py-3 rounded-2xl rounded-br-xs bg-slate-950 text-white shadow-xs">
                          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white">
                            {message.content}
                          </div>
                        </div>
                        <div className="flex justify-end px-1 text-[11px] text-slate-400 tabular-nums">
                          {message.timestamp}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Elevated Assistant Card inspired by pro split-pane UI */}
                        <div className="bg-white rounded-2xl border border-slate-200/85 shadow-[0_2px_12px_rgba(15,23,42,0.035)] overflow-hidden">
                          <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-[#6D28D9]/[0.06] via-white to-white flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0">
                                <MsgIcon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {message.modelUsed || ActiveModelMeta.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                              {message.timestamp}
                            </span>
                          </div>

                          <div className="px-4 sm:px-5 py-4">
                            <ChatMarkdown content={message.content} />
                          </div>

                          {/* Linked Campaign Action Strip (when campaign context is attached) */}
                          {message.activeCampaign?.name && !message.actionProposal && (
                            <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-slate-800 truncate">
                                Campaign context: <strong className="text-slate-950">{message.activeCampaign.name}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCampaignClick(message.activeCampaign!.name)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                              >
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                                <span>View</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Structured Interactive Recommendation Cards */}
                        {message.recommendations && message.recommendations.length > 0 && (
                          <div className="space-y-2.5">
                            {message.recommendations.map((rec) => (
                              <div
                                key={rec.id}
                                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_6px_rgba(15,23,42,0.03)] space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-semibold text-amber-700 block">
                                        {rec.title}
                                      </span>
                                      <h4 className="text-xs font-semibold text-slate-950 flex items-center gap-1">
                                        <span>Campaign:</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCampaignClick(rec.campaignName)}
                                          className="text-slate-900 hover:text-[#B45309] underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                                        >
                                          <span>{rec.campaignName}</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </button>
                                      </h4>
                                    </div>
                                  </div>

                                  {rec.metrics && !Array.isArray(rec.metrics) && rec.metrics.spend !== undefined && (
                                    <div className="text-right tabular-nums">
                                      <span className="text-[10px] text-slate-400 block font-medium">
                                        Spend
                                      </span>
                                      <span className="font-mono font-semibold text-xs text-rose-600">
                                        ${rec.metrics.spend.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {rec.metrics && Array.isArray(rec.metrics) && (
                                    <div className="flex gap-3 tabular-nums">
                                      {rec.metrics.slice(0, 2).map((m, mIdx) => (
                                        <div key={mIdx} className="text-right">
                                          <span className="text-[10px] text-slate-400 block font-medium">
                                            {m.label}
                                          </span>
                                          <span className="font-mono font-semibold text-xs text-slate-800">
                                            {m.value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                  {rec.finding}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  {(rec.actions || rec.recommendedActions || []).map((act, actIdx) => (
                                    <button
                                      type="button"
                                      key={actIdx}
                                      onClick={() => void handleSendMessage(act.prompt)}
                                      disabled={isLoading || isHistoryBusy || Boolean(historyError)}
                                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                      <Zap className="w-3 h-3 text-[#92400E]" />
                                      <span>{act.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Safe Account Change Confirmation Card (No Reason / Evidence) */}
                        {message.actionProposal && (
                          <div className="bg-white rounded-2xl border border-slate-900/90 p-4 sm:p-5 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-950">
                                    Confirm Google Ads Action
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    Review details before applying this change to your account
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                                  message.actionProposal.status === 'PENDING_APPROVAL'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : message.actionProposal.status === 'EXECUTED'
                                    ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                                    : message.actionProposal.status === 'EXECUTED_UNVERIFIED'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                    : message.actionProposal.status === 'APPROVED'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : message.actionProposal.status === 'DECLINED' ||
                                      message.actionProposal.status === 'SUPERSEDED' ||
                                      message.actionProposal.status === 'EXPIRED'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {message.actionProposal.status === 'EXECUTED_UNVERIFIED'
                                  ? 'Applied, unverified'
                                  : message.actionProposal.status
                                      .toLowerCase()
                                      .replace(/_/g, ' ')
                                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                            </div>

                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="font-semibold text-slate-700">Campaign: </span>
                                <button
                                  type="button"
                                  onClick={() => handleCampaignClick(message.actionProposal!.campaignName)}
                                  className="font-semibold text-slate-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{message.actionProposal.campaignName}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-500" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 tabular-nums">
                                <div>
                                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                                    Current Settings
                                  </span>
                                  <span className="font-mono text-slate-800 font-medium whitespace-pre-line">
                                    {message.actionProposal.currentSettings}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-[#92400E] block mb-0.5">
                                    Change to Apply
                                  </span>
                                  <span className="font-mono text-slate-950 font-semibold whitespace-pre-line">
                                    {message.actionProposal.proposedChanges}
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Potential Risks:</strong> {message.actionProposal.potentialRisks}
                                </span>
                              </div>
                            </div>

                            {message.actionProposal.executionResult && (
                              <div
                                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                                  message.actionProposal.status === 'EXECUTED'
                                    ? 'bg-[#FFFBEB] text-[#2E1065] border border-[#FCD34D]'
                                    : message.actionProposal.status === 'EXECUTED_UNVERIFIED'
                                    ? 'bg-amber-50 text-amber-950 border border-amber-300'
                                    : message.actionProposal.status === 'DECLINED' ||
                                      message.actionProposal.status === 'SUPERSEDED' ||
                                      message.actionProposal.status === 'EXPIRED'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-rose-50 text-rose-950 border border-rose-300'
                                }`}
                              >
                                {message.actionProposal.status === 'EXECUTED' ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#B45309] shrink-0" />
                                ) : message.actionProposal.status === 'DECLINED' ||
                                  message.actionProposal.status === 'SUPERSEDED' ||
                                  message.actionProposal.status === 'EXPIRED' ? (
                                  <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{message.actionProposal.executionResult}</span>
                              </div>
                            )}

                            {message.actionProposal.status === 'PENDING_APPROVAL' && (
                              <div className="flex items-center gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => void handleApproveProposal(message.actionProposal!, message.id)}
                                  disabled={executingProposalId === message.actionProposal.id}
                                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                >
                                  {executingProposalId === message.actionProposal.id ? (
                                    <AppLoader className="h-4 w-4" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                                  )}
                                  <span>
                                    {executingProposalId === message.actionProposal.id
                                      ? 'Executing in Google Ads...'
                                      : message.actionProposal.actionType === 'ENABLE_CAMPAIGN'
                                      ? 'Enable campaign'
                                      : message.actionProposal.actionType === 'PAUSE_CAMPAIGN'
                                      ? 'Pause campaign'
                                      : message.actionProposal.actionType === 'CREATE_CAMPAIGN'
                                      ? 'Approve & create campaign'
                                      : message.actionProposal.destructive
                                      ? 'Review impact & approve'
                                      : 'Approve & Execute Change'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleDeclineProposal(message.actionProposal!.id, message.id)}
                                  disabled={executingProposalId === message.actionProposal.id}
                                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                                >
                                  <X className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clean Copy Action Row */}
                        {message.content && (
                          <div className="flex items-center justify-end px-1">
                            <button
                              type="button"
                              onClick={() => void handleCopyMessage(message.id, message.content)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/85 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Copy response"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#B45309]" />
                                  <span className="text-[#B45309]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* 3. Modern AI Thinking & Reasoning Loading Indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="bg-white rounded-2xl border border-slate-200/85 p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.035)] space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AppLoader className="h-6 w-6 shrink-0" />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {loadingStageLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleStopRequest}
                      className="text-[11px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  </div>

                  {/* Shimmer skeleton lines */}
                  <div className="space-y-2 pt-0.5">
                    {['w-11/12', 'w-4/5', 'w-3/5'].map((widthClass, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full bg-slate-100 overflow-hidden relative ${widthClass}`}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FDE68A]/60 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: idx * 0.15,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Actionable Failure Card with Immediate One-Click "Try Again" */}
            <AnimatePresence>
              {failedAttempt && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl border border-rose-200/90 p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-950">
                        Couldn&apos;t complete this response
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {failedAttempt.message}
                      </p>
                    </div>
                  </div>

                  {failedAttempt.query && (
                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <button
                        type="button"
                        onClick={handleRetryNow}
                        className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Try Again</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEditFailedPrompt}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        Edit message
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Centered Regenerate Response Button (inspired by reference UI) */}
            {canRegenerate && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleRegenerateLastResponse}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-700 shadow-2xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Regenerate response</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Floating Jump-to-Latest Button when scrolled up */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => scrollToBottom('smooth')}
                className="sticky bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-950/90 hover:bg-slate-950 text-white rounded-xl text-[11px] font-medium shadow-md flex items-center gap-1.5 cursor-pointer mx-auto z-20"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Scroll to latest</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Modern Docked Composer */}
        <div className="px-4 sm:px-8 py-3.5 border-t border-slate-200/80 bg-white shrink-0 relative">
          <div className="max-w-3xl mx-auto relative">
            {/* Quick Prompts Popover */}
            <AnimatePresence>
              {showQuickPrompts && (
                <motion.div
                  ref={quickPromptsRef}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.14 }}
                  className="absolute bottom-full left-0 mb-2 w-80 max-w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-30 space-y-1"
                >
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    Quick Marketing Prompts
                  </div>
                  {[...primarySuggestions, ...secondarySuggestions].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setShowQuickPrompts(false);
                          void handleSendMessage(item.prompt);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2.5"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                        <span className="text-xs font-medium text-slate-800 truncate flex-1">
                          {item.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-end gap-2 bg-[#f8fafc] rounded-2xl border border-slate-200/90 focus-within:border-[#6D28D9] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#6D28D9]/15 transition-all p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
            >
              <button
                type="button"
                onClick={() => setShowQuickPrompts((p) => !p)}
                disabled={isLoading || isHistoryBusy || Boolean(historyError)}
                className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Quick marketing prompts"
                aria-label="Open quick marketing prompts"
              >
                <Zap className="w-4 h-4 text-[#B45309]" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                enterKeyHint="send"
                onKeyDownCapture={(e) => {
                  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
                  e.preventDefault();
                  if (!e.repeat) e.currentTarget.form?.requestSubmit();
                }}
                placeholder="Ask about your campaigns, find wasted spend, or prepare a change..."
                className="flex-1 px-2.5 py-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-36 leading-relaxed"
                disabled={isLoading || isHistoryBusy || Boolean(historyError)}
              />

              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStopRequest}
                  className="h-9 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Stop response generation"
                >
                  <Square className="w-3 h-3 fill-rose-600 text-rose-600" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isHistoryBusy || Boolean(historyError)}
                  className="h-9 w-9 sm:w-auto sm:px-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Send message (Enter)"
                >
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-3.5 h-3.5 text-slate-950 stroke-[2.25]" />
                </button>
              )}
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
              <span>You review and approve changes before they apply to Google Ads.</span>
              <span className="hidden sm:inline text-[10px]">Enter to send · Shift + Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Docked Collapsible Right History Panel (inspired by reference image) */}
      <aside
        className={`hidden lg:flex flex-col relative shrink-0 border-l border-slate-200/80 bg-[#fafbfc] transition-all duration-200 ${
          isHistoryCollapsed ? 'w-0 border-l-0 overflow-visible' : 'w-72 xl:w-80'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsHistoryCollapsed((prev) => !prev)}
          className="hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm hover:border-slate-300 text-slate-500 hover:text-slate-950 items-center justify-center z-20 cursor-pointer transition-colors"
          title={isHistoryCollapsed ? 'Expand history panel' : 'Collapse history panel'}
          aria-label={isHistoryCollapsed ? 'Expand history panel' : 'Collapse history panel'}
        >
          {isHistoryCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {!isHistoryCollapsed && renderHistoryList(false)}
      </aside>

      {/* Mobile / Tablet Slide-over History Drawer */}
      <AnimatePresence>
        {showSessionsDrawer && (
          <motion.div
            ref={sessionsDrawerRef}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="lg:hidden absolute top-[57px] right-0 bottom-0 w-80 max-w-full bg-[#fafbfc] border-l border-slate-200 z-30 shadow-xl flex flex-col"
          >
            {renderHistoryList(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
