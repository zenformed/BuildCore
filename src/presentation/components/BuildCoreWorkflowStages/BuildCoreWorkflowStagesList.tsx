'use client';

import { useMemo, useState, type DragEvent, type ReactElement } from 'react';
import type { OrgPipelineStageRecord } from '@/domain/buildcore/orgPipelineStages';
import { isReservedPipelineStageSlug } from '@/domain/buildcore/orgPipelineStages';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreWorkflowStagesPage } from '@/presentation/features/buildCoreWorkflowStages/useBuildCoreWorkflowStagesPage';
import styles from './BuildCoreWorkflowStages.module.css';

type StageEditorState =
  | { mode: 'add' }
  | { mode: 'edit'; stage: OrgPipelineStageRecord }
  | { mode: 'delete'; stage: OrgPipelineStageRecord }
  | null;

export function BuildCoreWorkflowStagesList(): ReactElement {
  const copy = content.workflowStages;
  const { stages } = useBuildCorePipelineStages();
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
  } = useBuildCoreWorkflowStagesPage();
  const [editor, setEditor] = useState<StageEditorState>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );

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

  const handleDragStart = (stageId: string) => (event: DragEvent<HTMLDivElement>): void => {
    if (!canManage || busyStageId != null) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stageId);
    setDraggingStageId(stageId);
  };

  const handleDragOver = (stageId: string) => (event: DragEvent<HTMLDivElement>): void => {
    if (!canManage || draggingStageId == null) return;
    event.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDrop = (targetStageId: string) => async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    const sourceStageId = event.dataTransfer.getData('text/plain') || draggingStageId;
    setDraggingStageId(null);
    setDragOverStageId(null);
    if (!sourceStageId || sourceStageId === targetStageId) return;

    const currentIds = sortedStages.map((stage) => stage.id);
    const fromIndex = currentIds.indexOf(sourceStageId);
    const toIndex = currentIds.indexOf(targetStageId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = [...currentIds];
    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, sourceStageId);
    await reorderStages(nextIds);
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

  return (
    <section className={styles.panel} aria-labelledby="workflow-stages-heading">
      {statusMessage ? (
        <DetailToast
          kind={statusKind === 'success' ? 'success' : 'error'}
          message={statusMessage}
          onDismiss={clearStatus}
        />
      ) : null}
      <div className={styles.panelHeader}>
        <h2 id="workflow-stages-heading" className={styles.panelTitle}>
          {copy.listTitle}
        </h2>
        {canManage ? (
          <button type="button" className={styles.addButton} onClick={openAdd} disabled={busyStageId != null}>
            {copy.addStage}
          </button>
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
        <div className={styles.list} role="list">
          {sortedStages.map((stage) => {
            const rowClass = [
              styles.row,
              draggingStageId === stage.id ? styles.row_dragging : '',
              dragOverStageId === stage.id ? styles.row_dragOver : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={stage.id}
                role="listitem"
                className={rowClass}
                draggable={canManage && busyStageId == null}
                onDragStart={handleDragStart(stage.id)}
                onDragOver={handleDragOver(stage.id)}
                onDrop={(event) => void handleDrop(stage.id)(event)}
                onDragEnd={() => {
                  setDraggingStageId(null);
                  setDragOverStageId(null);
                }}
              >
                <span className={styles.dragHandle} aria-hidden>
                  ☰
                </span>
                <p className={styles.stageName}>{stage.label}</p>
                {canManage ? (
                  <span className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={copy.editStageAriaLabel(stage.label)}
                      disabled={busyStageId === stage.id}
                      onClick={() => openEdit(stage)}
                    >
                      ✏ {copy.edit}
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      aria-label={copy.deleteStageAriaLabel(stage.label)}
                      disabled={busyStageId === stage.id || isReservedPipelineStageSlug(stage.slug)}
                      title={
                        isReservedPipelineStageSlug(stage.slug) ? copy.reservedStageDeleteHint : undefined
                      }
                      onClick={() => openDelete(stage)}
                    >
                      🗑 {copy.delete}
                    </button>
                  </span>
                ) : null}
              </div>
            );
          })}
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
