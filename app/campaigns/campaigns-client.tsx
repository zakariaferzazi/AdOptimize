'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { CampaignsFullView } from '@/components/campaigns/campaigns-full-view';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { CampaignAnalysisPage } from '@/components/campaigns/campaign-analysis-page';
import { useAdOptimize } from '@/context/adoptimize-context';
import { Campaign } from '@/types/adoptimize';

export function CampaignsClientView() {
  const {
    state,
    user,
    selectedCampaign,
    setSelectedCampaign,
    handleSaveCampaign,
    setShowConnectModal,
    showToast,
    handleSync,
    isSyncing,
  } = useAdOptimize();

  const { account, campaigns, keywords, searchTerms } = state;
  const [deepDiveCampaign, setDeepDiveCampaign] = useState<Campaign | null>(null);

  const handleToggleCampaignStatus = async (campaignId: string) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    const newStatus = target.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    const updated = { ...target, status: newStatus as any };
    await handleSaveCampaign(updated);
  };

  const handleUpdateBudget = async (campaignId: string, newBudget: number) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    const updated = { ...target, budgetDaily: newBudget };
    await handleSaveCampaign(updated);
  };

  if (deepDiveCampaign) {
    return (
      <AppShell title={`Analysis: ${deepDiveCampaign.name}`}>
        <CampaignAnalysisPage
          campaign={deepDiveCampaign}
          account={account}
          onBack={() => setDeepDiveCampaign(null)}
          onUpdateBudget={(b) => handleUpdateBudget(deepDiveCampaign.id, b)}
          onToggleStatus={() => handleToggleCampaignStatus(deepDiveCampaign.id)}
          keywords={keywords.filter((k) => k.campaignId === deepDiveCampaign.id)}
          searchTerms={searchTerms.filter((st) => st.campaignId === deepDiveCampaign.id)}
          userEmail={user?.email}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Campaigns Manager">
      <CampaignsFullView
        campaigns={campaigns}
        onSelectCampaign={(c) => setSelectedCampaign(c)}
        onToggleStatus={handleToggleCampaignStatus}
        onOpenSyncCampaigns={handleSync}
        isSyncing={isSyncing}
      />

      {/* Campaign Detail Drawer */}
      {selectedCampaign && (
        <CampaignDetailDrawer
          campaign={selectedCampaign}
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          onUpdateBudget={(newBudget) => handleUpdateBudget(selectedCampaign.id, newBudget)}
          onToggleStatus={() => handleToggleCampaignStatus(selectedCampaign.id)}
          keywords={keywords.filter((k) => k.campaignId === selectedCampaign.id)}
          searchTerms={searchTerms.filter((st) => st.campaignId === selectedCampaign.id)}
          userEmail={user?.email}
        />
      )}
    </AppShell>
  );
}
