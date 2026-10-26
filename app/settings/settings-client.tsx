'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsView } from '@/components/settings/settings-view';
import { useAdOptimize } from '@/context/adoptimize-context';

export function SettingsClientView() {
  const {
    state,
    user,
    setShowConnectModal,
    handleResetData,
  } = useAdOptimize();

  return (
    <AppShell title="Account Settings & Connections">
      <SettingsView
        account={state.account}
        onOpenConnectModal={() => setShowConnectModal(true)}
        onClearData={handleResetData}
        userEmail={user?.email}
      />
    </AppShell>
  );
}
