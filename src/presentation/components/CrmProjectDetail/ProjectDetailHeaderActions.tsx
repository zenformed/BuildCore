'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import styles from './ProjectDetail.module.css';

export type ProjectDetailHeaderActionsProps = {
  routes: ProjectDetailRoutes;
  projectSummary: CrmProjectSummary;
  canDelete: boolean;
  canSaveTemplate: boolean;
  loadTemplateLabel: string;
  saveTemplateLabel: string;
  deleting: boolean;
  onRequestDelete: (project: CrmProjectSummary) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  canShowQrCode?: boolean;
  onShowQrCode?: () => void;
  isSubproject?: boolean;
  onRequestMarkInactive?: () => void;
  onRequestMarkActive?: () => void | Promise<void>;
  lifecycleBusy?: boolean;
};

export function ProjectDetailHeaderActions({
  routes,
  projectSummary,
  canDelete,
  canSaveTemplate,
  loadTemplateLabel,
  saveTemplateLabel,
  deleting,
  onRequestDelete,
  onSaveTemplate,
  onLoadTemplate,
  canShowQrCode = false,
  onShowQrCode,
  isSubproject = false,
  onRequestMarkInactive,
  onRequestMarkActive,
  lifecycleBusy = false,
}: ProjectDetailHeaderActionsProps): ReactElement {
  return (
    <div className={styles.detailHeaderActions}>
      <ProjectDetailActionsMenu
        routes={routes}
        projectSummary={projectSummary}
        canDelete={canDelete}
        canSaveTemplate={canSaveTemplate}
        loadTemplateLabel={loadTemplateLabel}
        saveTemplateLabel={saveTemplateLabel}
        deleting={deleting}
        onRequestDelete={onRequestDelete}
        onSaveTemplate={onSaveTemplate}
        onLoadTemplate={onLoadTemplate}
        canShowQrCode={canShowQrCode}
        onShowQrCode={onShowQrCode}
        isSubproject={isSubproject}
        onRequestMarkInactive={onRequestMarkInactive}
        onRequestMarkActive={onRequestMarkActive}
        lifecycleBusy={lifecycleBusy}
      />
    </div>
  );
}
