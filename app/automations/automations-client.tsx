'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AutomationView } from '@/components/automation/automation-view';
import { useAdOptimize } from '@/context/adoptimize-context';

export function AutomationsClientView() {
  const {
    state,
    handleToggleRule,
    handleAddRule,
  } = useAdOptimize();

  return (
    <AppShell title="Automated Safeguards & Rules">
      <AutomationView
        rules={state.automationRules}
        onToggleRule={handleToggleRule}
        onAddRule={handleAddRule}
      />
    </AppShell>
  );
}
