'use client';

import type { ReactElement, ReactNode, RefObject } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import { resolveProjectCustomFieldScopeForProject } from '@/domain/buildcore/projectCustomFields';
import { useBuildCoreProjectCustomFieldsForScope } from '@/presentation/providers/BuildCoreProjectCustomFieldsProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectPreviewPopover } from './useProjectPreviewPopover';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';

export type ProjectPreviewNameAnchorProps = {
  readonly project: CrmProjectSummary;
  readonly financials?: ProjectPaymentFinancials | null;
  readonly stageLabel?: string | null;
  readonly progressPercent?: number | null;
  readonly children: ReactNode;
  readonly className?: string;
};

export function ProjectPreviewNameAnchor({
  project,
  stageLabel,
  progressPercent,
  children,
  className,
}: ProjectPreviewNameAnchorProps): ReactElement {
  const isMobile = useDashboardMobileLayout();
  const customFieldScope = resolveProjectCustomFieldScopeForProject({
    parentProjectId: project.parentProjectId,
  });
  const { activeDefinitions } = useBuildCoreProjectCustomFieldsForScope(customFieldScope);

  const preview = useProjectPreviewPopover({
    projectSlug: project.slug,
    projectName: project.name,
    customFieldDefinitions: activeDefinitions,
    stageLabel,
    progressPercent,
    interactionMode: isMobile ? 'tap' : 'hover',
  });

  const anchorClass = [cardStyles.previewTitleAnchor, className].filter(Boolean).join(' ');

  return (
    <>
      <div
        ref={preview.anchorRef as RefObject<HTMLDivElement>}
        className={anchorClass}
        {...preview.anchorHandlers}
        onClick={
          isMobile
            ? undefined
            : (event) => {
                event.stopPropagation();
              }
        }
      >
        {children}
        {preview.toggleButtonProps ? (
          <button {...preview.toggleButtonProps}>
            <span className={cardStyles.previewInfoIcon} aria-hidden />
          </button>
        ) : null}
      </div>
      {preview.menu}
    </>
  );
}
