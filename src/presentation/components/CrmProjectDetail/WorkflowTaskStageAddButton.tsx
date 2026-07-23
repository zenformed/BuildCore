'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { resolveOpsPipelineStages } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { CrmDirectUploadStatusHost } from './CrmDirectUploadStatus';
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
  const { project } = useProjectDetailShell();
  const { catalogForProject } = useBuildCorePipelineStages();
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const opsStages = resolveOpsPipelineStages(catalog);
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
      <CrmDirectUploadStatusHost />
      <WorkflowInlineMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${styles.inlineMenu_portal} ${styles.workflowStagePickerMenu}`}
      >
        {opsStages.map((stage) => (
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
