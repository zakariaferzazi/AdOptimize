'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Layers,
  BrainCircuit,
  ExternalLink,
  Sliders,
  History,
  MessageSquare,
  Search,
  Zap,
  Bot,
  Copy,
} from 'lucide-react';
import { ChatMarkdown } from './markdown-renderer';
import { auth } from '@/lib/firebase';
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
} from '@/types/adoptimize';

export type ActiveAiModel = 'deepseek' | 'chatgpt' | 'gemini';

export function normalizeModel(model: string | undefined): ActiveAiModel {
  if (model === 'fast') return 'gemini';
  if (model === 'balanced') return 'chatgpt';
  if (model === 'advanced') return 'deepseek';
  if (model === 'deepseek' || model === 'chatgpt' || model === 'gemini') return model;
  return 'deepseek';
}

function isInterruptedErrorReply(content: string | undefined | null): boolean {
  if (!content) return false;
  return /stopped responding partway through this request/i.test(content);
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ActiveAiModel;
  messages: ChatMessage[];
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
  const [selectedModel, setSelectedModel] = useState<ActiveAiModel>('deepseek');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useClickOutside<HTMLDivElement>(() => setShowModelDropdown(false), showModelDropdown);
  const sessionsToggleRef = useRef<HTMLButtonElement>(null);
  const sessionsDrawerRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => `adoptimize_chat_sessions_${userId || 'guest'}`, [userId]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [failedAttempt, setFailedAttempt] = useState<FailedAttempt | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

    const hydrate = async (sessionId: string) => {
      try {
        const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
        if (!idToken) return;
        const response = await fetch(
          `/api/ai/conversations?conversationId=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        const transcript = Array.isArray(data?.transcript) ? data.transcript : undefined;
        const stored = transcript || (Array.isArray(data?.messages) ? data.messages : []);
        if (cancelled || stored.length === 0) return;

        const proposalsByMessage = new Map<string, ProposedAccountChange>();
        for (const proposal of (Array.isArray(data?.proposals) ? data.proposals : []) as ProposedAccountChange[]) {
          if (proposal.messageId) proposalsByMessage.set(proposal.messageId, proposal);
        }

        const hydrated: ChatMessage[] = stored
          .filter(
            (item: { role: string; content: string | null }) =>
              item.role === 'user' ||
              (item.role === 'assistant' && Boolean(item.content) && !isInterruptedErrorReply(item.content))
          )
          .map((item: { id: string; role: string; content: string | null; createdAt: string }) => ({
            id: item.id,
            role: item.role as 'user' | 'assistant',
            content: item.content || '',
            timestamp: new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            ...(proposalsByMessage.has(item.id) ? { actionProposal: proposalsByMessage.get(item.id) } : {}),
          }));

        if (hydrated.length === 0) return;
        setSessions((current) => {
          const next = current.map((session) =>
            session.id === sessionId ? { ...session, messages: hydrated } : session
          );
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // storage unavailable
          }
          return next;
        });
      } catch {
        // Local cache remains usable when server is unreachable
      }
    };

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setSelectedModel(normalizeModel(parsed[0].model));
          void hydrate(parsed[0].id);
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      // fallback
    }

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
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

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
    if (!query || isLoading) return;
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
            ? { ...s, id: targetSessionId, messages: finalMessages, updatedAt: Date.now() }
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

  const handleEditFailedPrompt = () => {
    if (!failedAttempt) return;
    setInputValue(failedAttempt.query);
    setFailedAttempt(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

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

    updateSessions((current) => [newSession, ...current]);
    setCurrentSessionId(newSession.id);
    setFailedAttempt(null);
    setInputValue('');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleRenameSession = (id: string) => {
    if (!editingSessionTitle.trim()) return;
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

  const aiModelDetails: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    deepseek: { label: 'DeepSeek', icon: DeepSeekIcon },
    chatgpt: { label: 'ChatGPT', icon: ChatGPTIcon },
    gemini: { label: 'Gemini', icon: GeminiIcon },
    fast: { label: 'Gemini', icon: GeminiIcon },
    balanced: { label: 'ChatGPT', icon: ChatGPTIcon },
    advanced: { label: 'DeepSeek', icon: DeepSeekIcon },
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const isInitialState = !hasUserMessages;
  const isConnectedAccount = Boolean(
    account?.isConnected && account.clientCustomerId !== 'Not Connected'
  );

  const ActiveModelMeta = aiModelDetails[normalizeModel(selectedModel)] || aiModelDetails.deepseek;
  const ActiveModelIcon = ActiveModelMeta.icon;

  const loadingStageLabel =
    loadingStep >= 3
      ? 'Drafting recommendations'
      : loadingStep >= 2
      ? 'Reviewing campaign performance'
      : 'Analyzing your request';

  return (
    <div className="flex flex-col h-[calc(100vh-118px)] min-h-[560px] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
      {/* 1. Clean Header Toolbar — No repeated brand logo */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200/80 bg-white gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-950 tracking-tight">
                AI Marketing Agent
              </h2>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-xs text-slate-600 font-medium truncate max-w-[180px] sm:max-w-[260px] flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isConnectedAccount ? 'bg-[#00d67d]' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">{account?.accountName || 'Google Ads Account'}</span>
                <span className="text-slate-400 font-normal">
                  ({isConnectedAccount ? 'Connected' : 'Offline'})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelDropdown((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              title="Select AI model"
            >
              <ActiveModelIcon className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-900">{ActiveModelMeta.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-40">
                {(['deepseek', 'chatgpt', 'gemini'] as ActiveAiModel[]).map((mKey) => {
                  const meta = aiModelDetails[mKey] || aiModelDetails.deepseek;
                  const Icon = meta.icon;
                  const isSelected = normalizeModel(selectedModel) === mKey;
                  return (
                    <button
                      type="button"
                      key={mKey}
                      onClick={() => {
                        setSelectedModel(mKey);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-50/90 text-slate-950 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs flex-1">{meta.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00a85e] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversations Drawer Toggle */}
          <button
            type="button"
            ref={sessionsToggleRef}
            onClick={() => setShowSessionsDrawer((p) => !p)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              showSessionsDrawer
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
            }`}
            title="Conversation history"
          >
            <MessageSquare className="w-3.5 h-3.5 opacity-75" />
            <span className="hidden sm:inline">History</span>
            <span className="tabular-nums text-[11px] opacity-70">({sessions.length})</span>
          </button>

          {/* New Chat */}
          <button
            type="button"
            onClick={handleNewConversation}
            className="px-3 py-1.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Start fresh conversation"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Side History Drawer */}
      <AnimatePresence>
        {showSessionsDrawer && (
          <motion.div
            ref={sessionsDrawerRef}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-[57px] right-0 bottom-0 w-80 bg-white border-l border-slate-200 z-30 shadow-xl flex flex-col"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Conversations
              </span>
              <button
                type="button"
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
                        setFailedAttempt(null);
                      }
                    }}
                    className={`group p-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-slate-900 text-white font-medium'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                          type="button"
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
                          <div
                            className={`text-[10px] mt-0.5 tabular-nums ${
                              isCurrent ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {new Date(sess.updatedAt).toLocaleDateString()} · {sess.messages.length} msgs
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(sess.id);
                              setEditingSessionTitle(sess.title);
                            }}
                            className="p-1 hover:text-slate-200 text-slate-400 rounded cursor-pointer"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="p-1 hover:text-rose-400 text-slate-400 rounded cursor-pointer"
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
                type="button"
                onClick={() => {
                  handleNewConversation();
                  setShowSessionsDrawer(false);
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Conversation</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Conversation Stream Viewport */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-[#fafbfc] relative"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Modern Empty / Initial Welcome Canvas */}
          {isInitialState && !isLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="py-6 sm:py-10 space-y-6"
            >
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-[#00d67d] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                  What would you like to investigate?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ask questions about campaign spend, uncover wasted budget, inspect search terms, or prepare Google Ads optimizations with explicit approval before any change runs.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Suggested Prompts
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMoreSuggestions((p) => !p)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                  >
                    {showMoreSuggestions ? 'Show fewer' : 'More prompts'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {primarySuggestions.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => void handleSendMessage(item.prompt)}
                        className="p-3.5 bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-emerald-300 rounded-2xl text-left transition-all cursor-pointer group flex items-start gap-3 shadow-2xs"
                      >
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-[#00d67d] group-hover:text-slate-950 transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900">{item.label}</div>
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
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 overflow-hidden"
                    >
                      {secondarySuggestions.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => void handleSendMessage(item.prompt)}
                            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl text-left transition-colors cursor-pointer flex items-center gap-2"
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
            messages
              .filter((m) => !(m.id.startsWith('welcome') && hasUserMessages && m.content === WELCOME_TEXT))
              .map((message) => {
                const isUser = message.role === 'user';
                const modelMeta =
                  aiModelDetails[normalizeModel(message.modelUsed?.toLowerCase())] || null;
                const MsgIcon = modelMeta?.icon || Bot;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <MsgIcon className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`space-y-3 min-w-0 ${
                        isUser ? 'max-w-[82%] sm:max-w-[75%]' : 'flex-1 max-w-[92%]'
                      }`}
                    >
                      <div
                        className={`group relative px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-br-xs shadow-2xs'
                            : 'bg-white text-slate-900 border border-slate-200/85 rounded-tl-xs shadow-2xs'
                        }`}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white">
                            {message.content}
                          </div>
                        ) : (
                          <ChatMarkdown content={message.content} />
                        )}
                      </div>

                      {/* Structured Interactive Recommendation Cards */}
                      {!isUser && message.recommendations && message.recommendations.length > 0 && (
                        <div className="space-y-2.5">
                          {message.recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                                      {rec.title}
                                    </span>
                                    <h4 className="text-xs font-semibold text-slate-950 flex items-center gap-1">
                                      <span>Campaign:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCampaignClick(rec.campaignName)}
                                        className="text-slate-900 hover:text-emerald-700 underline font-bold cursor-pointer inline-flex items-center gap-0.5"
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
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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

                      {/* Safe Account Change Confirmation Card */}
                      {message.actionProposal && (
                        <div className="bg-white rounded-2xl border border-slate-900/90 p-4 sm:p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">
                                  Confirm Google Ads Action
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  Review details before applying this change to your account
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                message.actionProposal.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : message.actionProposal.status === 'EXECUTED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : message.actionProposal.status === 'EXECUTED_UNVERIFIED'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400'
                                  : message.actionProposal.status === 'APPROVED'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : message.actionProposal.status === 'DECLINED' ||
                                    message.actionProposal.status === 'SUPERSEDED' ||
                                    message.actionProposal.status === 'EXPIRED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {message.actionProposal.status === 'EXECUTED_UNVERIFIED'
                                ? 'Applied, not yet verified'
                                : message.actionProposal.status.replace(/_/g, ' ')}
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
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                                  Current Settings
                                </span>
                                <span className="font-mono text-slate-800 font-medium whitespace-pre-line">
                                  {message.actionProposal.currentSettings}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-[#00a85e] uppercase tracking-wider block mb-0.5">
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
                                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
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
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                                className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-50 text-slate-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                {executingProposalId === message.actionProposal.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
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
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5 text-slate-500" />
                                <span>Decline</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Metadata & Copy */}
                      <div
                        className={`flex items-center gap-2 text-[11px] text-slate-400 px-1 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="tabular-nums">{message.timestamp}</span>
                        {!isUser && message.modelUsed && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-slate-500">{message.modelUsed}</span>
                          </>
                        )}
                        {!isUser && message.content && (
                          <button
                            type="button"
                            onClick={() => void handleCopyMessage(message.id, message.content)}
                            className="ml-1 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
          )}

          {/* 4. Modern AI Thinking & Reasoning Loading Indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex gap-3 justify-start"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-[#00d67d] flex items-center justify-center shrink-0 mt-0.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 max-w-lg rounded-2xl rounded-tl-xs bg-white border border-slate-200/85 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Smooth 3-bar harmonic equalizer */}
                      <div className="flex items-center gap-0.5 h-3.5 px-1" aria-hidden="true">
                        {[0, 0.16, 0.32].map((delay, idx) => (
                          <motion.span
                            key={idx}
                            className="w-[3px] h-full rounded-full bg-[#00d67d] origin-center"
                            animate={{
                              scaleY: [0.35, 1, 0.45],
                              opacity: [0.55, 1, 0.55],
                            }}
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {loadingStageLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleStopRequest}
                      className="text-[11px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
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
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Actionable Failure Card with Immediate One-Click "Try Again" */}
          <AnimatePresence>
            {failedAttempt && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 max-w-lg rounded-2xl rounded-tl-xs bg-white border border-rose-200/90 p-4 shadow-2xs space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-950">
                      Couldn&apos;t complete this response
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {failedAttempt.message}
                    </p>
                  </div>

                  {failedAttempt.query && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetryNow}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Floating Jump-to-Latest Button when user scrolled up */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => scrollToBottom('smooth')}
              className="sticky bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full text-[11px] font-medium shadow-md flex items-center gap-1.5 cursor-pointer mx-auto z-20"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Scroll to latest</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Modern Composer Dock */}
      <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200/80 bg-white shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex items-end gap-2 bg-slate-50/90 rounded-2xl border border-slate-200/90 focus-within:border-emerald-500/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00d67d]/15 transition-all p-1.5"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSendMessage(e.currentTarget.value);
                }
              }}
              placeholder="Ask about your campaigns, find wasted spend, or request an optimization..."
              className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-36 leading-relaxed"
              disabled={isLoading}
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
                disabled={!inputValue.trim()}
                className="h-9 px-4 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Send message (Enter)"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5 text-slate-950 stroke-[2.25]" />
              </button>
            )}
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
            <span>You approve campaign changes before they are applied.</span>
            <span className="hidden sm:inline text-[10px]">Enter to send · Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
