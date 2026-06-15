'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { resolveDashboardChildRowFinancials } from '@/presentation/features/crmProjects/projectPaymentFinancials';
import { SubprojectMobileCard } from './SubprojectMobileCard';
import styles from './ProjectDetail.module.css';

export type SubprojectsMobileListProps = {
  readonly rows: readonly CrmProjectSummary[];
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly isWorkflowProgressLoading?: boolean;
  readonly isLoading?: boolean;
  readonly isPaymentFinancialsLoading?: boolean;
  readonly isMemberRole?: boolean;
  readonly canDelete?: boolean;
  readonly deletingProjectId?: string | null;
  readonly busyProjectId?: string | null;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  readonly showActions?: boolean;
  readonly emptyMessage: string;
  readonly onRowClick: (project: CrmProjectSummary) => void;
};

export function SubprojectsMobileList({
  rows,
  paymentTasksIndex,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  isLoading = false,
  isPaymentFinancialsLoading = false,
  isMemberRole = false,
  canDelete = false,
  deletingProjectId = null,
  busyProjectId = null,
  onRequestDelete,
  onTogglePriority,
  onRequestCompletionChange,
  showActions = true,
  emptyMessage,
  onRowClick,
}: SubprojectsMobileListProps): ReactElement {
  const showList = rows.length > 0 || isLoading;

  return (
    <div className={styles.subprojectsMobileListWrap} role="region" aria-label={content.projectDetail.subprojects.title}>
      {!showList ? (
        <p className={styles.subprojectsMobileEmptyState}>{emptyMessage}</p>
      ) : (
        <ul className={styles.subprojectsMobileList}>
          {rows.map((project) => (
            <li key={project.id} className={styles.subprojectsMobileListItem}>
              <SubprojectMobileCard
                project={project}
                financials={resolveDashboardChildRowFinancials(project, paymentTasksIndex)}
                financialsLoading={isPaymentFinancialsLoading}
                onRowClick={() => onRowClick(project)}
                isMemberRole={isMemberRole}
                canDelete={canDelete && showActions}
                showActions={showActions}
                busy={busyProjectId === project.id}
                deleting={deletingProjectId === project.id}
                onRequestDelete={onRequestDelete}
                onTogglePriority={onTogglePriority}
                onRequestCompletionChange={onRequestCompletionChange}
                workflowProgressInputIndex={workflowProgressInputIndex}
                isWorkflowProgressLoading={isWorkflowProgressLoading}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
