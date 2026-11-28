'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AuditLogView } from '@/components/audit/audit-log-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const ActivityLogClientView = withAdOptimize(function ActivityLogClientViewInner({ hasProAccess = true }: { hasProAccess?: boolean }) {
  const { state, user } = useAdOptimize();
  const accountId = state.account.clientCustomerId.replace(/\D/g, '');
  return (
    <AppShell title="AdOptimize Activity" proLocked={!hasProAccess}>
      <AuditLogView key={`${user?.uid}:${accountId}`} userId={hasProAccess ? user?.uid : undefined}
        accountId={hasProAccess && accountId.length === 10 ? accountId : ''} accountName={hasProAccess ? state.account.accountName : ''} />
    </AppShell>
  );
});
