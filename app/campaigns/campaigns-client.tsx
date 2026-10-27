'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { CampaignsFullView } from '@/components/campaigns/campaigns-full-view';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { CampaignAnalysisPage } from '@/components/campaigns/campaign-analysis-page';
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal';
import { useAdOptimize } from '@/context/adoptimize-context';
import { Campaign, CampaignType, CampaignStatus } from '@/types/adoptimize';

export function CampaignsClientView() {
  const {
    state,
    user,
    selectedCampaign,
    setSelectedCampaign,
    handleSaveCampaign,
    handleMutateCampaignStatus,
    handleMutateCampaignBudget,
    handleCreateCampaign,
    setShowConnectModal,
    showToast,
    handleSync,
    isSyncing,
  } = useAdOptimize();

  const { account, campaigns, keywords, searchTerms } = state;
  const [deepDiveCampaign, setDeepDiveCampaign] = useState<Campaign | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mutatingCampaignId, setMutatingCampaignId] = useState<string | null>(null);

  const handleToggleCampaignStatus = async (campaignId: string) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    const newStatus = target.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    setMutatingCampaignId(campaignId);
    try {
      if (handleMutateCampaignStatus) {
        await handleMutateCampaignStatus(campaignId, newStatus);
      } else {
        const updated = { ...target, status: newStatus as any };
        await handleSaveCampaign(updated);
      }
    } finally {
      setMutatingCampaignId(null);
    }
  };

  const handleUpdateBudget = async (campaignId: string, newBudget: number): Promise<boolean> => {
    if (handleMutateCampaignBudget) {
      return await handleMutateCampaignBudget(campaignId, newBudget);
    }
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return false;
    const updated = { ...target, budgetDaily: newBudget };
    await handleSaveCampaign(updated);
    return true;
  };

  const handleCreateNewCampaign = async (data: {
    name: string;
    budgetDaily: number;
    channelType: CampaignType;
    status: CampaignStatus;
  }): Promise<boolean> => {
    if (handleCreateCampaign) {
      return await handleCreateCampaign(data);
    }
    showToast('Campaign creation is not ready. Please verify your connection.');
    return false;
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
        currency={account.currency}
        onSelectCampaign={(c) => setSelectedCampaign(c)}
        onToggleStatus={handleToggleCampaignStatus}
        onUpdateBudget={handleUpdateBudget}
        onCreateCampaignClick={() => setIsCreateModalOpen(true)}
        onOpenSyncCampaigns={handleSync}
        isSyncing={isSyncing}
        isMutatingId={mutatingCampaignId}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currency={account.currency}
        onCreateCampaign={handleCreateNewCampaign}
      />

      {/* Campaign Detail Drawer */}
      {selectedCampaign && (
        <CampaignDetailDrawer
          campaign={selectedCampaign}
          account={account}
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          onUpdateBudget={(newBudget) => handleUpdateBudget(selectedCampaign.id, newBudget)}
          onToggleCampaignStatus={(id) => handleToggleCampaignStatus(id)}
          onToggleStatus={() => handleToggleCampaignStatus(selectedCampaign.id)}
          keywords={keywords.filter((k) => k.campaignId === selectedCampaign.id)}
          searchTerms={searchTerms.filter((st) => st.campaignId === selectedCampaign.id)}
          userEmail={user?.email}
        />
      )}
    </AppShell>
  );
}
