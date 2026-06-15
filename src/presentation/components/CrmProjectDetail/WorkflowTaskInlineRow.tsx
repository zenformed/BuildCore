'use client';

import type { ReactElement } from 'react';
import type { CrmDocumentMetadata, CrmWorkflowTask } from '@/domain/crm';
import {
  useWorkflowTaskInlineRow,
  type UseWorkflowTaskInlineRowInput,
} from '@/presentation/features/crmProjectDetail/useWorkflowTaskInlineRow';
import { WorkflowTaskRowMobileView, WorkflowTaskRowTableView } from './WorkflowTaskRowView';

export type { WorkflowTaskPermissionDomain } from '@/presentation/features/crmProjectDetail/workflowTaskInlineRowTypes';

export type WorkflowTaskInlineRowProps = UseWorkflowTaskInlineRowInput & {
  readonly variant?: 'table' | 'mobile';
};

export function WorkflowTaskInlineRow({
  variant = 'table',
  showAmountColumn,
  ...input
}: WorkflowTaskInlineRowProps): ReactElement {
  const model = useWorkflowTaskInlineRow(input);

  if (variant === 'mobile') {
    return <WorkflowTaskRowMobileView model={model} />;
  }

  return <WorkflowTaskRowTableView model={model} showAmountColumn={showAmountColumn} />;
}

export type WorkflowTaskMobileCardProps = Omit<WorkflowTaskInlineRowProps, 'variant'>;

export function WorkflowTaskMobileCard(props: WorkflowTaskMobileCardProps): ReactElement {
  return <WorkflowTaskInlineRow {...props} variant="mobile" />;
}

export type { CrmWorkflowTask, CrmDocumentMetadata };
