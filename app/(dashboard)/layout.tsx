'use client';

import '@zenformed/core/dashboard-shell/mobile-shell.css';

import type { ReactElement, ReactNode } from 'react';
import { BuildCorePersistentDashboardShell } from '@/presentation/components/DashboardShell/BuildCorePersistentDashboardShell';
import { BuildCoreDashboardProvider } from '@/presentation/providers/BuildCoreDashboardProvider';
import { AssignmentIdentityProvider } from '@/presentation/providers/AssignmentIdentityProvider';
import { BuildCoreProjectSectionAccessProvider } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BuildCoreWorkflowTaskAccessProvider } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { CrmPaymentTasksIndexProvider } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { BuildCoreFieldLabelsProvider } from '@/presentation/providers/BuildCoreFieldLabelsProvider';
import { BuildCoreWorkflowTaskCustomFieldsProvider } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import { BuildCoreWorkflowTaskTableColumnsProvider } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import { BuildCorePaymentTableColumnsProvider } from '@/presentation/providers/BuildCorePaymentTableColumnsProvider';
import { BuildCoreProjectCustomFieldsProvider } from '@/presentation/providers/BuildCoreProjectCustomFieldsProvider';
import { BuildCorePipelineStagesProvider } from '@/presentation/providers/BuildCorePipelineStagesProvider';

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
              <BuildCorePipelineStagesProvider>
                <BuildCoreFieldLabelsProvider>
                  <BuildCoreWorkflowTaskCustomFieldsProvider>
                    <BuildCoreWorkflowTaskTableColumnsProvider>
                      <BuildCorePaymentTableColumnsProvider>
                        <BuildCoreProjectCustomFieldsProvider>
                          <BuildCorePersistentDashboardShell>{children}</BuildCorePersistentDashboardShell>
                        </BuildCoreProjectCustomFieldsProvider>
                      </BuildCorePaymentTableColumnsProvider>
                    </BuildCoreWorkflowTaskTableColumnsProvider>
                  </BuildCoreWorkflowTaskCustomFieldsProvider>
                </BuildCoreFieldLabelsProvider>
              </BuildCorePipelineStagesProvider>
            </CrmPaymentTasksIndexProvider>
          </BuildCoreProjectSectionAccessProvider>
        </BuildCoreWorkflowTaskAccessProvider>
      </AssignmentIdentityProvider>
    </BuildCoreDashboardProvider>
  );
}
