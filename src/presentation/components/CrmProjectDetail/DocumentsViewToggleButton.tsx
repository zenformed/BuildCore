'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { GridIcon, ListIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import type { DocumentsViewMode } from '@/presentation/features/crmProjectDetail/documentsViewStorage';
import projectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';

export type DocumentsViewToggleButtonProps = {
  readonly viewMode: DocumentsViewMode;
  readonly onToggle: () => void;
  readonly variant?: 'default' | 'ghost';
};

/** Compact list/gallery toggle — place immediately left of document search. */
export function DocumentsViewToggleButton({
  viewMode,
  onToggle,
  variant = 'ghost',
}: DocumentsViewToggleButtonProps): ReactElement {
  const copy = content.projectDetail.documents.viewMode;
  const switchToGallery = viewMode === 'list';
  const label = switchToGallery ? copy.switchToGallery : copy.switchToList;
  const buttonClassName =
    variant === 'ghost'
      ? `${projectStyles.projectsFilterBtn_ghost}${
          viewMode === 'gallery' ? ` ${projectStyles.projectsFilterBtn_ghostActive}` : ''
        }`
      : `${projectStyles.projectsFilterBtn}${
          viewMode === 'gallery' ? ` ${projectStyles.projectsFilterBtn_active}` : ''
        }`;

  return (
    <button
      type="button"
      className={buttonClassName}
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
