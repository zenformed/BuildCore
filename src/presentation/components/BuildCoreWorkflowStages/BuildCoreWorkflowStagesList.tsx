'use client';

import { useMemo, useState, type DragEvent, type ReactElement } from 'react';
import type { OrgPipelineStageRecord, PipelineStageScope } from '@/domain/buildcore/orgPipelineStages';
import { isReservedPipelineStageSlug } from '@/domain/buildcore/orgPipelineStages';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { DetailPanelHeaderButton } from '@/presentation/components/CrmProjectDetail/DetailPanelHeaderButton';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreWorkflowStagesPage } from '@/presentation/features/buildCoreWorkflowStages/useBuildCoreWorkflowStagesPage';
import styles from './BuildCoreWorkflowStages.module.css';

type StageEditorState =
  | { mode: 'add' }
  | { mode: 'edit'; stage: OrgPipelineStageRecord }
  | { mode: 'delete'; stage: OrgPipelineStageRecord }
  | null;

export type BuildCoreWorkflowStagesListProps = {
  readonly scope: PipelineStageScope;
  readonly embeddedInTab?: boolean;
  readonly listTitle?: string;
  readonly headingId?: string;
};

export function BuildCoreWorkflowStagesList({
  scope,
  embeddedInTab = false,
  listTitle,
  headingId = 'workflow-stages-heading',
}: BuildCoreWorkflowStagesListProps): ReactElement {
  const copy = content.workflowStages;
  const panelTitle = listTitle ?? copy.listTitle;
  const { getStages } = useBuildCorePipelineStages();
  const stages = getStages(scope);
  const {
    canManage,
    busyStageId,
    statusMessage,
    statusKind,
    addStage,
    renameStage,
    deleteStage,
    reorderStages,
    clearStatus,
    notifyStageActionFailed,
  } = useBuildCoreWorkflowStagesPage(scope);
  const [editor, setEditor] = useState<StageEditorState>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );

  const reorderableStages = useMemo(
    () => sortedStages.filter((stage) => !isReservedPipelineStageSlug(stage.slug)),
    [sortedStages]
  );

  const terminalStage = useMemo(
    () => sortedStages.find((stage) => isReservedPipelineStageSlug(stage.slug)) ?? null,
    [sortedStages]
  );

  const isStageReorderable = (stage: OrgPipelineStageRecord): boolean =>
    !isReservedPipelineStageSlug(stage.slug);

  const openAdd = (): void => {
    setDraftLabel('');
    setEditor({ mode: 'add' });
  };

  const openEdit = (stage: OrgPipelineStageRecord): void => {
    setDraftLabel(stage.label);
    setEditor({ mode: 'edit', stage });
  };

  const openDelete = (stage: OrgPipelineStageRecord): void => {
    setEditor({ mode: 'delete', stage });
  };

  const handleDragStart = (stage: OrgPipelineStageRecord) => (event: DragEvent<HTMLDivElement>): void => {
    if (!canManage || busyStageId != null || !isStageReorderable(stage)) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stage.id);
    setDraggingStageId(stage.id);
  };

  const handleDragOver = (stage: OrgPipelineStageRecord) => (event: DragEvent<HTMLDivElement>): void => {
    if (!canManage || draggingStageId == null || !isStageReorderable(stage)) return;
    event.preventDefault();
    setDragOverStageId(stage.id);
  };

  const handleDrop = (targetStage: OrgPipelineStageRecord) => async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    if (!canManage) {
      notifyStageActionFailed(copy.reorderFailed);
      return;
    }
    if (!isStageReorderable(targetStage)) return;
    const sourceStageId = event.dataTransfer.getData('text/plain') || draggingStageId;
    setDraggingStageId(null);
    setDragOverStageId(null);
    if (!sourceStageId || sourceStageId === targetStage.id) return;

    const sourceStage = reorderableStages.find((stage) => stage.id === sourceStageId);
    if (sourceStage == null || !isStageReorderable(sourceStage)) {
      notifyStageActionFailed(copy.reorderFailed);
      return;
    }

    const currentIds = reorderableStages.map((stage) => stage.id);
    const fromIndex = currentIds.indexOf(sourceStageId);
    const toIndex = currentIds.indexOf(targetStage.id);
    if (fromIndex < 0 || toIndex < 0) {
      notifyStageActionFailed(copy.reorderFailed);
      return;
    }

    const nextReorderableIds = [...currentIds];
    nextReorderableIds.splice(fromIndex, 1);
    nextReorderableIds.splice(toIndex, 0, sourceStageId);

    const nextIds = terminalStage
      ? [...nextReorderableIds, terminalStage.id]
      : nextReorderableIds;
    const ok = await reorderStages(nextIds);
    if (!ok) {
      notifyStageActionFailed(copy.reorderFailed);
    }
  };

  const handleEditorConfirm = async (): Promise<void> => {
    const label = draftLabel.trim();
    if (!label) return;

    if (editor?.mode === 'add') {
      const ok = await addStage(label);
      if (ok) setEditor(null);
      return;
    }

    if (editor?.mode === 'edit') {
      const ok = await renameStage(editor.stage.id, label);
      if (ok) setEditor(null);
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (editor?.mode !== 'delete') return;
    const ok = await deleteStage(editor.stage.id);
    if (ok) setEditor(null);
  };

  const renderStageRow = (stage: OrgPipelineStageRecord): ReactElement => {
    const reorderable = isStageReorderable(stage);
    const reserved = isReservedPipelineStageSlug(stage.slug);
    const rowClass = [
      styles.row,
      reorderable && draggingStageId === stage.id ? styles.row_dragging : '',
      reorderable && dragOverStageId === stage.id ? styles.row_dragOver : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        key={stage.id}
        role="listitem"
        className={rowClass}
        draggable={reorderable && canManage && busyStageId == null}
        onDragStart={reorderable ? handleDragStart(stage) : undefined}
        onDragOver={reorderable ? handleDragOver(stage) : undefined}
        onDrop={reorderable ? (event) => void handleDrop(stage)(event) : undefined}
        onDragEnd={
          reorderable
            ? () => {
                setDraggingStageId(null);
                setDragOverStageId(null);
              }
            : undefined
        }
      >
        {reorderable ? (
          <span className={styles.dragHandle} aria-hidden>
            ☰
          </span>
        ) : (
          <span className={styles.leadingSpacer} aria-hidden />
        )}
        <p className={styles.stageName}>{stage.label}</p>
        {canManage && !reserved ? (
          <span className={styles.rowActions}>
            <button
              type="button"
              className={styles.rowIconBtn}
              aria-label={copy.editStageAriaLabel(stage.label)}
              title={copy.edit}
              disabled={busyStageId === stage.id}
              onClick={() => openEdit(stage)}
            >
              <span className={detailStyles.summaryStripEditIcon} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.rowIconBtn} ${styles.rowIconBtnDanger}`}
              aria-label={copy.deleteStageAriaLabel(stage.label)}
              title={copy.delete}
              disabled={busyStageId === stage.id}
              onClick={() => openDelete(stage)}
            >
              <span
                className={`${detailStyles.actionsMenuIcon} ${detailStyles.actionsMenuDeleteIcon}`}
                aria-hidden
              />
            </button>
          </span>
        ) : canManage ? (
          <span className={styles.rowActions} aria-hidden />
        ) : null}
      </div>
    );
  };

  return (
    <section
      className={`${styles.panel} ${embeddedInTab ? styles.panelInScrollParent : ''}`}
      aria-labelledby={headingId}
    >
      {statusMessage ? (
        <DetailToast
          kind={statusKind === 'success' ? 'success' : 'error'}
          message={statusMessage}
          onDismiss={clearStatus}
        />
      ) : null}
      <div className={styles.panelHeader}>
        <h2 id={headingId} className={styles.panelTitle}>
          {panelTitle}
        </h2>
        {canManage ? (
          <DetailPanelHeaderButton
            variant="add"
            title={copy.addStageTitle}
            aria-label={copy.addStageTitle}
            disabled={busyStageId != null}
            onClick={openAdd}
          />
        ) : null}
      </div>
      {!canManage ? <p className={styles.readOnlyNote}>{copy.readOnlyNote}</p> : null}
      {editor?.mode === 'add' || editor?.mode === 'edit' ? (
        <form
          className={styles.row}
          onSubmit={(event) => {
            event.preventDefault();
            void handleEditorConfirm();
          }}
        >
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>
              {editor.mode === 'edit' ? copy.editStageTitle : copy.addStageTitle}
            </span>
            <input
              type="text"
              className={styles.modalInput}
              value={draftLabel}
              autoFocus
              aria-label={copy.stageNameLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
            />
          </label>
          <span className={styles.rowActions}>
            <button type="submit" className={styles.addButton}>
              {editor.mode === 'edit' ? copy.save : copy.addStage}
            </button>
            <button type="button" className={styles.iconButton} onClick={() => setEditor(null)}>
              {copy.cancel}
            </button>
          </span>
        </form>
      ) : null}
      {sortedStages.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <div
          className={`${styles.list} ${embeddedInTab ? styles.listInScrollParent : ''}`}
          role="list"
        >
          {reorderableStages.map((stage) => renderStageRow(stage))}
          {terminalStage != null ? renderStageRow(terminalStage) : null}
        </div>
      )}

      <ConfirmModal
        isOpen={editor?.mode === 'delete'}
        onClose={() => setEditor(null)}
        onConfirm={() => void handleDeleteConfirm()}
        title={copy.deleteStageTitle}
        message={copy.deleteStageMessage(editor?.mode === 'delete' ? editor.stage.label : '')}
        confirmLabel={copy.delete}
        cancelLabel={copy.cancel}
        variant="danger"
        hideIcon
      />
    </section>
  );
}
