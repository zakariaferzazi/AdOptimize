'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AiChatView } from '@/components/chat/ai-chat-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const ChatClientView = withAdOptimize(function ChatClientViewInner({ hasProAccess = true }: { hasProAccess?: boolean }) {
  const {
    state,
    setState,
    user,
    oauthToken,
    setSelectedCampaign,
    showToast,
  } = useAdOptimize();

  const {
    account,
    campaigns,
    keywords,
    searchTerms,
    auditLogs,
    anomalies,
    insights,
    budgetRecommendations,
    automationRules,
  } = state;

  return (
    <AppShell title="AI Marketing Agent" limitedAccess={!hasProAccess}>
      <AiChatView
        account={account}
        campaigns={hasProAccess ? campaigns : []}
        keywords={hasProAccess ? keywords : []}
        searchTerms={hasProAccess ? searchTerms : []}
        auditLogs={hasProAccess ? auditLogs : []}
        anomalies={hasProAccess ? anomalies : []}
        insights={hasProAccess ? insights : []}
        recommendations={hasProAccess ? budgetRecommendations : []}
        rules={hasProAccess ? automationRules : []}
        userId={hasProAccess ? user?.uid : undefined}
        preview={!hasProAccess}
        accessToken={hasProAccess ? oauthToken || undefined : undefined}
        onMutateCampaign={(updatedCamp, newLog) => {
          setState((prev) => ({
            ...prev,
            campaigns: prev.campaigns.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)),
            auditLogs: [newLog, ...prev.auditLogs],
          }));
          showToast(`Applied: ${newLog.reason}`);
        }}
        onSelectCampaign={(c) => setSelectedCampaign(c)}
      />
    </AppShell>
  );
});

