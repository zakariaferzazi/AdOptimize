'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AutomationView } from '@/components/automation/automation-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const AutomationsClientView = withAdOptimize(function AutomationsClientViewInner() {
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
});

