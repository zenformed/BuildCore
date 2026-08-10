'use client';

import type { ReactElement } from 'react';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import {
  ProjectDetailsCardContent,
} from './ProjectDetailsCardContent';

export type ProjectPreviewCardProps = {
  readonly preview: CrmProjectPreview | null;
  readonly loading?: boolean;
  readonly loadError?: string | null;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly stageLabel?: string | null;
  readonly progressPercent?: number | null;
  readonly popoverId: string;
  readonly mobileFullscreen?: boolean;
  readonly onRequestClose?: () => void;
};

export function ProjectPreviewCard({
  preview,
  loading = false,
  loadError = null,
  customFieldDefinitions,
  stageLabel,
  progressPercent,
  popoverId,
  mobileFullscreen = false,
  onRequestClose,
}: ProjectPreviewCardProps): ReactElement {
  const previewCopy = content.crm.projectPreview;

  return (
    <div
      id={popoverId}
      role="dialog"
      aria-label={previewCopy.ariaLabel(preview?.summary.name ?? '')}
      className={[
        cardStyles.previewCard,
        mobileFullscreen ? cardStyles.previewCard_mobileFullscreen : cardStyles.previewCard_desktopProject,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {mobileFullscreen ? (
        <button
          type="button"
          className={cardStyles.previewMobileCloseBtn}
          aria-label={previewCopy.hidePreviewAriaLabel}
          onClick={() => onRequestClose?.()}
        >
          ×
        </button>
      ) : null}
      {loading ? (
        <section className={cardStyles.previewSection}>
          <p className={cardStyles.metaValue}>{previewCopy.loading}</p>
        </section>
      ) : loadError ? (
        <section className={cardStyles.previewSection}>
          <p className={cardStyles.metaValue}>{loadError}</p>
        </section>
      ) : preview ? (
        <ProjectDetailsCardContent
          preview={preview}
          customFieldDefinitions={customFieldDefinitions}
          stageLabel={stageLabel}
          progressPercent={progressPercent}
          mode="preview"
        />
      ) : null}
    </div>
  );
}
