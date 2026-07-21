'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import {
  projectPrimaryPhotoCircleColor,
  projectPrimaryPhotoInitials,
} from '@/domain/crm/projectPrimaryPhoto';
import { resolveProjectCustomFieldScopeForProject } from '@/domain/buildcore/projectCustomFields';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import {
  resolveDerivedWorkflowStageSlugFromProgressIndex,
  resolveProjectWorkflowProgressDisplayFromIndex,
} from '@/domain/buildcore/projectPipelineProgress';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ProjectDetailsCardContent } from '@/presentation/components/CrmProjects/ProjectDetailsCardContent';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  buildProjectPrimaryPhotoApiPath,
  useProjectPrimaryPhotoBlob,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { fetchCrmProjectPreview } from '@/presentation/features/crmProjects/fetchCrmProjectPreview';
import type { CrmMapSearchableProject } from '@/presentation/features/crmMap';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreProjectCustomFieldsForScope } from '@/presentation/providers/BuildCoreProjectCustomFieldsProvider';
import cardStyles from '@/presentation/components/CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import styles from './CrmMap.module.css';

export type ProjectDetailsPanelProps = {
  readonly selected: CrmMapSearchableProject;
  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex | undefined;
  readonly isMobileLayout: boolean;
  readonly onClose: () => void;
  readonly onOpenProject: (slug: string) => void;
  readonly onViewPhotos: (projectName: string) => void;
};

function MapProjectPhoto({
  preview,
  selected,
}: {
  readonly preview: CrmProjectPreview;
  readonly selected: CrmMapSearchableProject;
}): ReactElement {
  const summary = preview.summary;
  const photoSlug = selected.isSubproject ? selected.parentProjectSlug : summary.slug;
  const [resolvedPhotoPath, setResolvedPhotoPath] = useState<string | null>(
    selected.isSubproject ? null : summary.primaryPhotoPath
  );

  useEffect(() => {
    if (!selected.isSubproject) {
      setResolvedPhotoPath(summary.primaryPhotoPath);
      return;
    }
    let cancelled = false;
    void fetchCrmProjectPreview(selected.parentProjectSlug).then((parentPreview) => {
      if (cancelled) return;
      setResolvedPhotoPath(parentPreview?.summary.primaryPhotoPath ?? summary.primaryPhotoPath);
    });
    return () => {
      cancelled = true;
    };
  }, [selected.isSubproject, selected.parentProjectSlug, summary.primaryPhotoPath]);

  const apiPath = buildProjectPrimaryPhotoApiPath(photoSlug, resolvedPhotoPath);
  const photoUrl = useProjectPrimaryPhotoBlob(apiPath);
  const initials = projectPrimaryPhotoInitials({
    parentProjectId: summary.parentProjectId,
    projectName: summary.name,
    clientName: summary.client.name,
  });

  return (
    <div className={styles.detailsPhoto}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className={styles.detailsPhotoImg} />
      ) : (
        <span
          className={styles.detailsPhotoInitial}
          style={{ backgroundColor: projectPrimaryPhotoCircleColor(summary.client.name) }}
          role="img"
          aria-label={content.projectDetail.primaryPhoto.placeholderAriaLabel}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export function ProjectDetailsPanel({
  selected,
  workflowProgressInputIndex,
  isMobileLayout,
  onClose,
  onOpenProject,
  onViewPhotos,
}: ProjectDetailsPanelProps): ReactElement {
  const previewCopy = content.crm.projectPreview;
  const customFieldScope = resolveProjectCustomFieldScopeForProject({
    parentProjectId: selected.summary.parentProjectId,
  });
  const { activeDefinitions } = useBuildCoreProjectCustomFieldsForScope(customFieldScope);
  const { getCatalog } = useBuildCorePipelineStages();
  const catalog = getCatalog(
    resolvePipelineStageScopeForProject({ parentProjectId: selected.summary.parentProjectId })
  );

  const [preview, setPreview] = useState<CrmProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchCrmProjectPreview(selected.projectSlug)
      .then((next) => {
        if (cancelled) return;
        if (next == null) {
          setPreview(null);
          setLoadError(previewCopy.loadFailed);
        } else {
          setPreview(next);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setLoadError(previewCopy.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewCopy.loadFailed, selected.projectSlug]);

  const progress = useMemo(() => {
    if (workflowProgressInputIndex == null) return null;
    return resolveProjectWorkflowProgressDisplayFromIndex({
      summary: selected.summary,
      workflowProgressInputIndex,
      stages: catalog,
    });
  }, [catalog, selected.summary, workflowProgressInputIndex]);

  const stageLabel = useMemo(() => {
    if (workflowProgressInputIndex == null) return null;
    const slug = resolveDerivedWorkflowStageSlugFromProgressIndex({
      summary: selected.summary,
      workflowProgressInputIndex,
      stages: catalog,
    });
    return slug ? formatWorkflowStageLabel(slug, catalog) : null;
  }, [catalog, selected.summary, workflowProgressInputIndex]);

  const addressDisplay =
    (preview != null ? formatCrmProjectAddressLine(preview.summary.address) : null) ||
    selected.marker.addressLabel ||
    null;

  const body = (
    <>
      <div className={styles.detailsPanelHeader}>
        <h2 className={styles.detailsPanelTitle}>{selected.projectName}</h2>
        <button
          type="button"
          className={styles.detailsCloseBtn}
          onClick={onClose}
          aria-label="Close project details"
        >
          ×
        </button>
      </div>
      <div className={styles.detailsBody}>
        {loading && preview == null ? (
          <p className={cardStyles.metaValue}>{previewCopy.loading}</p>
        ) : null}
        {loadError && preview == null ? (
          <p className={cardStyles.metaValue}>{loadError}</p>
        ) : null}
        {preview ? (
          <div className={styles.detailsPreviewCard}>
            <MapProjectPhoto preview={preview} selected={selected} />
            {addressDisplay && addressDisplay !== '—' ? (
              <p className={styles.detailsAddress}>{addressDisplay}</p>
            ) : null}
            <ProjectDetailsCardContent
              preview={preview}
              customFieldDefinitions={activeDefinitions}
              stageLabel={stageLabel}
              progressPercent={progress?.textPercent ?? null}
              mode="preview"
            />
          </div>
        ) : null}
      </div>
      <div className={styles.detailsActions}>
        <button
          type="button"
          className={`${styles.detailsActionBtn} ${styles.detailsActionBtn_primary}`}
          onClick={() => onOpenProject(selected.projectSlug)}
        >
          Open Project
        </button>
        <button
          type="button"
          className={styles.detailsActionBtn}
          onClick={() => onViewPhotos(selected.projectName)}
        >
          View Photos
        </button>
      </div>
    </>
  );

  if (isMobileLayout) {
    return (
      <>
        <button
          type="button"
          className={styles.sheetBackdrop}
          aria-label="Dismiss project details"
          onClick={onClose}
        />
        <aside className={styles.sheet} role="dialog" aria-label="Project details">
          <div className={styles.sheetHandle} aria-hidden />
          {body}
        </aside>
      </>
    );
  }

  return (
    <aside className={styles.detailsPanel} aria-label="Project details">
      {body}
    </aside>
  );
}
