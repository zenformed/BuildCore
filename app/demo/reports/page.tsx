'use client';

import type { ReactElement } from 'react';
import { BuildCoreReportsAccessGate } from '@/presentation/components/CrmReports/BuildCoreReportsAccessGate';
import { CrmReportsDashboard } from '@/presentation/components/CrmReports/CrmReportsDashboard';

export default function DemoReportsPage(): ReactElement {
  return (
    <BuildCoreReportsAccessGate>
      <CrmReportsDashboard />
    </BuildCoreReportsAccessGate>
  );
}
