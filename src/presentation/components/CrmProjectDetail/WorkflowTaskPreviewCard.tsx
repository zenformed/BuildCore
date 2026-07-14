'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmTeamMemberRef, CrmWorkflowTask } from '@/domain/crm';
import type {
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
} from '@/domain/buildcore/workflowTaskCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { WorkflowFieldLabelText } from './EditableFieldLabelHeader';
import {
  WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
  WORKFLOW_TASK_NOTES_FIELD_KEY,
  WORKFLOW_TASK_STATUS_FIELD_KEY,
  WORKFLOW_TASK_TASK_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import detailStyles from './ProjectDetail.module.css';
import cardStyles from './WorkflowTaskPreviewCard.module.css';

const PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH = 55;

function truncatePreviewCustomFieldValue(value: string): string {
  if (value.length <= PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH) return value;
  return `${value.slice(0, PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH)}…`;
}

function previewCustomFieldValueTitle(value: string, emptyValue: string): string | undefined {
  if (value === emptyValue || value.length <= PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH) return undefined;
  return value;
}

export type WorkflowTaskPreviewCardProps = {
  readonly task: CrmWorkflowTask;
  readonly scope: WorkflowTaskCustomFieldScope;
  readonly customFieldDefinitions: readonly WorkflowTaskCustomFieldDefinition[];
  readonly stageLabel?: string | null;
  readonly documentCount: number;
  readonly onOpenDetails?: () => void;
  readonly showOpenDetails?: boolean;
  readonly popoverId: string;
};

function statusBadgeClass(status: string): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

function PreviewMetaColumn({
  label,
  value,
  align = 'start',
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly align?: 'start' | 'center' | 'end';
}): ReactElement {
  const columnClass = [
    cardStyles.metaColumn,
    cardStyles.metaColumn_labelsFirst,
    align === 'center' ? cardStyles.metaColumn_center : '',
    align === 'end' ? cardStyles.metaColumn_end : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={columnClass}>
      <div className={cardStyles.metaLabel}>{label}</div>
      <div className={cardStyles.metaValue}>{value}</div>
    </div>
  );
}

function PreviewStatusDot({ status }: { readonly status: string }): ReactElement {
  return (
    <span className={`${detailStyles.statusDotIndicator} ${statusBadgeClass(status)}`}>
      <span className={detailStyles.statusDot} aria-hidden />
      <span className={detailStyles.statusDotText}>{formatWorkflowStatus(status)}</span>
    </span>
  );
}

function PreviewAssigneeValue({
  assignedTo,
  unassignedLabel,
}: {
  readonly assignedTo: CrmTeamMemberRef | null | undefined;
  readonly unassignedLabel: string;
}): ReactElement {
  if (assignedTo == null) {
    return (
      <span className={shared.assigneeMenuRow}>
        <span className={shared.assigneeMenuAvatar}>
          <span
            className={`${shared.avatar} ${shared.avatarUnassigned}`}
            title={unassignedLabel}
            aria-label={unassignedLabel}
          >
            —
          </span>
        </span>
        <span className={shared.assigneeMenuLabel}>{unassignedLabel}</span>
      </span>
    );
  }

  return (
    <span className={shared.assigneeMenuRow}>
      <span className={shared.assigneeMenuAvatar}>
        <TeamMemberAvatar member={assignedTo} />
      </span>
      <span className={shared.assigneeMenuLabel}>{assignedTo.displayName}</span>
    </span>
  );
}

function PreviewDocumentsValue({
  documentCount,
  emptyLabel,
}: {
  readonly documentCount: number;
  readonly emptyLabel: string;
}): ReactElement {
  if (documentCount <= 0) {
    return <span>{emptyLabel}</span>;
  }

  return (
    <span
      className={cardStyles.previewDocumentsValue}
      aria-label={content.projectDetail.workflow.documentsCountAriaLabel(documentCount)}
    >
      <span className={detailStyles.documentsIcon} aria-hidden />
      <span>{documentCount}</span>
    </span>
  );
}

function formatPreviewDate(iso: string | null | undefined, naLabel: string, emptyValue: string): string {
  if (iso == null || iso.trim() === '') return naLabel;
  return formatShortDate(iso);
}

export function WorkflowTaskPreviewCard({
  task,
  scope,
  customFieldDefinitions,
  stageLabel,
  documentCount,
  onOpenDetails,
  showOpenDetails = false,
  popoverId,
}: WorkflowTaskPreviewCardProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const payments = content.projectDetail.payments;
  const previewCopy = scope === 'payment' ? payments.preview : wf.preview;
  const emptyValue = wf.tableColumns.emptyValue;
  const isPayment = scope === 'payment';

  const assignedDisplay = task.assignedTo?.displayName?.trim() || wf.unassigned;
  const dueDisplay = formatPreviewDate(task.dueAt, previewCopy.dateNa, emptyValue);
  const notesText = task.notes?.trim() ?? '';
  const invoicedDisplay = formatPreviewDate(task.invoicedAt, previewCopy.dateNa, emptyValue);
  const paidDisplay = formatPreviewDate(task.paidAt, previewCopy.dateNa, emptyValue);

  return (
    <div
      id={popoverId}
      role="dialog"
      aria-label={previewCopy.ariaLabel(task.title)}
      className={cardStyles.previewCard}
    >
      <header className={cardStyles.previewHeader}>
        <p className={cardStyles.previewKind}>
          {isPayment ? (
            previewCopy.kindPayment
          ) : (
            <WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_TASK_FIELD_KEY} />
          )}
        </p>
        <h3 className={cardStyles.previewTitle}>{task.title}</h3>
      </header>

      <div className={cardStyles.previewBody}>
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
          <div className={cardStyles.metaRow}>
            {isPayment ? (
              <>
                <PreviewMetaColumn
                  label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY} />}
                  value={<PreviewStatusDot status={task.status} />}
                />
                <PreviewMetaColumn
                  label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY} />}
                  value={dueDisplay}
                  align="end"
                />
              </>
            ) : (
              <>
                <PreviewMetaColumn
                  label={previewCopy.labels.stage}
                  value={stageLabel?.trim() || previewCopy.dateNa}
                />
                <PreviewMetaColumn
                  label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY} />}
                  value={<PreviewStatusDot status={task.status} />}
                  align="center"
                />
                <PreviewMetaColumn
                  label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY} />}
                  value={dueDisplay}
                  align="end"
                />
              </>
            )}
          </div>
          <div className={`${cardStyles.metaRow} ${cardStyles.metaRow_spaced}`}>
            <PreviewMetaColumn
              label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_ASSIGNED_FIELD_KEY} />}
              value={
                <PreviewAssigneeValue
                  assignedTo={task.assignedTo}
                  unassignedLabel={assignedDisplay}
                />
              }
            />
            <PreviewMetaColumn
              label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_DOCUMENTS_FIELD_KEY} />}
              value={
                <PreviewDocumentsValue
                  documentCount={documentCount}
                  emptyLabel={previewCopy.documentsNa}
                />
              }
              align="end"
            />
          </div>
          {isPayment ? (
            <div className={`${cardStyles.metaRow} ${cardStyles.metaRow_spaced}`}>
              <PreviewMetaColumn
                label={previewCopy.labels.amount}
                value={formatCentsAsUsd(task.amountCents ?? 0)}
              />
              <PreviewMetaColumn
                label={payments.columns.invoiced}
                value={invoicedDisplay}
                align="center"
              />
              <PreviewMetaColumn label={payments.columns.paid} value={paidDisplay} align="end" />
            </div>
          ) : null}
        </section>

        {notesText ? (
          <section className={cardStyles.previewSection} aria-label={previewCopy.sections.notes}>
            <h4 className={cardStyles.previewSectionHeading}>
              <WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_NOTES_FIELD_KEY} />
            </h4>
            <p className={`${cardStyles.metaValue} ${cardStyles.previewNotes}`}>{notesText}</p>
          </section>
        ) : null}

        {customFieldDefinitions.length > 0 ? (
          <section className={cardStyles.previewSection} aria-label={previewCopy.sections.customFields}>
            <h4 className={cardStyles.previewCustomFieldsHeading}>{previewCopy.sections.customFields}</h4>
            <dl className={cardStyles.customFieldList}>
              {customFieldDefinitions.map((definition) => {
                const raw = task.customFields?.[definition.fieldKey];
                const value =
                  raw != null && raw.trim().length > 0 ? raw.trim() : emptyValue;
                const displayValue =
                  value === emptyValue ? value : truncatePreviewCustomFieldValue(value);
                const valueTitle = previewCustomFieldValueTitle(value, emptyValue);
                return (
                  <div key={definition.fieldKey} className={cardStyles.customFieldRow}>
                    <dt className={cardStyles.customFieldLabel}>{definition.label}</dt>
                    <dd
                      className={[
                        cardStyles.customFieldValue,
                        value === emptyValue ? cardStyles.customFieldValue_muted : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={valueTitle}
                    >
                      {displayValue}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}
      </div>

      {showOpenDetails && onOpenDetails ? (
        <footer className={cardStyles.previewFooter}>
          <button type="button" className={cardStyles.previewOpenDetailsBtn} onClick={onOpenDetails}>
            {previewCopy.openDetails}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
