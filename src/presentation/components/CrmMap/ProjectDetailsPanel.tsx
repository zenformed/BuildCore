'use client';

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
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
import { formatCrmProjectLocationLine } from '@/domain/crm/projectAddress';
import { INDUSTRY_LABELS } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
import { ProjectDetailsCardContent } from '@/presentation/components/CrmProjects/ProjectDetailsCardContent';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
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
import shared from '@/presentation/components/crmShared/crmShared.module.css';
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
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [sheetDragStartY, setSheetDragStartY] = useState<number | null>(null);

  const setExpanded = (expanded: boolean): void => {
    setMobileExpanded(expanded);
  };

  const handleSheetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    setSheetDragStartY(event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetPointerUp = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (sheetDragStartY == null) return;
    const distance = event.clientY - sheetDragStartY;
    setSheetDragStartY(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (distance < -24) {
      setExpanded(true);
    } else if (distance > 24) {
      setExpanded(false);
    } else {
      setExpanded(!mobileExpanded);
    }
  };

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
    (preview != null
      ? formatCrmProjectLocationLine(
          preview.summary.address,
          preview.summary.latitude,
          preview.summary.longitude
        )
      : null) ||
    selected.marker.addressLabel ||
    null;
  const headerStageLabel =
    stageLabel?.trim() ||
    formatWorkflowStageLabel(selected.summary.currentStageSlug, catalog);
  const industryDisplay =
    selected.summary.industry === 'other'
      ? selected.summary.customIndustry?.trim() || INDUSTRY_LABELS.other
      : INDUSTRY_LABELS[selected.summary.industry];
  const assignedTo = selected.summary.assignedTo;
  const destination = `${selected.marker.latitude},${selected.marker.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  const handleNavigate = (event: ReactMouseEvent<HTMLAnchorElement>): void => {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
      event.preventDefault();
      window.location.href = `geo:${destination}?q=${encodeURIComponent(destination)}`;
      return;
    }
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      event.preventDefault();
      window.location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
    }
  };

  const body = (
    <>
      <div className={styles.detailsPanelHeader}>
        <div className={styles.detailsHeaderSummary}>
          <h2 className={styles.detailsPanelTitle}>{selected.projectName}</h2>
          <span className={styles.detailsIndustry}>{industryDisplay}</span>
          <div className={styles.detailsHeaderMeta}>
            <span className={`${shared.stagePill} ${styles.detailsStagePill}`}>
              {headerStageLabel}
            </span>
            {progress ? (
              <div className={styles.detailsHeaderProgress}>
                <ProjectProgressPercent progress={progress} variant="compact" tone="progress" />
              </div>
            ) : null}
          </div>
        </div>
        {assignedTo ? (
          <span className={styles.detailsAssigneeAvatar}>
            <TeamMemberAvatar member={assignedTo} />
          </span>
        ) : null}
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
              <div className={styles.detailsAddressRow}>
                <a
                  href={directionsUrl}
                  className={styles.detailsNavigateLink}
                  onClick={handleNavigate}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Navigate to ${addressDisplay}`}
                  title="Navigate"
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M20.7 3.3a1 1 0 0 0-1.02-.24L3.8 9.02a1 1 0 0 0 .08 1.9l6.63 2.2 2.2 6.63a1 1 0 0 0 .92.68h.04a1 1 0 0 0 .93-.61l6.34-15.5a1 1 0 0 0-.24-1.02ZM13.8 16.5l-1.57-4.72-4.72-1.57 10.72-4.02L13.8 16.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
                <p className={styles.detailsAddress}>{addressDisplay}</p>
              </div>
            ) : null}
            <ProjectDetailsCardContent
              preview={preview}
              customFieldDefinitions={activeDefinitions}
              stageLabel={stageLabel}
              progressPercent={progress?.textPercent ?? null}
              mode="map"
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
        <aside
          className={`${styles.sheet}${mobileExpanded ? ` ${styles.sheet_expanded}` : ''}`}
          role="dialog"
          aria-label="Project details"
        >
          <button
            type="button"
            className={styles.sheetHandleButton}
            aria-label={mobileExpanded ? 'Collapse project details' : 'Expand project details'}
            aria-expanded={mobileExpanded}
            onPointerDown={handleSheetPointerDown}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={() => setSheetDragStartY(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setExpanded(!mobileExpanded);
              }
            }}
            onClick={(event) => event.preventDefault()}
          >
            <span className={styles.sheetHandle} aria-hidden />
          </button>
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
