'use client';

import type { ReactElement } from 'react';
import type { CrmDocumentMetadata, CrmWorkflowTask } from '@/domain/crm';
import {
  useWorkflowTaskInlineRow,
  type UseWorkflowTaskInlineRowInput,
} from '@/presentation/features/crmProjectDetail/useWorkflowTaskInlineRow';
import { WorkflowTaskRowCompactView, WorkflowTaskRowMobileView, WorkflowTaskRowTableView } from './WorkflowTaskRowView';

export type { WorkflowTaskPermissionDomain } from '@/presentation/features/crmProjectDetail/workflowTaskInlineRowTypes';

export type WorkflowTaskInlineRowProps = UseWorkflowTaskInlineRowInput & {
  readonly variant?: 'table' | 'mobile' | 'compact';
  readonly enableCustomColumns?: boolean;
  readonly enablePaymentCustomColumns?: boolean;
};

export function WorkflowTaskInlineRow({
  variant = 'table',
  showAmountColumn,
  enableCustomColumns = false,
  enablePaymentCustomColumns = false,
  ...input
}: WorkflowTaskInlineRowProps): ReactElement {
  const model = useWorkflowTaskInlineRow(input);

  if (variant === 'compact') {
    return <WorkflowTaskRowCompactView model={model} />;
  }

  if (variant === 'mobile') {
    return <WorkflowTaskRowMobileView model={model} />;
  }

  return (
    <WorkflowTaskRowTableView
      model={model}
      showAmountColumn={showAmountColumn}
      enableCustomColumns={enableCustomColumns}
      enablePaymentCustomColumns={enablePaymentCustomColumns}
    />
  );
}

export type WorkflowTaskMobileCardProps = Omit<WorkflowTaskInlineRowProps, 'variant'>;

export function WorkflowTaskMobileCard(props: WorkflowTaskMobileCardProps): ReactElement {
  return <WorkflowTaskInlineRow {...props} variant="compact" />;
}

export type { CrmWorkflowTask, CrmDocumentMetadata };
