'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { fetchCrmProjectPreview } from '@/presentation/features/crmProjects/fetchCrmProjectPreview';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import centerDialogStyles from '@/presentation/components/CenterConfirmDialog/CenterConfirmDialog.module.css';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import {
  ProjectDetailsCardContent,
  type ProjectDetailsEditContext,
} from './ProjectDetailsCardContent';
import { projectPreviewFromDetail } from './projectPreviewFromDetail';

export type ProjectFullDetailsModalProps = {
  readonly open: boolean;
  readonly projectSlug: string;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly financials?: ProjectPaymentFinancials | null;
  readonly stageLabel?: string | null;
  readonly progressPercent?: number | null;
  readonly project?: CrmProjectDetail | null;
  readonly edit?: ProjectDetailsEditContext | null;
  readonly onClose: () => void;
};

export function ProjectFullDetailsModal({
  open,
  projectSlug,
  customFieldDefinitions,
  financials = null,
  stageLabel,
  progressPercent,
  project = null,
  edit = null,
  onClose,
}: ProjectFullDetailsModalProps): ReactElement {
  const copy = content.projectDetail.fullDetails;
  const previewCopy = content.crm.projectPreview;
  const livePreview = useMemo(
    () => (project != null ? projectPreviewFromDetail(project) : null),
    [project]
  );
  const [preview, setPreview] = useState<CrmProjectPreview | null>(livePreview);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await fetchCrmProjectPreview(projectSlug);
      if (next == null) {
        setLoadError(previewCopy.loadFailed);
        setPreview(null);
      } else {
        setPreview(next);
      }
    } catch {
      setLoadError(previewCopy.loadFailed);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [previewCopy.loadFailed, projectSlug]);

  useEffect(() => {
    if (livePreview != null) {
      setPreview(livePreview);
      setLoadError(null);
    }
  }, [livePreview]);

  useEffect(() => {
    if (!open) return;
    if (livePreview != null) return;
    void loadPreview();
  }, [livePreview, loadPreview, open]);

  const resolvedPreview = livePreview ?? preview;

  return (
    <CenterConfirmDialog
      isOpen={open}
      title={copy.title}
      body={
        <div className={`${cardStyles.previewCard} ${cardStyles.previewCard_inDialog}`}>
          {loading && resolvedPreview == null ? (
            <p className={cardStyles.metaValue}>{previewCopy.loading}</p>
          ) : loadError && resolvedPreview == null ? (
            <p className={cardStyles.metaValue}>{loadError}</p>
          ) : resolvedPreview ? (
              <ProjectDetailsCardContent
                preview={resolvedPreview}
                customFieldDefinitions={customFieldDefinitions}
                financials={financials}
                stageLabel={stageLabel}
                progressPercent={progressPercent}
                mode="full"
                edit={edit}
              />
          ) : null}
        </div>
      }
      hideActions
      cancelLabel={content.projectDetail.edit.cancel}
      onClose={onClose}
      closeAriaLabel={copy.closeAriaLabel}
      panelClassName={centerDialogStyles.panelWide}
    />
  );
}
