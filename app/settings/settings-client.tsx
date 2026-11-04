'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsView } from '@/components/settings/settings-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const SettingsClientView = withAdOptimize(function SettingsClientViewInner() {
  const {
    state,
    setState,
    user,
    setShowConnectModal,
    handleResetData,
    showToast,
    refreshToken,
    handleSaveRefreshToken,
    handleRefreshToken,
    isSyncing,
  } = useAdOptimize();

  const handleUpdateCurrency = (newCurrency: string) => {
    setState((prev) => ({
      ...prev,
      account: { ...prev.account, currency: newCurrency },
    }));
    showToast(`Account currency updated to ${newCurrency}`);
  };

  return (
    <AppShell title="Account Settings & Connections">
      <SettingsView
        account={state.account}
        onOpenConnectModal={() => setShowConnectModal(true)}
        onClearData={handleResetData}
        onUpdateCurrency={handleUpdateCurrency}
        userEmail={user?.email}
        refreshToken={refreshToken || state.account.refreshToken || null}
        onSaveRefreshToken={handleSaveRefreshToken}
        onTestRefresh={async () => {
          await handleRefreshToken(false);
        }}
        isSyncing={isSyncing}
      />
    </AppShell>
  );
});

