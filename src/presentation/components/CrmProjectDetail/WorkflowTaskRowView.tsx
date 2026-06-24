'use client';

import type { ReactElement } from 'react';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
  formatWorkflowTaskNotesDisplay,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { workflowTaskDueToInputValue } from '@/presentation/features/crmProjectDetail/workflowTaskInlineUtils';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import type { WorkflowTaskInlineRowModel } from '@/presentation/features/crmProjectDetail/useWorkflowTaskInlineRow';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import { WorkflowTaskRowActionsMenu } from './WorkflowTaskRowActionsMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: string): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

function WorkflowTaskRowActionsMenuSlot({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement | null {
  if (!model.showActionsMenu) return null;

  return (
    <WorkflowTaskRowActionsMenu
      taskTitle={model.task.title}
      disabled={model.saving}
      canEdit={model.canEdit}
      canDelete={model.canDelete}
      showSendAttachment={model.showSendAttachment}
      showAssignedNotification={model.showAssignedNotification}
      onEdit={() => {
        model.closeMenus();
        model.openEditWorkflowTask(model.task);
      }}
      onDelete={
        model.onRequestArchiveTask
          ? () => {
              model.closeMenus();
              model.onRequestArchiveTask?.(model.task);
            }
          : undefined
      }
      onSendAttachment={() => {
        model.closeMenus();
        model.openSendAttachmentDialogForTask(model.task, model.taskDocuments);
      }}
      onNotifyAssigned={() => {
        model.closeMenus();
        model.openAssignedNotifyPromptForTask(model.task);
      }}
    />
  );
}

function WorkflowTaskRowStatusField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineCellWrap} ${styles.workflowStatusCell}`;

  return (
    <span className={wrapClass} ref={model.statusRef}>
      <button
        type="button"
        className={styles.inlinePillBtn}
        disabled={model.saving || !model.canChangeStatus}
        aria-expanded={model.statusMenuOpen}
        onClick={() => {
          model.setDocumentsMenuOpen(false);
          model.setAssigneeMenuOpen(false);
          model.setStatusMenuOpen((open) => !open);
        }}
      >
        <span className={`${styles.statusPill} ${statusBadgeClass(model.task.status)}`}>
          {formatWorkflowStatus(model.task.status)}
        </span>
      </button>
      <WorkflowInlineMenu
        open={model.statusMenuOpen}
        onClose={() => model.setStatusMenuOpen(false)}
        anchorRef={model.statusRef}
      >
        {WORKFLOW_TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={styles.inlineMenuPillOption}
            disabled={model.saving || status === model.task.status || model.isStatusDisabled(status)}
            title={status === 'done' && !model.canApprove ? model.wf.statusDoneNotAllowed : undefined}
            onClick={() => void model.saveStatus(status)}
          >
            <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
              {formatWorkflowStatus(status)}
            </span>
          </button>
        ))}
      </WorkflowInlineMenu>
    </span>
  );
}

function WorkflowTaskRowTitleField({
  model,
  mobile = false,
  mobileHeader = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly mobileHeader?: boolean;
}): ReactElement {
  const { wf, task, saving, canEdit, editingTitle, titleDraft } = model;

  const titleContent =
    editingTitle && canEdit ? (
      <input
        className={styles.inlineFieldInput}
        value={titleDraft}
        disabled={saving}
        onChange={(e) => model.setTitleDraft(e.target.value)}
        onBlur={() => void model.saveTitle()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void model.saveTitle();
          if (e.key === 'Escape') {
            model.setTitleDraft(task.title);
            model.setEditingTitle(false);
          }
        }}
        autoFocus
      />
    ) : canEdit ? (
      <button
        type="button"
        className={
          mobileHeader
            ? styles.workflowTaskMobileCardTitleBtn
            : mobile
              ? styles.workflowTaskMobileCardValueBtn
              : styles.inlineCellBtn
        }
        disabled={saving}
        title={task.title}
        onClick={() => {
          model.closeMenus();
          model.setEditingNotes(false);
          model.setTitleDraft(task.title);
          model.setEditingTitle(true);
        }}
      >
        <span className={mobileHeader ? styles.workflowTaskMobileCardTitle : styles.taskTitleBtnText}>
          {task.title}
        </span>
      </button>
    ) : (
      <span
        className={mobileHeader ? styles.workflowTaskMobileCardTitle : styles.taskTitleBtnText}
        title={task.title}
      >
        {task.title}
      </span>
    );

  if (mobileHeader) {
    return titleContent;
  }

  return (
    <span className={mobile ? styles.workflowTaskMobileCardControl : styles.taskTitleCell}>
      {!mobile ? (
        task.status === 'done' ? (
          <span className={styles.taskDoneIcon} title={wf.taskDoneIndicator} aria-label={wf.taskDoneIndicator}>
            ✓
          </span>
        ) : (
          <span className={styles.taskOpenIcon} title={wf.taskOpenIndicator} aria-label={wf.taskOpenIndicator} />
        )
      ) : null}
      {titleContent}
    </span>
  );
}

function WorkflowTaskRowNotesField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const { saving, canEdit, editingNotes, notesDraft, notesPreview, notesTitle, task } = model;
  const notesClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.workflowNotesCell} ${styles.workflowMetaCell}`;
  const notesDisplay = formatWorkflowTaskNotesDisplay(task.notes);

  return (
    <span className={notesClass}>
      {editingNotes && canEdit ? (
        <textarea
          className={`${styles.inlineFieldInput} ${styles.workflowTaskMobileCardNotesInput}`}
          value={notesDraft}
          disabled={saving}
          rows={3}
          onChange={(e) => model.setNotesDraft(e.target.value)}
          onBlur={() => void model.saveNotes()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              model.setNotesDraft(task.notes ?? '');
              model.setEditingNotes(false);
            }
          }}
          autoFocus
        />
      ) : canEdit ? (
        <button
          type="button"
          className={
            mobile ? styles.workflowTaskMobileCardNotesBtn : styles.inlineCellBtn
          }
          disabled={saving}
          title={notesTitle}
          onClick={() => {
            model.closeMenus();
            model.setEditingTitle(false);
            model.setNotesDraft(task.notes ?? '');
            model.setEditingNotes(true);
          }}
        >
          <span
            className={
              mobile ? styles.workflowTaskMobileCardNotesText : styles.workflowNotesPreview
            }
          >
            {mobile ? notesDisplay : notesPreview}
          </span>
        </button>
      ) : (
        <span
          className={
            mobile ? styles.workflowTaskMobileCardNotesText : styles.workflowNotesPreview
          }
          title={notesTitle}
        >
          {mobile ? notesDisplay : notesPreview}
        </span>
      )}
    </span>
  );
}

function WorkflowTaskRowDocumentsField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineCellWrap} ${styles.workflowMetaCell}`;

  return (
    <span className={wrapClass} ref={model.documentsRef}>
      <button
        type="button"
        className={`${styles.inlineCellBtn} ${styles.documentsCell}`}
        disabled={model.saving || !model.canOpenDocumentsMenu}
        aria-expanded={model.documentsMenuOpen}
        onClick={() => {
          model.setStatusMenuOpen(false);
          model.setAssigneeMenuOpen(false);
          if (
            model.isApiSource &&
            model.awaitingCustomerReview &&
            model.taskDocuments.length === 0
          ) {
            void model.syncWorkflowTaskDocuments(model.task.id);
          }
          model.setDocumentsMenuOpen((open) => !open);
        }}
      >
        {model.showDocumentsIcon ? <span className={styles.documentsIcon} aria-hidden /> : null}
        <span
          className={
            mobile
              ? styles.workflowTaskMobileCardValue
              : !model.task.documentsRequired && !model.hasDocuments
                ? styles.documentsNotRequired
                : undefined
          }
        >
          {mobile ? model.documentsMobileLabel : model.documentsLabel}
        </span>
      </button>
      <input
        ref={model.documentActions.fileInputRef}
        type="file"
        accept={model.documentAccept}
        className={styles.hiddenFileInput}
        onChange={(e) => void model.documentActions.handleFileSelected(e)}
      />
      <WorkflowInlineMenu
        open={model.documentsMenuOpen}
        onClose={() => model.setDocumentsMenuOpen(false)}
        anchorRef={model.documentsRef}
      >
        {model.canUpload ? (
          <button
            type="button"
            className={`${styles.inlineMenuAction} ${styles.inlineMenuUploadAction}`}
            disabled={model.saving || model.documentActions.uploading}
            onClick={() => {
              model.setDocumentsMenuOpen(false);
              model.documentActions.openFilePicker();
            }}
          >
            <span className={styles.inlineMenuUploadIcon} aria-hidden />
            {model.wf.documentsUpload}
          </button>
        ) : null}
        {model.taskDocuments.map((doc) => (
          <div key={doc.id} className={styles.inlineMenuDocRow}>
            <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} compact />
            <span className={styles.inlineMenuDocName} title={doc.name}>
              {doc.name}
            </span>
            <button
              type="button"
              className={styles.inlineMenuIconBtn}
              disabled={model.saving || model.documentActions.uploading}
              title={model.wf.documentDownload}
              aria-label={`${model.wf.documentDownload} ${doc.name}`}
              onClick={() => {
                model.setDocumentsMenuOpen(false);
                void model.documentActions.downloadDocument(doc.id, doc.name);
              }}
            >
              <span className={styles.inlineMenuDownloadIcon} aria-hidden />
            </button>
            {model.canEdit ? (
              <button
                type="button"
                className={styles.inlineMenuIconBtn}
                disabled={model.saving || model.documentActions.uploading}
                title={model.wf.documentDelete}
                aria-label={`${model.wf.documentDelete} ${doc.name}`}
                onClick={() => {
                  model.setDocumentsMenuOpen(false);
                  void model.documentActions.deleteDocument(doc.id);
                }}
              >
                <span className={styles.inlineMenuDeleteIcon} aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
        {model.canEdit && !model.task.documentsRequired ? (
          <button
            type="button"
            className={styles.inlineMenuAction}
            disabled={model.saving}
            onClick={() => void model.saveDocumentsRequired(true)}
          >
            {model.wf.documentsMarkRequired}
          </button>
        ) : null}
        {model.canEdit && model.task.documentsRequired && model.taskDocuments.length === 0 ? (
          <button
            type="button"
            className={styles.inlineMenuAction}
            disabled={model.saving}
            onClick={() => void model.saveDocumentsRequired(false)}
          >
            {model.wf.documentsNotRequired}
          </button>
        ) : null}
      </WorkflowInlineMenu>
    </span>
  );
}

function WorkflowTaskRowAssigneeField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineCellWrap} ${styles.workflowMetaCell}`;

  const assigneeContent = model.task.assignedTo ? (
    <TeamMemberAvatar member={model.task.assignedTo} />
  ) : (
    <span
      className={`${shared.avatar} ${shared.avatarUnassigned}`}
      title={model.wf.unassigned}
      aria-label={model.wf.unassigned}
    >
      —
    </span>
  );

  return (
    <span className={wrapClass} ref={model.assigneeRef}>
        {mobile && !model.canEdit ? (
          assigneeContent
        ) : (
          <button
            type="button"
            className={
              mobile
                ? `${styles.workflowTaskMobileCardValueBtn} ${styles.assignedCell}`
                : `${styles.inlineCellBtn} ${styles.assignedCell}`
            }
            disabled={model.saving || !model.canEdit}
            aria-expanded={model.assigneeMenuOpen}
            onClick={() => {
              model.setStatusMenuOpen(false);
              model.setDocumentsMenuOpen(false);
              model.setAssigneeMenuOpen((open) => !open);
            }}
          >
            {assigneeContent}
          </button>
        )}
      <WorkflowInlineMenu
        open={model.assigneeMenuOpen}
        onClose={() => model.setAssigneeMenuOpen(false)}
        anchorRef={model.assigneeRef}
        align="end"
      >
        {model.assigneeOptions.map((option) => (
          <button
            key={option.id || 'unassigned'}
            type="button"
            className={`${styles.inlineMenuAction} ${shared.assigneeMenuAction}`}
            disabled={model.saving || option.disabled === true}
            onClick={() => {
              if (option.disabled) return;
              void model.saveAssignee(option.id);
            }}
          >
            <AssigneeMenuOptionLabel option={option} />
          </button>
        ))}
      </WorkflowInlineMenu>
    </span>
  );
}

function WorkflowTaskRowDueField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const dueClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const dueDisplay = formatShortDate(model.task.dueAt);

  return (
    <span className={dueClass}>
      <button
        type="button"
        className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
        disabled={model.saving || !model.canEdit}
        onClick={() => {
          model.closeMenus();
          model.dueInputRef.current?.showPicker?.();
          model.dueInputRef.current?.click();
        }}
      >
        <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{dueDisplay}</span>
      </button>
      <input
        ref={model.dueInputRef}
        type="date"
        className={styles.inlineDateInput}
        value={model.dueInputValue}
        disabled={model.saving || !model.canEdit}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void model.saveDue(e.target.value)}
      />
    </span>
  );
}

function WorkflowTaskRowAmountField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const { task, saving, canEdit, editingAmount, amountDraft } = model;
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineAmountCell} ${styles.workflowMetaCell}`;
  const amountDisplay = formatCentsAsUsd(task.amountCents ?? 0);

  return (
    <span className={wrapClass}>
      {editingAmount && canEdit ? (
        <input
          className={styles.inlineFieldInput}
          value={amountDraft}
          disabled={saving}
          inputMode="decimal"
          onChange={(e) => model.setAmountDraft(e.target.value)}
          onBlur={() => void model.saveAmount()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void model.saveAmount();
            if (e.key === 'Escape') {
              model.setAmountDraft(centsToUsdInput(task.amountCents));
              model.setEditingAmount(false);
            }
          }}
          autoFocus
        />
      ) : canEdit ? (
        <button
          type="button"
          className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
          disabled={saving}
          onClick={() => {
            model.closeMenus();
            model.setAmountDraft(centsToUsdInput(task.amountCents));
            model.setEditingAmount(true);
          }}
        >
          <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{amountDisplay}</span>
        </button>
      ) : (
        <span className={mobile ? styles.workflowTaskMobileCardValue : styles.inlineCellBtn}>
          {amountDisplay}
        </span>
      )}
    </span>
  );
}

function WorkflowTaskRowInvoicedField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const { task, saving } = model;
  const payCols = content.projectDetail.payments.columns;
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const invoicedDisplay = formatShortDate(task.invoicedAt);

  return (
    <span className={wrapClass}>
      <button
        type="button"
        className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
        disabled={saving}
        title={payCols.invoiced}
        onClick={(e) => {
          const input = e.currentTarget.nextElementSibling as HTMLInputElement | null;
          input?.showPicker?.();
          input?.click();
        }}
      >
        <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{invoicedDisplay}</span>
      </button>
      <input
        type="date"
        className={styles.inlineDateInput}
        value={workflowTaskDueToInputValue(task.invoicedAt)}
        disabled={saving}
        tabIndex={-1}
        aria-label={payCols.invoiced}
        onChange={(e) => void model.saveInvoiced(e.target.value)}
      />
    </span>
  );
}

function WorkflowTaskRowPaidField({
  model,
  mobile = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
}): ReactElement {
  const { task, saving } = model;
  const payCols = content.projectDetail.payments.columns;
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const paidDisplay = formatShortDate(task.paidAt);

  return (
    <span className={wrapClass}>
      <button
        type="button"
        className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
        disabled={saving}
        title={payCols.paid}
        onClick={(e) => {
          const input = e.currentTarget.nextElementSibling as HTMLInputElement | null;
          input?.showPicker?.();
          input?.click();
        }}
      >
        <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{paidDisplay}</span>
      </button>
      <input
        type="date"
        className={styles.inlineDateInput}
        value={workflowTaskDueToInputValue(task.paidAt)}
        disabled={saving}
        tabIndex={-1}
        aria-label={payCols.paid}
        onChange={(e) => void model.savePaid(e.target.value)}
      />
    </span>
  );
}

function WorkflowTaskRowPaymentDateFields({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  return (
    <>
      <WorkflowTaskRowInvoicedField model={model} />
      <WorkflowTaskRowPaidField model={model} />
    </>
  );
}

export function WorkflowTaskRowTableView({
  model,
  showAmountColumn = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly showAmountColumn?: boolean;
}): ReactElement {
  const showAmount = showAmountColumn || model.showAmount;
  const paymentGrid = model.showPaymentDates
    ? styles.workflowGridPaymentsWithDates
    : styles.workflowGridPayments;
  const rowClass = [
    styles.tableRow,
    showAmount ? `${styles.workflowGrid} ${paymentGrid}` : styles.workflowGrid,
    styles.workflowInlineRow,
    model.rowDragOver ? styles.workflowInlineRow_fileDragOver : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClass}
      role="row"
      aria-busy={model.saving || model.documentActions.uploading}
      {...model.rowDropHandlers}
    >
      <WorkflowTaskRowStatusField model={model} />
      <WorkflowTaskRowTitleField model={model} />
      {showAmount ? <WorkflowTaskRowAmountField model={model} /> : null}
      <WorkflowTaskRowNotesField model={model} />
      <WorkflowTaskRowDocumentsField model={model} />
      <WorkflowTaskRowAssigneeField model={model} />
      <WorkflowTaskRowDueField model={model} />
      {model.showPaymentDates ? <WorkflowTaskRowPaymentDateFields model={model} /> : null}
      {model.showActionsMenu ? (
        <span className={styles.taskDeleteCell}>
          <WorkflowTaskRowActionsMenuSlot model={model} />
        </span>
      ) : (
        <span className={styles.taskDeleteCell} aria-hidden />
      )}
    </div>
  );
}

export function WorkflowTaskRowMobileView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  if (model.showPaymentDates) {
    return <WorkflowTaskRowPaymentMobileView model={model} />;
  }

  return <WorkflowTaskRowWorkflowMobileView model={model} />;
}

function WorkflowTaskRowWorkflowMobileView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  const { cols, task, saving, documentActions, rowDragOver, rowDropHandlers } = model;
  const cardClass = [
    styles.card,
    styles.workflowTaskMobileCard,
    rowDragOver ? styles.workflowInlineRow_fileDragOver : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClass}
      aria-label={task.title}
      aria-busy={saving || documentActions.uploading}
      {...rowDropHandlers}
    >
      <div className={styles.workflowTaskMobileCardHeader}>
        <div className={styles.workflowTaskMobileCardTitleWrap}>
          <WorkflowTaskRowTitleField model={model} mobileHeader />
        </div>
        {model.showActionsMenu ? (
          <div className={styles.workflowTaskMobileCardActions}>
            <WorkflowTaskRowActionsMenuSlot model={model} />
          </div>
        ) : null}
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.status}</span>
          <WorkflowTaskRowStatusField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{cols.assigned}</span>
          <WorkflowTaskRowAssigneeField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.documents}</span>
          <WorkflowTaskRowDocumentsField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{cols.due}</span>
          <WorkflowTaskRowDueField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardNotes}>
        <span className={styles.projectInfoMobileLabel}>{cols.notes}</span>
        <WorkflowTaskRowNotesField model={model} mobile />
      </div>
    </article>
  );
}

function WorkflowTaskRowPaymentMobileView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  const { cols, task, saving, documentActions, rowDragOver, rowDropHandlers } = model;
  const payCols = content.projectDetail.payments.columns;
  const cardClass = [
    styles.card,
    styles.workflowTaskMobileCard,
    rowDragOver ? styles.workflowInlineRow_fileDragOver : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClass}
      aria-label={task.title}
      aria-busy={saving || documentActions.uploading}
      {...rowDropHandlers}
    >
      <div className={styles.workflowTaskMobileCardHeader}>
        <div className={styles.workflowTaskMobileCardTitleWrap}>
          <WorkflowTaskRowTitleField model={model} mobileHeader />
        </div>
        {model.showActionsMenu ? (
          <div className={styles.workflowTaskMobileCardActions}>
            <WorkflowTaskRowActionsMenuSlot model={model} />
          </div>
        ) : null}
      </div>
      <div className={styles.workflowTaskMobileCardBody}>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.status}</span>
          <WorkflowTaskRowStatusField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{cols.assigned}</span>
          <WorkflowTaskRowAssigneeField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.documents}</span>
          <WorkflowTaskRowDocumentsField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{cols.amount}</span>
          <WorkflowTaskRowAmountField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid3}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{cols.due}</span>
          <WorkflowTaskRowDueField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}>
          <span className={styles.projectInfoMobileLabel}>{payCols.invoiced}</span>
          <WorkflowTaskRowInvoicedField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{payCols.paid}</span>
          <WorkflowTaskRowPaidField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardNotes}>
        <span className={styles.projectInfoMobileLabel}>{cols.notes}</span>
        <WorkflowTaskRowNotesField model={model} mobile />
      </div>
      </div>
    </article>
  );
}
