'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS } from '@/domain/crm/buildCoreUploadPolicy';
import {
  isPaymentWorkflowTask,
  type CrmDocumentMetadata,
  type CrmWorkflowTask,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatWorkflowTaskDocumentCountLabel,
  formatWorkflowTaskNotesPreview,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { normalizeWorkflowTaskAssigneeIdForSave } from '@/presentation/features/crmAssignment/buildWorkflowTaskAssigneeOptions';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import {
  shouldOfferWorkflowTaskCustomerNotify,
  taskSupportsManualWorkflowTaskAssignedNotification,
} from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import { projectSupportsSendAttachment } from '@/presentation/features/communications/sendAttachmentEligibility';
import { useWorkflowTaskPatch } from '@/presentation/features/crmProjectDetail/useWorkflowTaskPatch';
import { validateWorkflowTaskStatusChange } from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';
import {
  dueInputValueToIso,
  workflowTaskDueToInputValue,
} from '@/presentation/features/crmProjectDetail/workflowTaskInlineUtils';
import { useWorkflowTaskDocumentActions } from '@/presentation/features/crmProjectDetail/useWorkflowTaskDocumentActions';
import { useWorkflowTaskRowFileDrop } from '@/presentation/features/crmProjectDetail/useWorkflowTaskRowFileDrop';
import { useWorkflowTaskRowAssigneeDrop } from '@/presentation/features/crmProjectDetail/useWorkflowTaskRowAssigneeDrop';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import type { WorkflowTaskPermissionDomain } from '@/presentation/features/crmProjectDetail/workflowTaskInlineRowTypes';

export type UseWorkflowTaskInlineRowInput = {
  readonly projectSlug: string;
  readonly task: CrmWorkflowTask;
  readonly docCount: number;
  readonly taskDocuments: readonly CrmDocumentMetadata[];
  readonly showAmountColumn?: boolean;
  readonly permissionDomain?: WorkflowTaskPermissionDomain;
  readonly isApiSource: boolean;
  readonly onUpdated: (task: CrmWorkflowTask) => Promise<void>;
  readonly onTaskError?: (message: string) => void;
  readonly onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function useWorkflowTaskInlineRow({
  projectSlug,
  task,
  docCount,
  taskDocuments,
  showAmountColumn = false,
  permissionDomain = 'workflow_tasks',
  isApiSource,
  onUpdated,
  onTaskError,
  onRequestArchiveTask,
}: UseWorkflowTaskInlineRowInput) {
  const wf = content.projectDetail.workflow;
  const cols = wf.columns;
  const {
    project,
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
    requestCustomerNotifyAfterAssigneeChange,
    openAssignedNotifyPromptForTask,
    openSendAttachmentDialogForTask,
    openSendAttachmentDialogForPayment,
    openEditWorkflowTask,
    syncWorkflowTaskDocuments,
    setToast,
    projectMutationsLocked,
  } = useProjectDetailShell();
  const dash = useBuildCoreDashboardContext();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const { saving, patchTask } = useWorkflowTaskPatch(onUpdated);
  const documentActions = useWorkflowTaskDocumentActions({
    projectSlug,
    workflowTaskId: task.id,
    onDocumentUploaded: onWorkflowTaskDocumentUploaded,
    onDocumentDeleted: onWorkflowTaskDocumentDeleted,
    onError: (message) => onTaskError?.(message),
    onDemoDownloadBlocked: (message) => setToast({ kind: 'success', message }),
  });
  const workflowAccess = useBuildCoreWorkflowTaskAccess();
  const sectionAccess = useBuildCoreProjectSectionAccess();
  const accessState = permissionDomain === 'payments' ? sectionAccess.payment : workflowAccess;
  const { permissions, isReady } = accessState;
  const canView = isReady && permissions.canView;
  const canEdit = isReady && permissions.canEdit && !projectMutationsLocked;
  const canDelete = isReady && permissions.canDelete && !projectMutationsLocked;
  const canUpload = isReady && permissions.canUpload && !projectMutationsLocked;
  const canDownload = isReady && permissions.canDownload;
  const canSendFiles = isReady && permissions.canSendFiles && !projectMutationsLocked;
  const canApprove = isReady && permissions.canApprove && !projectMutationsLocked;
  const canChangeStatus = canView && !projectMutationsLocked;
  const documentAccept = BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.join(',');
  const { rowDragOver: fileDragOver, rowDropHandlers: fileDropHandlers } =
    useWorkflowTaskRowFileDrop(task);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.notes ?? '');
  const [editingCustomFieldKey, setEditingCustomFieldKey] = useState<string | null>(null);
  const [customFieldDraft, setCustomFieldDraft] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState(centsToUsdInput(task.amountCents));
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dueInputRef = useRef<HTMLInputElement>(null);

  const assigneeOptions = getWorkflowTaskAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    project.summary.contact,
    dash.user?.id,
    task.assignedTo?.id
  );
  const dueInputValue = workflowTaskDueToInputValue(task.dueAt);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(task.title);
  }, [editingTitle, task.title]);

  useEffect(() => {
    if (!editingNotes) setNotesDraft(task.notes ?? '');
  }, [editingNotes, task.notes]);

  useEffect(() => {
    if (!editingAmount) setAmountDraft(centsToUsdInput(task.amountCents));
  }, [editingAmount, task.amountCents]);

  useEffect(() => {
    if (!isApiSource || task.status !== 'request_review' || taskDocuments.length > 0) return;
    void syncWorkflowTaskDocuments(task.id);
  }, [isApiSource, syncWorkflowTaskDocuments, task.id, task.status, taskDocuments.length]);

  const closeMenus = useCallback(() => {
    setStatusMenuOpen(false);
    setDocumentsMenuOpen(false);
    setAssigneeMenuOpen(false);
  }, []);

  const reportError = useCallback(
    (err: unknown) => {
      onTaskError?.(err instanceof Error ? err.message : wf.taskSubmitFailed);
    },
    [onTaskError, wf.taskSubmitFailed]
  );

  const saveTitle = useCallback(async () => {
    if (!canEdit) return;
    const title = titleDraft.trim();
    setEditingTitle(false);
    if (!title || title === task.title) {
      setTitleDraft(task.title);
      return;
    }
    try {
      await patchTask({ taskId: task.id, title });
    } catch (err) {
      setTitleDraft(task.title);
      reportError(err);
    }
  }, [canEdit, patchTask, reportError, task.id, task.title, titleDraft]);

  const saveNotes = useCallback(async () => {
    if (!canEdit) return;
    const notes = notesDraft.trim();
    const currentNotes = task.notes?.trim() ?? '';
    setEditingNotes(false);
    if (notes === currentNotes) {
      setNotesDraft(task.notes ?? '');
      return;
    }
    try {
      await patchTask({ taskId: task.id, notes: notes || null });
    } catch (err) {
      setNotesDraft(task.notes ?? '');
      reportError(err);
    }
  }, [canEdit, notesDraft, patchTask, reportError, task.id, task.notes]);

  const beginEditCustomField = useCallback(
    (fieldKey: string) => {
      if (!canEdit) return;
      closeMenus();
      setEditingTitle(false);
      setEditingNotes(false);
      setEditingAmount(false);
      setCustomFieldDraft(task.customFields?.[fieldKey] ?? '');
      setEditingCustomFieldKey(fieldKey);
    },
    [canEdit, closeMenus, task.customFields]
  );

  const cancelEditCustomField = useCallback(() => {
    setEditingCustomFieldKey(null);
    setCustomFieldDraft('');
  }, []);

  const saveCustomFieldValue = useCallback(async () => {
    if (!canEdit || editingCustomFieldKey == null) return;
    const fieldKey = editingCustomFieldKey;
    const next = customFieldDraft.trim();
    const current = (task.customFields?.[fieldKey] ?? '').trim();
    setEditingCustomFieldKey(null);
    if (next === current) {
      setCustomFieldDraft('');
      return;
    }
    try {
      await patchTask({
        taskId: task.id,
        customFieldValues: { [fieldKey]: next || null },
      });
      setCustomFieldDraft('');
    } catch (err) {
      setCustomFieldDraft(task.customFields?.[fieldKey] ?? '');
      setEditingCustomFieldKey(fieldKey);
      reportError(err);
    }
  }, [
    canEdit,
    customFieldDraft,
    editingCustomFieldKey,
    patchTask,
    reportError,
    task.customFields,
    task.id,
  ]);

  const saveStatus = useCallback(
    async (status: WorkflowTaskStatus) => {
      if (status === 'done' ? !canApprove : !canView) return;
      setStatusMenuOpen(false);
      if (status === task.status) return;
      const validation = validateWorkflowTaskStatusChange(task, status, docCount);
      if (!validation.ok) {
        onTaskError?.(validation.message);
        return;
      }
      try {
        await patchTask({ taskId: task.id, status });
      } catch (err) {
        reportError(err);
      }
    },
    [canApprove, canView, docCount, onTaskError, patchTask, reportError, task]
  );

  const isStatusDisabled = useCallback(
    (status: WorkflowTaskStatus) => {
      if (status === 'done' && !canApprove) return true;
      if (status !== 'done' && status !== task.status && !canView) return true;
      return !validateWorkflowTaskStatusChange(task, status, docCount).ok;
    },
    [canApprove, canView, docCount, task]
  );

  const saveDocumentsRequired = useCallback(
    async (documentsRequired: boolean) => {
      if (!canEdit) return;
      setDocumentsMenuOpen(false);
      if (documentsRequired === task.documentsRequired) return;
      try {
        await patchTask({ taskId: task.id, documentsRequired });
      } catch (err) {
        reportError(err);
      }
    },
    [canEdit, patchTask, reportError, task.documentsRequired, task.id]
  );

  const saveAssignee = useCallback(
    async (assignedMemberId: string) => {
      if (!canEdit) return;
      setAssigneeMenuOpen(false);
      const current = task.assignedTo?.id ?? '';
      if (assignedMemberId === current) return;
      try {
        await patchTask({
          taskId: task.id,
          assignedMemberId: normalizeWorkflowTaskAssigneeIdForSave(assignedMemberId),
        });
        if (
          shouldOfferWorkflowTaskCustomerNotify({
            isApiSource,
            previousAssigneeId: current,
            newAssigneeId: assignedMemberId,
          })
        ) {
          requestCustomerNotifyAfterAssigneeChange(
            isApiSource,
            task.id,
            current,
            assignedMemberId
          );
        }
      } catch (err) {
        reportError(err);
      }
    },
    [
      isApiSource,
      canEdit,
      patchTask,
      reportError,
      requestCustomerNotifyAfterAssigneeChange,
      task.assignedTo?.id,
      task.id,
    ]
  );

  const saveAmount = useCallback(async () => {
    if (!canEdit) return;
    const amountCents = parseUsdInputToCents(amountDraft);
    if (amountCents == null) {
      onTaskError?.('Amount must be a valid USD value.');
      setAmountDraft(centsToUsdInput(task.amountCents));
      setEditingAmount(false);
      return;
    }
    if (amountCents === task.amountCents) {
      setEditingAmount(false);
      return;
    }
    try {
      await patchTask({ taskId: task.id, amountCents });
      setEditingAmount(false);
    } catch (err) {
      reportError(err);
    }
  }, [amountDraft, canEdit, onTaskError, patchTask, reportError, task.amountCents, task.id]);

  const saveDue = useCallback(
    async (value: string) => {
      if (!canEdit) return;
      const nextIso = dueInputValueToIso(value);
      const currentIso = task.dueAt;
      if (nextIso === currentIso || (nextIso == null && currentIso == null)) return;
      try {
        await patchTask({ taskId: task.id, dueAt: nextIso });
      } catch (err) {
        reportError(err);
      }
    },
    [canEdit, patchTask, reportError, task.dueAt, task.id]
  );

  const saveInvoiced = useCallback(
    async (value: string) => {
      if (!canEdit) return;
      const nextIso = dueInputValueToIso(value);
      const currentIso = task.invoicedAt;
      if (nextIso === currentIso || (nextIso == null && currentIso == null)) return;
      try {
        await patchTask({ taskId: task.id, invoicedAt: nextIso });
      } catch (err) {
        reportError(err);
      }
    },
    [canEdit, patchTask, reportError, task.id, task.invoicedAt]
  );

  const savePaid = useCallback(
    async (value: string) => {
      if (!canEdit) return;
      const nextIso = dueInputValueToIso(value);
      const currentIso = task.paidAt;
      if (nextIso === currentIso || (nextIso == null && currentIso == null)) return;
      try {
        await patchTask({ taskId: task.id, paidAt: nextIso });
      } catch (err) {
        reportError(err);
      }
    },
    [canEdit, patchTask, reportError, task.id, task.paidAt    ]
  );

  const { assigneeDragOver, assigneeDropHandlers } = useWorkflowTaskRowAssigneeDrop(
    canEdit,
    (memberId) => {
      void saveAssignee(memberId);
    }
  );

  const rowDragOver = fileDragOver || assigneeDragOver;
  const rowDropHandlers = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (canUpload) {
        fileDropHandlers.onDragOver(event as DragEvent<HTMLDivElement>);
      }
      assigneeDropHandlers.onDragOver(event);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (canUpload) {
        fileDropHandlers.onDragLeave(event as DragEvent<HTMLDivElement>);
      }
      assigneeDropHandlers.onDragLeave(event);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (canUpload) {
        fileDropHandlers.onDrop(event as DragEvent<HTMLDivElement>);
      }
      assigneeDropHandlers.onDrop(event);
    },
  };

  const showAmount = showAmountColumn || isPaymentWorkflowTask(task);
  const showPaymentDates = isPaymentWorkflowTask(task);
  const effectiveDocCount = Math.max(docCount, taskDocuments.length);
  const hasDocuments = effectiveDocCount > 0;
  const awaitingCustomerReview = task.status === 'request_review';
  const documentsLabel = hasDocuments
    ? `${effectiveDocCount} ${wf.documentsCountSuffix}`
    : awaitingCustomerReview
      ? wf.documentsReview
      : !task.documentsRequired
        ? wf.documentsNotRequired
        : wf.documentsNone;
  const documentsMobileLabel = hasDocuments
    ? formatWorkflowTaskDocumentCountLabel(effectiveDocCount)
    : awaitingCustomerReview
      ? wf.documentsReview
      : !task.documentsRequired
        ? wf.documentsNotRequired
        : wf.documentsNone;
  const showDocumentsIcon = hasDocuments || task.documentsRequired || awaitingCustomerReview;
  const canOpenDocumentsMenu =
    canView && (hasDocuments || awaitingCustomerReview || canUpload || canEdit);
  const showAssignedNotification =
    canEdit && taskSupportsManualWorkflowTaskAssignedNotification(task, isApiSource);
  const showSendAttachment =
    canSendFiles && projectSupportsSendAttachment(project, assignmentCatalog, isApiSource);
  const notesPreview = formatWorkflowTaskNotesPreview(task.notes);
  const notesTitle =
    task.notes?.replace(/\s+/g, ' ').trim() && notesPreview.endsWith('…')
      ? task.notes.replace(/\s+/g, ' ').trim()
      : undefined;
  const showActionsMenu =
    canEdit ||
    (canDelete && onRequestArchiveTask != null) ||
    showAssignedNotification ||
    showSendAttachment;

  return {
    wf,
    cols,
    task,
    taskDocuments,
    saving,
    documentActions,
    rowDropHandlers,
    rowDragOver,
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    editingNotes,
    setEditingNotes,
    notesDraft,
    setNotesDraft,
    editingCustomFieldKey,
    customFieldDraft,
    setCustomFieldDraft,
    beginEditCustomField,
    cancelEditCustomField,
    saveCustomFieldValue,
    editingAmount,
    setEditingAmount,
    amountDraft,
    setAmountDraft,
    statusMenuOpen,
    setStatusMenuOpen,
    documentsMenuOpen,
    setDocumentsMenuOpen,
    assigneeMenuOpen,
    setAssigneeMenuOpen,
    statusRef,
    documentsRef,
    assigneeRef,
    dueInputRef,
    assigneeOptions,
    dueInputValue,
    closeMenus,
    saveTitle,
    saveNotes,
    saveStatus,
    isStatusDisabled,
    saveDocumentsRequired,
    saveAssignee,
    saveAmount,
    saveDue,
    saveInvoiced,
    savePaid,
    canView,
    canEdit,
    canDelete,
    canUpload,
    canDownload,
    canApprove,
    canChangeStatus,
    documentAccept,
    isApiSource,
    syncWorkflowTaskDocuments,
    showAmount,
    showPaymentDates,
    documentsLabel,
    documentsMobileLabel,
    documentCount: effectiveDocCount,
    showDocumentsIcon,
    canOpenDocumentsMenu,
    awaitingCustomerReview,
    hasDocuments,
    showAssignedNotification,
    showSendAttachment,
    notesPreview,
    notesTitle,
    showActionsMenu,
    openEditWorkflowTask,
    openAssignedNotifyPromptForTask,
    openSendAttachmentDialogForTask,
    openSendAttachmentDialogForPayment,
    openSendAttachmentForRow: () => {
      if (permissionDomain === 'payments') {
        openSendAttachmentDialogForPayment(task, taskDocuments);
      } else {
        openSendAttachmentDialogForTask(task, taskDocuments);
      }
    },
    permissionDomain,
    onRequestArchiveTask,
  };
}

export type WorkflowTaskInlineRowModel = ReturnType<typeof useWorkflowTaskInlineRow>;
