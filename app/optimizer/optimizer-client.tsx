'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { BudgetOptimizerView } from '@/components/optimizer/budget-optimizer-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const OptimizerClientView = withAdOptimize(function OptimizerClientViewInner({ hasProAccess = true }: { hasProAccess?: boolean }) {
  const {
    state,
    setState,
    handleApplyRecommendation,
    showToast,
  } = useAdOptimize();

  const budgetRecommendations = hasProAccess ? state.budgetRecommendations : [];
  const campaigns = hasProAccess ? state.campaigns : [];

  const handleApprove = async (rec: any) => {
    await handleApplyRecommendation(rec.id);
  };

  const handleReject = (recId: string) => {
    setState((prev) => ({
      ...prev,
      budgetRecommendations: prev.budgetRecommendations.map((r) =>
        r.id === recId ? { ...r, status: 'REJECTED' } : r
      ),
    }));
    showToast('Recommendation dismissed');
  };

  return (
    <AppShell title="Budget Optimizer" proLocked={!hasProAccess}>
      <BudgetOptimizerView
        recommendations={budgetRecommendations}
        campaigns={campaigns}
        currency={state.account.currency}
        onApproveRecommendation={handleApprove}
        onRejectRecommendation={handleReject}
      />
    </AppShell>
  );
});

