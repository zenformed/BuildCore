'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
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
} from '@/domain/buildcore/fieldLabels';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
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
    align === 'center' ? cardStyles.metaColumn_center : '',
    align === 'end' ? cardStyles.metaColumn_end : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={columnClass}>
      <div className={cardStyles.metaValue}>{value}</div>
      <div className={cardStyles.metaLabel}>{label}</div>
    </div>
  );
}

function PreviewStatusPill({ status }: { readonly status: string }): ReactElement {
  return (
    <span className={`${shared.statusBadge} ${statusBadgeClass(status)} ${cardStyles.statusPill}`}>
      {formatWorkflowStatus(status)}
    </span>
  );
}

function formatPreviewDocuments(count: number, naLabel: string, oneFile: string, files: (n: number) => string): string {
  if (count <= 0) return naLabel;
  return count === 1 ? oneFile : files(count);
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
  const documentsDisplay = formatPreviewDocuments(
    documentCount,
    previewCopy.documentsNa,
    previewCopy.documentOneFile,
    previewCopy.documentFiles
  );
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
        <h3 className={cardStyles.previewTitle}>{task.title}</h3>
        <p className={cardStyles.previewKind}>
          {isPayment ? previewCopy.kindPayment : previewCopy.kindTask}
        </p>
      </header>

      <div className={cardStyles.previewBody}>
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
          <div className={cardStyles.metaRow}>
            {isPayment ? (
              <>
                <PreviewMetaColumn
                  label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY} />}
                  value={<PreviewStatusPill status={task.status} />}
                  align="center"
                />
                <PreviewMetaColumn
                  label={previewCopy.labels.amount}
                  value={formatCentsAsUsd(task.amountCents ?? 0)}
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
                  value={<PreviewStatusPill status={task.status} />}
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
              value={assignedDisplay}
            />
            <PreviewMetaColumn
              label={<WorkflowFieldLabelText fieldKey={WORKFLOW_TASK_DOCUMENTS_FIELD_KEY} />}
              value={documentsDisplay}
              align="end"
            />
          </div>
          {isPayment ? (
            <div className={`${cardStyles.metaRow} ${cardStyles.metaRow_spaced}`}>
              <PreviewMetaColumn label={payments.columns.invoiced} value={invoicedDisplay} />
              <PreviewMetaColumn label={payments.columns.paid} value={paidDisplay} />
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
