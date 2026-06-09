'use client';

import type { ReactElement, ReactNode } from 'react';
import { BuildCorePersistentDashboardShell } from '@/presentation/components/DashboardShell/BuildCorePersistentDashboardShell';
import { BuildCoreDashboardProvider } from '@/presentation/providers/BuildCoreDashboardProvider';
import { AssignmentIdentityProvider } from '@/presentation/providers/AssignmentIdentityProvider';
import { BuildCoreProjectSectionAccessProvider } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BuildCoreWorkflowTaskAccessProvider } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { CrmPaymentTasksIndexProvider } from '@/presentation/providers/CrmPaymentTasksIndexProvider';

export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <BuildCoreDashboardProvider>
      <AssignmentIdentityProvider>
        <BuildCoreWorkflowTaskAccessProvider>
          <BuildCoreProjectSectionAccessProvider>
            <CrmPaymentTasksIndexProvider>
              <BuildCorePersistentDashboardShell>{children}</BuildCorePersistentDashboardShell>
            </CrmPaymentTasksIndexProvider>
          </BuildCoreProjectSectionAccessProvider>
        </BuildCoreWorkflowTaskAccessProvider>
      </AssignmentIdentityProvider>
    </BuildCoreDashboardProvider>
  );
}
