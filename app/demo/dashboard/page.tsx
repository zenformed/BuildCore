'use client';

import type { ReactElement } from 'react';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { CrmProjectsPipeline } from '@/presentation/components/CrmProjects/CrmProjectsPipeline';

export default function DemoDashboardPage(): ReactElement {
  const dash = useBuildCoreDashboardContext();

  return <CrmProjectsPipeline onProjectRowClick={dash.onProjectRowClick} />;
}
