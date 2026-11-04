'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AuditLogView } from '@/components/audit/audit-log-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const ActivityLogClientView = withAdOptimize(function ActivityLogClientViewInner() {
  const {
    state,
    handleRevertLog,
  } = useAdOptimize();

  return (
    <AppShell title="Audit Log & Activity History">
      <AuditLogView
        logs={state.auditLogs}
        onRevertLog={handleRevertLog}
      />
    </AppShell>
  );
});

