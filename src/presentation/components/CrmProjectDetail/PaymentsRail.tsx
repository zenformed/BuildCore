'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { listPaymentMilestones } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { PaymentMilestoneDraftRow } from './PaymentMilestoneDraftRow';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import styles from './ProjectDetail.module.css';

export type PaymentsRailProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onTaskUpdated: () => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function PaymentsRail({
  project,
  isApiSource,
  onTaskUpdated,
  onTaskError,
  onRequestArchiveTask,
}: PaymentsRailProps): ReactElement {
  const payments = content.projectDetail.payments;
  const cols = content.projectDetail.workflow.columns;
  const milestones = listPaymentMilestones(project.workflowTasks);
  const docCounts = countDocumentsByTaskId(project.documents);
  const gridClass = `${styles.workflowGrid} ${styles.workflowGridPayments}`;
  const [draftOpen, setDraftOpen] = useState(false);

  const showTable = milestones.length > 0 || draftOpen;

  return (
    <section className={styles.paymentsPanel} aria-labelledby="payments-rail-heading">
      <DetailPanelHeader title={payments.title} titleId="payments-rail-heading">
        <DetailPanelHeaderButton
          variant="add"
          disabled={draftOpen}
          title={payments.addMilestone}
          onClick={() => setDraftOpen(true)}
        />
      </DetailPanelHeader>
      {!showTable ? (
        <p className={styles.subtitle}>{payments.empty}</p>
      ) : (
        <div className={styles.paymentsList}>
          <div className={`${styles.tableHeader} ${gridClass} ${styles.paymentsTableHeader}`} role="row">
            <span role="columnheader">{cols.status}</span>
            <span role="columnheader">{cols.task}</span>
            <span role="columnheader">{cols.amount}</span>
            <span role="columnheader">{cols.documents}</span>
            <span role="columnheader">{cols.assigned}</span>
            <span role="columnheader">{cols.due}</span>
            <span role="columnheader" className={styles.taskDeleteHeader} aria-hidden />
          </div>
          {milestones.map((task) => (
            <WorkflowTaskInlineRow
              key={task.id}
              projectSlug={project.summary.slug}
              task={task}
              docCount={docCounts.get(task.id) ?? 0}
              taskDocuments={project.documents.filter((doc) => doc.workflowTaskId === task.id)}
              showAmountColumn
              isApiSource={isApiSource}
              onUpdated={onTaskUpdated}
              onTaskError={onTaskError}
              onRequestArchiveTask={onRequestArchiveTask}
            />
          ))}
          {draftOpen ? (
            <PaymentMilestoneDraftRow
              project={project}
              isApiSource={isApiSource}
              onSaved={onTaskUpdated}
              onCancel={() => setDraftOpen(false)}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
