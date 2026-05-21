'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { BuildCoreDashboardShell } from '@/presentation/components/DashboardShell/BuildCoreDashboardShell';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';
import { CrmReportsDashboard } from '@/presentation/components/CrmReports/CrmReportsDashboard';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';

export default function ReportsPage(): ReactElement {
  const dash = useBuildCoreDashboard();
  const router = useRouter();

  const onSidebarSelect = (id: BuildCoreSidebarNavId): void => {
    if (id === 'reports') {
      router.push(nav.routes.reports);
      return;
    }
    dash.setSidebarNav('projects');
    router.push(nav.routes.dashboard);
  };

  return (
    <BuildCoreDashboardShell
      dash={dash}
      title={null}
      showProjectActions={false}
      sidebarActiveId="reports"
      onSidebarSelect={onSidebarSelect}
    >
      <CrmReportsDashboard />
    </BuildCoreDashboardShell>
  );
}
