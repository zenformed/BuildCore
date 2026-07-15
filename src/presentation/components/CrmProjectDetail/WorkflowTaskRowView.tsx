'use client';

import type { MutableRefObject, ReactElement, RefObject } from 'react';
import { useRef } from 'react';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
  formatWorkflowTaskCompactTitle,
  formatWorkflowTaskNotesDisplay,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { workflowTaskDueToInputValue } from '@/presentation/features/crmProjectDetail/workflowTaskInlineUtils';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import type { WorkflowTaskInlineRowModel } from '@/presentation/features/crmProjectDetail/useWorkflowTaskInlineRow';
import {
  WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
  WORKFLOW_TASK_NOTES_FIELD_KEY,
  WORKFLOW_TASK_STATUS_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';
import { useBuildCoreFieldLabels } from '@/presentation/providers/BuildCoreFieldLabelsProvider';
import { WorkflowFieldLabelText } from './EditableFieldLabelHeader';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import { WorkflowTaskRowActionsMenu } from './WorkflowTaskRowActionsMenu';
import { WorkflowTaskTableCustomColumnCells, resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { PaymentTableCustomColumnCells } from './PaymentTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import type { WorkflowTaskCustomFieldScope } from '@/domain/buildcore/workflowTaskCustomFields';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { useWorkflowTaskPreviewPopover } from './useWorkflowTaskPreviewPopover';
import { useCellHoverPreview } from './useCellHoverPreview';
import previewStyles from './WorkflowTaskPreviewCard.module.css';
import styles from './ProjectDetail.module.css';

const DOCUMENTS_PREVIEW_NAME_LIMIT = 5;

function statusBadgeClass(status: string): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

function isDesktopWorkflowTableRow(
  _model: WorkflowTaskInlineRowModel,
  mobile: boolean,
  compact: boolean
): boolean {
  return !mobile && !compact;
}

function WorkflowTaskRowActionsMenuSlot({
  model,
  compact = false,
  actionsButtonRef,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly compact?: boolean;
  readonly actionsButtonRef?: MutableRefObject<HTMLButtonElement | null>;
}): ReactElement | null {
  if (!model.showActionsMenu) return null;

  const notesLabel = model.task.notes?.trim() ? model.wf.editNotes : model.wf.addNotes;

  return (
    <WorkflowTaskRowActionsMenu
      taskTitle={model.task.title}
      disabled={model.saving}
      canEdit={model.canEdit}
      canDelete={model.canDelete}
      showSendAttachment={model.showSendAttachment}
      showAssignedNotification={model.showAssignedNotification}
      showEditNotes={compact && model.canEdit}
      editNotesLabel={notesLabel}
      dotsOrientation="vertical"
      actionsButtonRef={actionsButtonRef}
      onEdit={() => {
        model.closeMenus();
        model.openEditWorkflowTask(model.task);
      }}
      onEditNotes={() => {
        model.closeMenus();
        model.setEditingTitle(false);
        model.cancelEditCustomField();
        model.setNotesDraft(model.task.notes ?? '');
        model.setEditingNotes(true);
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
        model.openSendAttachmentForRow();
      }}
      onNotifyAssigned={() => {
        model.closeMenus();
        model.openAssignedNotifyPromptForTask(model.task);
      }}
    />
  );
}

function WorkflowTaskCompactNotesPopover({
  model,
  anchorRef,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly anchorRef: MutableRefObject<HTMLButtonElement | null>;
}): ReactElement | null {
  const { editingNotes, canEdit, saving, notesDraft, task } = model;
  const { getFieldLabel } = useBuildCoreFieldLabels();

  if (!editingNotes || !canEdit) {
    return null;
  }

  return (
    <WorkflowInlineMenu
      open={editingNotes}
      onClose={() => void model.saveNotes()}
      anchorRef={anchorRef}
      align="end"
      sizeToContent
      portalClassName={`${styles.inlineMenu_portal} ${styles.workflowTaskCompactNotes_portal}`}
    >
      <div className={styles.workflowTaskCompactNotesPanel}>
        <label className={styles.workflowTaskCompactNotesPanelLabel} htmlFor={`task-notes-${task.id}`}>
          {getFieldLabel(WORKFLOW_TASK_NOTES_FIELD_KEY)}
        </label>
        <textarea
          id={`task-notes-${task.id}`}
          className={styles.workflowTaskCompactNotesPanelInput}
          value={notesDraft}
          disabled={saving}
          rows={4}
          onChange={(e) => model.setNotesDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              model.setNotesDraft(task.notes ?? '');
              model.setEditingNotes(false);
            }
          }}
          autoFocus
        />
      </div>
    </WorkflowInlineMenu>
  );
}

function WorkflowTaskCompactCardBody({
  model,
  showAmount = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly showAmount?: boolean;
}): ReactElement {
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className={styles.workflowTaskCompactRow1}>
        <div className={styles.workflowTaskCompactTitleWrap}>
          <WorkflowTaskRowTitleField model={model} compact />
        </div>
        {model.showActionsMenu ? (
          <div className={styles.workflowTaskCompactActions}>
            <WorkflowTaskRowActionsMenuSlot
              model={model}
              compact
              actionsButtonRef={actionsButtonRef}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.workflowTaskCompactRow2}>
        <WorkflowTaskRowStatusField model={model} compact />
        <span className={styles.workflowTaskCompactRow2Spacer} aria-hidden />
        <div className={styles.workflowTaskCompactRow2End}>
          {showAmount ? <WorkflowTaskRowAmountField model={model} compact /> : null}
          <WorkflowTaskRowDueField model={model} compact />
          <WorkflowTaskRowDocumentsField model={model} compact />
          <WorkflowTaskRowAssigneeField model={model} compact />
        </div>
      </div>
      <WorkflowTaskCompactNotesPopover model={model} anchorRef={actionsButtonRef} />
    </>
  );
}

function WorkflowTaskRowStatusField({
  model,
  mobile = false,
  compact = false,
  layout = 'combined',
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
  /** Desktop table: split color-dot and status word into separate grid cells. */
  readonly layout?: 'combined' | 'dot' | 'label';
}): ReactElement {
  const wrapClass =
    layout === 'dot'
      ? styles.workflowStatusIconCell
      : layout === 'label'
        ? `${styles.inlineCellWrap} ${styles.workflowStatusLabelCell}`
        : compact
          ? styles.workflowTaskCompactControl
          : mobile
            ? styles.workflowTaskMobileCardControl
            : `${styles.inlineCellWrap} ${styles.workflowStatusCell}`;
  const useDotStatus = !mobile;
  const statusLabel = formatWorkflowStatus(model.task.status);
  const openStatusMenu = () => {
    model.setDocumentsMenuOpen(false);
    model.setAssigneeMenuOpen(false);
    model.setStatusMenuOpen((open) => !open);
  };

  if (layout === 'dot') {
    return (
      <span className={wrapClass} role="cell">
        <button
          type="button"
          className={styles.workflowStatusIconBtn}
          disabled={model.saving || !model.canChangeStatus}
          aria-expanded={model.statusMenuOpen}
          aria-label={statusLabel}
          onClick={openStatusMenu}
        >
          <span className={`${styles.statusDotIndicator} ${statusBadgeClass(model.task.status)}`}>
            <span className={styles.statusDot} aria-hidden />
          </span>
        </button>
      </span>
    );
  }

  const triggerContent =
    layout === 'label' || useDotStatus ? (
      layout === 'label' ? (
        <span className={styles.statusDotText}>{statusLabel}</span>
      ) : (
        <span className={`${styles.statusDotIndicator} ${statusBadgeClass(model.task.status)}`}>
          <span className={styles.statusDot} aria-hidden />
          <span className={styles.statusDotText}>{statusLabel}</span>
        </span>
      )
    ) : (
      <span className={`${styles.statusPill} ${statusBadgeClass(model.task.status)}`}>
        {statusLabel}
      </span>
    );

  return (
    <span className={wrapClass} ref={layout === 'label' || layout === 'combined' ? model.statusRef : undefined}>
      <button
        type="button"
        className={styles.inlinePillBtn}
        disabled={model.saving || !model.canChangeStatus}
        aria-expanded={model.statusMenuOpen}
        aria-label={statusLabel}
        onClick={openStatusMenu}
      >
        {triggerContent}
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
            {useDotStatus ? (
              <span className={`${styles.statusDotIndicator} ${statusBadgeClass(status)}`}>
                <span className={styles.statusDot} aria-hidden />
                <span className={styles.statusDotText}>{formatWorkflowStatus(status)}</span>
              </span>
            ) : (
              <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                {formatWorkflowStatus(status)}
              </span>
            )}
          </button>
        ))}
      </WorkflowInlineMenu>
    </span>
  );
}

function WorkflowTaskRowPrimaryField({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  const statusLabel = formatWorkflowStatus(model.task.status);
  const openStatusMenu = () => {
    model.setDocumentsMenuOpen(false);
    model.setAssigneeMenuOpen(false);
    model.setStatusMenuOpen((open) => !open);
  };

  return (
    <span className={styles.workflowPrimaryCell} role="cell">
      <span className={styles.workflowPrimaryStatusLead} ref={model.statusRef}>
        <button
          type="button"
          className={styles.workflowStatusIconBtn}
          disabled={model.saving || !model.canChangeStatus}
          aria-expanded={model.statusMenuOpen}
          aria-label={statusLabel}
          onClick={openStatusMenu}
        >
          <span className={`${styles.statusDotIndicator} ${statusBadgeClass(model.task.status)}`}>
            <span className={styles.statusDot} aria-hidden />
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
              disabled={
                model.saving || status === model.task.status || model.isStatusDisabled(status)
              }
              title={
                status === 'done' && !model.canApprove ? model.wf.statusDoneNotAllowed : undefined
              }
              onClick={() => void model.saveStatus(status)}
            >
              <span className={`${styles.statusDotIndicator} ${statusBadgeClass(status)}`}>
                <span className={styles.statusDot} aria-hidden />
                <span className={styles.statusDotText}>{formatWorkflowStatus(status)}</span>
              </span>
            </button>
          ))}
        </WorkflowInlineMenu>
      </span>
      <WorkflowTaskRowTitleField model={model} />
    </span>
  );
}

function WorkflowTaskRowTitleField({
  model,
  mobile = false,
  mobileHeader = false,
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly mobileHeader?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const { task, saving, canEdit, editingTitle, titleDraft } = model;
  const compactTitle = formatWorkflowTaskCompactTitle(task.title);
  const isMobileLayout = useDashboardMobileLayout();
  const { project } = useProjectDetailShell();
  const { catalogForProject } = useBuildCorePipelineStages();
  const previewScope: WorkflowTaskCustomFieldScope =
    model.showAmount || model.permissionDomain === 'payments' ? 'payment' : 'workflow_task';
  const { activeDefinitions } = useBuildCoreWorkflowTaskCustomFieldsForScope(previewScope);
  const stageLabel =
    previewScope === 'workflow_task'
      ? formatWorkflowStageLabel(
          task.stageSlug,
          catalogForProject({ parentProjectId: project.summary.parentProjectId })
        )
      : null;
  const useTapPreview = isMobileLayout || mobile || mobileHeader;
  const preview = useWorkflowTaskPreviewPopover({
    task,
    scope: previewScope,
    customFieldDefinitions: activeDefinitions,
    stageLabel,
    documentCount: model.documentCount,
    enabled: !editingTitle && !compact,
    interactionMode: useTapPreview ? 'tap' : 'hover',
    previewTrigger: 'icon',
    showOpenDetails: canEdit,
    onOpenDetails: () => {
      model.closeMenus();
      model.openEditWorkflowTask(task);
    },
  });
  const useCardPreviewIcon = !useTapPreview;

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
          compact
            ? styles.workflowTaskCompactTitleBtn
            : mobileHeader
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
          model.cancelEditCustomField();
          model.setTitleDraft(task.title);
          model.setEditingTitle(true);
        }}
      >
        <span
          className={
            compact
              ? styles.workflowTaskCompactTitle
              : mobileHeader
                ? styles.workflowTaskMobileCardTitle
                : styles.taskTitleBtnText
          }
        >
          {compact ? compactTitle : task.title}
        </span>
      </button>
    ) : (
      <span
        className={
          compact
            ? styles.workflowTaskCompactTitle
            : mobileHeader
              ? styles.workflowTaskMobileCardTitle
              : styles.taskTitleBtnText
        }
        title={task.title}
      >
        {compact ? compactTitle : task.title}
      </span>
    );

  if (compact) {
    return titleContent;
  }

  const titleHoverFocusable =
    !useTapPreview && !editingTitle && preview.toggleButtonProps == null;

  const titleWithPreview = (
    <>
      <div
        ref={preview.titleAnchorRef as RefObject<HTMLDivElement>}
        className={[
          previewStyles.previewTitleAnchor,
          titleHoverFocusable ? previewStyles.previewTitleAnchor_focusable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={titleHoverFocusable ? 0 : undefined}
        {...preview.anchorHandlers}
      >
        {preview.toggleButtonProps ? (
          <button ref={preview.iconAnchorRef as RefObject<HTMLButtonElement>} {...preview.toggleButtonProps}>
            <span
              className={
                useCardPreviewIcon ? previewStyles.previewCardIcon : previewStyles.previewInfoIcon
              }
              aria-hidden
            />
          </button>
        ) : null}
        {titleContent}
      </div>
      {preview.menu}
    </>
  );

  if (mobileHeader) {
    return titleWithPreview;
  }

  return (
    <span className={mobile ? styles.workflowTaskMobileCardControl : styles.taskTitleCell}>
      {titleWithPreview}
    </span>
  );
}

function WorkflowTaskRowNotesField({
  model,
  mobile = false,
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const { saving, canEdit, editingNotes, notesDraft, notesPreview, notesTitle, task, wf } = model;
  const notesClass = compact
    ? styles.workflowTaskCompactNotesWrap
    : mobile
      ? styles.workflowTaskMobileCardControl
      : `${styles.workflowNotesCell} ${styles.workflowMetaCell}`;
  const notesDisplay = formatWorkflowTaskNotesDisplay(task.notes);
  const fullNotes = task.notes?.trim() ?? '';
  const useNotesHoverPreview =
    isDesktopWorkflowTableRow(model, mobile, compact) &&
    !editingNotes &&
    fullNotes.length > 0 &&
    notesPreview !== '—';

  const notesPreviewPopover = useCellHoverPreview({
    enabled: useNotesHoverPreview,
    ariaLabel: wf.notesFullPreviewAriaLabel,
    panelClassName: `${styles.cellHoverPreviewPanel} ${styles.cellHoverPreviewNotes}`,
    children: fullNotes,
  });

  const previewTextClass = compact
    ? styles.workflowTaskCompactNotes
    : mobile
      ? styles.workflowTaskMobileCardNotesText
      : styles.workflowNotesPreview;

  return (
    <span className={notesClass}>
      {editingNotes && canEdit ? (
        <textarea
          className={`${styles.inlineFieldInput} ${
            compact
              ? styles.workflowTaskCompactNotesInput
              : styles.workflowTaskMobileCardNotesInput
          }`}
          value={notesDraft}
          disabled={saving}
          rows={compact ? 2 : 3}
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
        <>
          <button
            type="button"
            ref={(node) => {
              (notesPreviewPopover.anchorRef as MutableRefObject<HTMLElement | null>).current = node;
            }}
            className={
              compact
                ? styles.workflowTaskCompactNotesBtn
                : mobile
                  ? styles.workflowTaskMobileCardNotesBtn
                  : styles.inlineCellBtn
            }
            disabled={saving}
            title={useNotesHoverPreview ? undefined : notesTitle}
            {...notesPreviewPopover.anchorHandlers}
            onClick={() => {
              notesPreviewPopover.hide();
              model.closeMenus();
              model.setEditingTitle(false);
              model.cancelEditCustomField();
              model.setNotesDraft(task.notes ?? '');
              model.setEditingNotes(true);
            }}
          >
            <span className={previewTextClass}>
              {compact || mobile ? notesDisplay : notesPreview}
            </span>
          </button>
          {notesPreviewPopover.menu}
        </>
      ) : (
        <>
          <span
            ref={(node) => {
              (notesPreviewPopover.anchorRef as MutableRefObject<HTMLElement | null>).current = node;
            }}
            className={previewTextClass}
            title={useNotesHoverPreview ? undefined : notesTitle}
            tabIndex={useNotesHoverPreview ? 0 : undefined}
            {...notesPreviewPopover.anchorHandlers}
          >
            {compact || mobile ? notesDisplay : notesPreview}
          </span>
          {notesPreviewPopover.menu}
        </>
      )}
    </span>
  );
}

function WorkflowTaskRowDocumentsField({
  model,
  mobile = false,
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const wrapClass = compact
    ? styles.workflowTaskCompactControl
    : mobile
      ? styles.workflowTaskMobileCardControl
      : `${styles.inlineCellWrap} ${styles.workflowMetaCell}`;
  const useDesktopWorkflowDocs = isDesktopWorkflowTableRow(model, mobile, compact);
  const documentsText = mobile || compact
    ? model.documentsMobileLabel
    : useDesktopWorkflowDocs && model.hasDocuments
      ? String(model.documentCount)
      : model.documentsLabel;
  const compactDocumentsText =
    compact && model.hasDocuments ? String(model.documentCount) : compact ? '' : documentsText;
  const { getFieldLabel } = useBuildCoreFieldLabels();
  const documentsFieldLabel = getFieldLabel(WORKFLOW_TASK_DOCUMENTS_FIELD_KEY);
  const documentsAriaLabel =
    useDesktopWorkflowDocs && model.hasDocuments
      ? model.wf.documentsCountAriaLabel(model.documentCount)
      : compact && !compactDocumentsText
        ? documentsFieldLabel
        : undefined;

  const previewNames = model.taskDocuments.slice(0, DOCUMENTS_PREVIEW_NAME_LIMIT);
  const previewMoreCount = Math.max(0, model.taskDocuments.length - previewNames.length);
  const docsHoverEnabled =
    useDesktopWorkflowDocs && model.hasDocuments && !model.documentsMenuOpen;

  const documentsPreviewPopover = useCellHoverPreview({
    enabled: docsHoverEnabled,
    ariaLabel: model.wf.documentsCountAriaLabel(model.documentCount),
    panelClassName: `${styles.cellHoverPreviewPanel} ${styles.cellHoverPreviewDocuments}`,
    children: (
      <>
        <p className={styles.cellHoverPreviewDocsHeading}>
          {model.wf.documentsPreviewHeading(model.documentCount)}
        </p>
        {previewNames.length > 0 ? (
          <ul className={styles.cellHoverPreviewDocsList}>
            {previewNames.map((doc) => (
              <li key={doc.id}>
                <span className={styles.cellHoverPreviewDocName} title={doc.name}>
                  {doc.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.cellHoverPreviewDocsHint}>{model.wf.documentsPreviewOpenHint}</p>
        )}
        {previewMoreCount > 0 ? (
          <p className={styles.cellHoverPreviewDocsMore}>
            {model.wf.documentsPreviewMore(previewMoreCount)}
          </p>
        ) : null}
      </>
    ),
  });

  return (
    <span className={wrapClass} ref={model.documentsRef}>
      <button
        type="button"
        ref={(node) => {
          (documentsPreviewPopover.anchorRef as MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={`${styles.inlineCellBtn} ${styles.documentsCell}${
          compact ? ` ${styles.workflowTaskCompactMetaBtn}` : ''
        }`}
        disabled={model.saving || !model.canOpenDocumentsMenu}
        aria-expanded={model.documentsMenuOpen}
        aria-label={documentsAriaLabel}
        {...documentsPreviewPopover.anchorHandlers}
        onClick={() => {
          documentsPreviewPopover.hide();
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
        {compact || model.showDocumentsIcon ? (
          <span className={styles.documentsIcon} aria-hidden />
        ) : null}
        {(compact ? compactDocumentsText : documentsText) ? (
          <span
            className={
              compact
                ? styles.workflowTaskCompactMeta
                : mobile
                  ? styles.workflowTaskMobileCardValue
                  : !model.task.documentsRequired && !model.hasDocuments
                    ? styles.documentsNotRequired
                    : undefined
            }
          >
            {compact ? compactDocumentsText : documentsText}
          </span>
        ) : null}
      </button>
      {documentsPreviewPopover.menu}
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
            {model.canDownload ? (
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
            ) : null}
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
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const wrapClass = compact
    ? styles.workflowTaskCompactAssignee
    : mobile
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
        {(mobile || compact) && !model.canEdit ? (
          assigneeContent
        ) : (
          <button
            type="button"
            className={
              compact
                ? styles.workflowTaskCompactAssigneeBtn
                : mobile
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
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const dueClass = compact
    ? styles.workflowTaskCompactControl
    : mobile
      ? styles.workflowTaskMobileCardControl
      : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const dueDisplay = model.task.dueAt ? formatShortDate(model.task.dueAt) : '';
  const { getFieldLabel } = useBuildCoreFieldLabels();
  const dueLabel = getFieldLabel(WORKFLOW_TASK_DUE_FIELD_KEY);
  const dueAriaLabel =
    compact || !dueDisplay
      ? dueDisplay
        ? `${dueLabel}: ${dueDisplay}`
        : `${dueLabel}. Set due date.`
      : undefined;

  const dueButtonContent = dueDisplay ? (
    compact ? (
      <span className={styles.workflowTaskCompactDueContent}>
        <span className={styles.dueIcon} aria-hidden />
        <span className={styles.workflowTaskCompactMeta}>{dueDisplay}</span>
      </span>
    ) : (
      <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{dueDisplay}</span>
    )
  ) : (
    <span className={styles.dueIcon} aria-hidden />
  );

  return (
    <span className={dueClass}>
      <button
        type="button"
        className={
          compact
            ? `${styles.inlineCellBtn} ${styles.workflowTaskCompactMetaBtn} ${styles.workflowTaskCompactDueBtn}`
            : mobile
              ? styles.workflowTaskMobileCardValueBtn
              : styles.inlineCellBtn
        }
        disabled={model.saving || !model.canEdit}
        aria-label={dueAriaLabel}
        onClick={() => {
          model.closeMenus();
          model.dueInputRef.current?.showPicker?.();
          model.dueInputRef.current?.click();
        }}
      >
        {dueButtonContent}
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
  compact = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const { task, saving, canEdit, editingAmount, amountDraft } = model;
  const wrapClass = compact
    ? styles.workflowTaskCompactControl
    : mobile
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
          className={
            compact
              ? styles.workflowTaskCompactMetaBtn
              : mobile
                ? styles.workflowTaskMobileCardValueBtn
                : styles.inlineCellBtn
          }
          disabled={saving}
          onClick={() => {
            model.closeMenus();
            model.cancelEditCustomField();
            model.setAmountDraft(centsToUsdInput(task.amountCents));
            model.setEditingAmount(true);
          }}
        >
          <span className={compact || mobile ? styles.workflowTaskCompactMeta : undefined}>
            {amountDisplay}
          </span>
        </button>
      ) : (
        <span
          className={
            compact || mobile ? styles.workflowTaskCompactMeta : styles.inlineCellBtn
          }
        >
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
  const { task, saving, canEdit } = model;
  const payCols = content.projectDetail.payments.columns;
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const invoicedDisplay = task.invoicedAt ? formatShortDate(task.invoicedAt) : '';
  const invoicedAriaLabel = invoicedDisplay
    ? `${payCols.invoiced}: ${invoicedDisplay}`
    : `${payCols.invoiced}. Set invoiced date.`;

  return (
    <span className={wrapClass}>
      <button
        type="button"
        className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
        disabled={saving || !canEdit}
        aria-label={invoicedAriaLabel}
        onClick={(e) => {
          const input = e.currentTarget.nextElementSibling as HTMLInputElement | null;
          input?.showPicker?.();
          input?.click();
        }}
      >
        {invoicedDisplay ? (
          <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{invoicedDisplay}</span>
        ) : (
          <span className={styles.dueIcon} aria-hidden />
        )}
      </button>
      <input
        type="date"
        className={styles.inlineDateInput}
        value={workflowTaskDueToInputValue(task.invoicedAt)}
        disabled={saving || !canEdit}
        tabIndex={-1}
        aria-hidden
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
  const { task, saving, canEdit } = model;
  const payCols = content.projectDetail.payments.columns;
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineDueCell} ${styles.workflowMetaCell}`;
  const paidDisplay = task.paidAt ? formatShortDate(task.paidAt) : '';
  const paidAriaLabel = paidDisplay
    ? `${payCols.paid}: ${paidDisplay}`
    : `${payCols.paid}. Set paid date.`;

  return (
    <span className={wrapClass}>
      <button
        type="button"
        className={mobile ? styles.workflowTaskMobileCardValueBtn : styles.inlineCellBtn}
        disabled={saving || !canEdit}
        aria-label={paidAriaLabel}
        onClick={(e) => {
          const input = e.currentTarget.nextElementSibling as HTMLInputElement | null;
          input?.showPicker?.();
          input?.click();
        }}
      >
        {paidDisplay ? (
          <span className={mobile ? styles.workflowTaskMobileCardValue : undefined}>{paidDisplay}</span>
        ) : (
          <span className={styles.dueIcon} aria-hidden />
        )}
      </button>
      <input
        type="date"
        className={styles.inlineDateInput}
        value={workflowTaskDueToInputValue(task.paidAt)}
        disabled={saving || !canEdit}
        tabIndex={-1}
        aria-hidden
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
  enableCustomColumns = false,
  enablePaymentCustomColumns = false,
}: {
  readonly model: WorkflowTaskInlineRowModel;
  readonly showAmountColumn?: boolean;
  readonly enableCustomColumns?: boolean;
  readonly enablePaymentCustomColumns?: boolean;
}): ReactElement {
  const { gridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const showAmount = showAmountColumn || model.showAmount;
  const paymentGrid = model.showPaymentDates
    ? styles.workflowGridPaymentsWithDates
    : styles.workflowGridPayments;
  const opsGridClass =
    enableCustomColumns && !showAmount
      ? resolveWorkflowOpsGridClassName(true, gridClassName)
      : styles.workflowGrid;
  const rowSelection = useWorkflowTaskRowSelection();
  const showRowSelect = rowSelection != null && !showAmount;
  const isSelected =
    rowSelection != null && !showAmount && rowSelection.selectedIds.has(model.task.id);
  const rowClass = [
    styles.tableRow,
    showAmount ? `${styles.workflowGrid} ${paymentGrid}` : opsGridClass,
    styles.workflowInlineRow,
    model.rowDragOver ? styles.workflowInlineRow_fileDragOver : '',
    isSelected ? styles.tableRow_selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClass}
      role="row"
      aria-busy={model.saving || model.documentActions.uploading}
      aria-selected={showRowSelect ? isSelected : undefined}
      {...model.rowDropHandlers}
    >
      {rowSelection != null && !showAmount ? (
        <span className={styles.workflowSelectCell} role="cell">
          <BulkSelectCheckbox
            checked={isSelected}
            ariaLabel={rowSelection.selectItemAriaLabel(model.task.title)}
            onChange={() => rowSelection.onToggle(model.task.id)}
          />
        </span>
      ) : null}
      {!showAmount ? (
        <WorkflowTaskRowPrimaryField model={model} />
      ) : (
        <>
          <WorkflowTaskRowStatusField model={model} />
          <WorkflowTaskRowTitleField model={model} />
        </>
      )}
      {enableCustomColumns && !showAmount ? (
        <WorkflowTaskTableCustomColumnCells
          task={model.task}
          canEdit={model.canEdit}
          saving={model.saving}
          editingFieldKey={model.editingCustomFieldKey}
          draft={model.customFieldDraft}
          onDraftChange={model.setCustomFieldDraft}
          onBeginEdit={model.beginEditCustomField}
          onSave={() => void model.saveCustomFieldValue()}
          onCancel={model.cancelEditCustomField}
        />
      ) : null}
      {enablePaymentCustomColumns && showAmount ? (
        <PaymentTableCustomColumnCells
          task={model.task}
          canEdit={model.canEdit}
          saving={model.saving}
          editingFieldKey={model.editingCustomFieldKey}
          draft={model.customFieldDraft}
          onDraftChange={model.setCustomFieldDraft}
          onBeginEdit={model.beginEditCustomField}
          onSave={() => void model.saveCustomFieldValue()}
          onCancel={model.cancelEditCustomField}
        />
      ) : null}
      <WorkflowTaskRowNotesField model={model} />
      <WorkflowTaskRowDocumentsField model={model} />
      <WorkflowTaskRowAssigneeField model={model} />
      {showAmount ? <WorkflowTaskRowAmountField model={model} /> : null}
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

export function WorkflowTaskRowCompactView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  if (model.showPaymentDates) {
    return <WorkflowTaskRowPaymentCompactView model={model} />;
  }

  return <WorkflowTaskRowWorkflowCompactView model={model} />;
}

function WorkflowTaskRowWorkflowCompactView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  const { task, saving, documentActions, rowDragOver, rowDropHandlers } = model;
  const cardClass = [
    styles.card,
    styles.workflowTaskCompactCard,
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
      <WorkflowTaskCompactCardBody model={model} />
    </article>
  );
}

function WorkflowTaskRowPaymentCompactView({
  model,
}: {
  readonly model: WorkflowTaskInlineRowModel;
}): ReactElement {
  const { task, saving, documentActions, rowDragOver, rowDropHandlers } = model;
  const cardClass = [
    styles.card,
    styles.workflowTaskCompactCard,
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
      <WorkflowTaskCompactCardBody model={model} showAmount />
    </article>
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
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowStatusField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_ASSIGNED_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowAssigneeField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_DOCUMENTS_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowDocumentsField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowDueField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardNotes}>
        <WorkflowFieldLabelText
          fieldKey={WORKFLOW_TASK_NOTES_FIELD_KEY}
          className={styles.projectInfoMobileLabel}
        />
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
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowStatusField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_ASSIGNED_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowAssigneeField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_DOCUMENTS_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
          <WorkflowTaskRowDocumentsField model={model} mobile />
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{cols.amount}</span>
          <WorkflowTaskRowAmountField model={model} mobile />
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid3}>
        <div className={styles.workflowTaskMobileCardCell}>
          <WorkflowFieldLabelText
            fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY}
            className={styles.projectInfoMobileLabel}
          />
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
        <WorkflowFieldLabelText
          fieldKey={WORKFLOW_TASK_NOTES_FIELD_KEY}
          className={styles.projectInfoMobileLabel}
        />
        <WorkflowTaskRowNotesField model={model} mobile />
      </div>
      </div>
    </article>
  );
}
