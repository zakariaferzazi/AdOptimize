'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ReportsView } from '@/components/reports/reports-view';
import { useAdOptimize } from '@/context/adoptimize-context';
import { calculateCampaignsMetrics } from '@/lib/metrics-calculator';
import { DateRangePeriod } from '@/types/adoptimize';

export function ReportsClientView() {
  const { state } = useAdOptimize();
  const { account, campaigns, insights } = state;
  const [reportPeriod, setReportPeriod] = useState<DateRangePeriod>('LAST_7_DAYS');

  const { current: periodMetrics } = calculateCampaignsMetrics(campaigns, reportPeriod);

  return (
    <AppShell title="Executive Reports & Analytics">
      <ReportsView
        campaigns={campaigns}
        metrics={periodMetrics}
        insights={insights}
        account={account}
        selectedPeriod={reportPeriod}
        onSelectPeriod={setReportPeriod}
      />
    </AppShell>
  );
}
