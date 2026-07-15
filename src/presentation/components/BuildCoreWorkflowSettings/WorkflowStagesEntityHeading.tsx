'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { BuildCoreEntityTerminologyKey } from '@/domain/buildcore/entityTerminology';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import projectDetailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import { useBuildCoreEntityTerminology } from '@/presentation/providers/BuildCoreEntityTerminologyProvider';
import {
  commitEntityHeadingRename,
  entityHeadingRenameInputMaxLength,
  entityHeadingRenameKeyAction,
  WORKFLOW_STAGES_ENTITY_HEADING_SUFFIX,
} from './entityHeadingRename';
import styles from './BuildCoreWorkflowSettings.module.css';

export type WorkflowStagesEntityHeadingProps = {
  readonly entityKey: BuildCoreEntityTerminologyKey;
  readonly headingId: string;
};

export function WorkflowStagesEntityHeading({
  entityKey,
  headingId,
}: WorkflowStagesEntityHeadingProps): ReactElement {
  const menuId = useId();
  const {
    terms,
    canEditEntityTerminology,
    updateEntityTerm,
    isSaving,
  } = useBuildCoreEntityTerminology();
  const currentTerm = entityKey === 'project' ? terms.project : terms.subproject;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentTerm);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRootRef = useRef<HTMLDivElement>(null);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(currentTerm);
    }
  }, [currentTerm, editing]);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (input == null) return;
    input.focus();
    input.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const onPointerDown = (event: PointerEvent): void => {
      const root = editRootRef.current;
      if (root == null) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      setEditing(false);
      setDraft(currentTerm);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [currentTerm, editing]);

  const beginRename = (): void => {
    setMenuOpen(false);
    setDraft(currentTerm);
    setEditing(true);
  };

  const cancelRename = (): void => {
    setEditing(false);
    setDraft(currentTerm);
  };

  const saveRename = async (): Promise<void> => {
    const result = commitEntityHeadingRename(draft, currentTerm);
    if (!result.ok) {
      if (result.reason === 'unchanged') {
        setEditing(false);
        return;
      }
      cancelRename();
      return;
    }
    const ok = await updateEntityTerm(entityKey, result.value);
    if (ok) {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div ref={editRootRef} className={styles.entityHeadingEdit}>
        <input
          ref={inputRef}
          id={headingId}
          type="text"
          className={styles.entityHeadingInput}
          value={draft}
          maxLength={entityHeadingRenameInputMaxLength()}
          aria-label={`Rename ${entityKey === 'project' ? terms.project : terms.subproject}`}
          disabled={isSaving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            const action = entityHeadingRenameKeyAction(event.key);
            if (action === 'save') {
              event.preventDefault();
              void saveRename();
            } else if (action === 'cancel') {
              event.preventDefault();
              cancelRename();
            }
          }}
        />
        <span className={styles.entityHeadingSuffix} aria-hidden>
          {WORKFLOW_STAGES_ENTITY_HEADING_SUFFIX}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.entityHeadingDisplay}>
      <h2 id={headingId} className={styles.entityHeadingTitle}>
        {currentTerm} {WORKFLOW_STAGES_ENTITY_HEADING_SUFFIX}
      </h2>
      {canEditEntityTerminology ? (
        <>
          <button
            ref={menuAnchorRef}
            type="button"
            className={styles.entityHeadingMenuBtn}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuOpen ? menuId : undefined}
            aria-label={`${currentTerm} ${WORKFLOW_STAGES_ENTITY_HEADING_SUFFIX} menu`}
            disabled={isSaving}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <span aria-hidden>⋮</span>
          </button>
          <WorkflowInlineMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={menuAnchorRef}
            align="start"
            sizeToContent
            portalClassName={`${projectDetailStyles.inlineMenu_portal} ${projectDetailStyles.actionsMenu_portal}`}
          >
            <button
              id={menuId}
              type="button"
              role="menuitem"
              className={`${projectDetailStyles.inlineMenuAction} ${projectDetailStyles.actionsMenuItem}`}
              onClick={(event) => {
                event.stopPropagation();
                beginRename();
              }}
            >
              Rename
            </button>
          </WorkflowInlineMenu>
        </>
      ) : null}
    </div>
  );
}
