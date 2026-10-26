'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { BudgetOptimizerView } from '@/components/optimizer/budget-optimizer-view';
import { useAdOptimize } from '@/context/adoptimize-context';

export function OptimizerClientView() {
  const {
    state,
    setState,
    handleApplyRecommendation,
    showToast,
  } = useAdOptimize();

  const { budgetRecommendations, campaigns } = state;

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
    <AppShell title="Budget Optimizer">
      <BudgetOptimizerView
        recommendations={budgetRecommendations}
        campaigns={campaigns}
        onApproveRecommendation={handleApprove}
        onRejectRecommendation={handleReject}
      />
    </AppShell>
  );
}
