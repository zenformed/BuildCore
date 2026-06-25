'use client';

import '@zenformed/core/dashboard-shell/mobile-shell.css';

import type { ReactElement, ReactNode } from 'react';
import { DemoRootGate } from '@/presentation/components/Demo/DemoRootGate';
import { BuildCorePersistentDashboardShell } from '@/presentation/components/DashboardShell/BuildCorePersistentDashboardShell';
import { BuildCoreDashboardProvider } from '@/presentation/providers/BuildCoreDashboardProvider';
import { AssignmentIdentityProvider } from '@/presentation/providers/AssignmentIdentityProvider';
import { BuildCoreProjectSectionAccessProvider } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BuildCoreWorkflowTaskAccessProvider } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { CrmPaymentTasksIndexProvider } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { BuildCorePipelineStagesProvider } from '@/presentation/providers/BuildCorePipelineStagesProvider';

export default function DemoLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <DemoRootGate>
      <BuildCoreDashboardProvider>
        <AssignmentIdentityProvider>
          <BuildCoreWorkflowTaskAccessProvider>
            <BuildCoreProjectSectionAccessProvider>
              <CrmPaymentTasksIndexProvider>
                <BuildCorePipelineStagesProvider>
                  <BuildCorePersistentDashboardShell>{children}</BuildCorePersistentDashboardShell>
                </BuildCorePipelineStagesProvider>
              </CrmPaymentTasksIndexProvider>
            </BuildCoreProjectSectionAccessProvider>
          </BuildCoreWorkflowTaskAccessProvider>
        </AssignmentIdentityProvider>
      </BuildCoreDashboardProvider>
    </DemoRootGate>
  );
}
