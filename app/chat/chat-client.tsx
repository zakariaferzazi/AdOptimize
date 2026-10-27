'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AiChatView } from '@/components/chat/ai-chat-view';
import { useAdOptimize } from '@/context/adoptimize-context';

export function ChatClientView() {
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
    <AppShell title="AI Google Ads Copilot">
      <AiChatView
        account={account}
        campaigns={campaigns}
        keywords={keywords}
        searchTerms={searchTerms}
        auditLogs={auditLogs}
        anomalies={anomalies}
        insights={insights}
        recommendations={budgetRecommendations}
        rules={automationRules}
        userId={user?.uid}
        accessToken={oauthToken || undefined}
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
}
