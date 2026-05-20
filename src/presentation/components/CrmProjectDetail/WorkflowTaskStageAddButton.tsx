'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { OPS_PIPELINE_STAGES } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type WorkflowTaskStageAddButtonProps = {
  disabled?: boolean;
  onSelectStage: (stageSlug: PipelineStageSlug) => void;
};

export function WorkflowTaskStageAddButton({
  disabled = false,
  onSelectStage,
}: WorkflowTaskStageAddButtonProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div ref={anchorRef} className={styles.detailPanelHeaderBtnWrap}>
      <DetailPanelHeaderButton
        variant="add"
        title={wf.addTask}
        disabled={disabled}
        onClick={() => setMenuOpen((open) => !open)}
      />
      <WorkflowInlineMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${styles.inlineMenu_portal} ${styles.workflowStagePickerMenu}`}
      >
        {OPS_PIPELINE_STAGES.map((stage) => (
          <button
            key={stage.slug}
            type="button"
            role="menuitem"
            className={styles.inlineMenuAction}
            onClick={() => {
              onSelectStage(stage.slug);
              setMenuOpen(false);
            }}
          >
            {stage.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}
