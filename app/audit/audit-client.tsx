'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { InsightsView } from '@/components/insights/insights-view';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { useAdOptimize } from '@/context/adoptimize-context';
import { AIInsight } from '@/types/adoptimize';

export function AuditClientView() {
  const {
    state,
    setState,
    user,
    selectedCampaign,
    setSelectedCampaign,
    handleSaveCampaign,
    showToast,
  } = useAdOptimize();

  const { campaigns, insights, keywords, searchTerms } = state;

  const handleApplyInsight = (insight: AIInsight) => {
    setState((prev) => ({
      ...prev,
      insights: prev.insights.map((i) =>
        i.id === insight.id ? { ...i, status: 'APPLIED' } : i
      ),
    }));
    showToast(`Applied recommendation: ${insight.problem}`);
  };

  const handleDismissInsight = (insightId: string) => {
    setState((prev) => ({
      ...prev,
      insights: prev.insights.map((i) =>
        i.id === insightId ? { ...i, status: 'DISMISSED' } : i
      ),
    }));
    showToast('Insight dismissed');
  };

  const handleMarkReviewed = (insightId: string) => {
    setState((prev) => ({
      ...prev,
      insights: prev.insights.map((i) =>
        i.id === insightId ? { ...i, status: 'REVIEWED' } : i
      ),
    }));
    showToast('Marked as reviewed');
  };

  return (
    <AppShell title="AI Ads Audit & Recommendations">
      <InsightsView
        insights={insights}
        onApplyInsight={handleApplyInsight}
        onDismissInsight={handleDismissInsight}
        onMarkReviewed={handleMarkReviewed}
      />

      {/* Campaign Detail Drawer */}
      {selectedCampaign && (
        <CampaignDetailDrawer
          campaign={selectedCampaign}
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          onUpdateBudget={async (newBudget) => {
            const updated = { ...selectedCampaign, budgetDaily: newBudget };
            await handleSaveCampaign(updated);
          }}
          onToggleStatus={async () => {
            const newStatus = selectedCampaign.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
            const updated = { ...selectedCampaign, status: newStatus as any };
            await handleSaveCampaign(updated);
          }}
          keywords={keywords.filter((k) => k.campaignId === selectedCampaign.id)}
          searchTerms={searchTerms.filter((st) => st.campaignId === selectedCampaign.id)}
          userEmail={user?.email}
        />
      )}
    </AppShell>
  );
}
