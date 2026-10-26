'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ReportsView } from '@/components/reports/reports-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { computeAccountMetrics } from '@/lib/mock-data';

export function ReportsClientView() {
  const { state } = useAdOptimize();
  const { account, campaigns, insights } = state;
  const metrics = computeAccountMetrics(campaigns);

  return (
    <AppShell title="Executive Reports & Analytics">
      <ReportsView
        campaigns={campaigns}
        metrics={metrics}
        insights={insights}
        account={account}
      />
    </AppShell>
  );
}
