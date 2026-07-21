'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { GridIcon, ListIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import type { DocumentsViewMode } from '@/presentation/features/crmProjectDetail/documentsViewStorage';
import projectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';

export type DocumentsViewToggleButtonProps = {
  readonly viewMode: DocumentsViewMode;
  readonly onToggle: () => void;
};

/** Compact list/gallery toggle — place immediately left of document search. */
export function DocumentsViewToggleButton({
  viewMode,
  onToggle,
}: DocumentsViewToggleButtonProps): ReactElement {
  const copy = content.projectDetail.documents.viewMode;
  const switchToGallery = viewMode === 'list';
  const label = switchToGallery ? copy.switchToGallery : copy.switchToList;

  return (
    <button
      type="button"
      className={`${projectStyles.projectsFilterBtn}${
        viewMode === 'gallery' ? ` ${projectStyles.projectsFilterBtn_active}` : ''
      }`}
      title={label}
      aria-label={label}
      aria-pressed={viewMode === 'gallery'}
      onClick={onToggle}
    >
      {switchToGallery ? (
        <GridIcon className={projectStyles.projectsFilterBtnIcon} />
      ) : (
        <ListIcon className={projectStyles.projectsFilterBtnIcon} />
      )}
    </button>
  );
}
