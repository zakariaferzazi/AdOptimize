'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ReportsView } from '@/components/reports/reports-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const ReportsClientView = withAdOptimize(function ReportsClientViewInner({ hasProAccess = true }: { hasProAccess?: boolean }) {
  const { state, user } = useAdOptimize();
  const { account } = state;

  return (
    <AppShell title="Executive Reports & Analytics" proLocked={!hasProAccess}>
      <ReportsView
        key={`${user?.uid}:${account.clientCustomerId}`}
        userId={hasProAccess ? user?.uid : undefined}
        connected={hasProAccess && Boolean(account.isConnected && account.clientCustomerId !== 'Not Connected')}
      />
    </AppShell>
  );
});

