'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SubscriptionManager } from '@/components/billing/subscription-manager';
import { withAdOptimize } from '@/components/providers/with-adoptimize';

export const BillingClientView = withAdOptimize(function BillingClientViewInner() {
  return (
    <AppShell title="Billing">
      <div className="max-w-3xl">
        <SubscriptionManager />
      </div>
    </AppShell>
  );
});
