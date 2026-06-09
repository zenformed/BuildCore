'use client';

import { useMemo, type ReactElement } from 'react';
import { resolveProjectDetailProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { useCrmProjectChildSummaries } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectProgressPercent } from './ProjectProgressPercent';

export function ProjectDetailHeaderProgress(): ReactElement | null {
  const { project, subSlug } = useProjectDetailShell();
  const isParentOverview =
    subSlug == null && project.summary.parentProjectId == null;
  const { rows: childSummaries, isLoading: childrenLoading } = useCrmProjectChildSummaries(
    isParentOverview ? project.summary : null,
    ''
  );

  const progress = useMemo(
    () =>
      resolveProjectDetailProgressDisplay({
        currentStageSlug: project.summary.currentStageSlug,
        childStageSlugs: isParentOverview
          ? childrenLoading
            ? null
            : childSummaries.map((child) => child.currentStageSlug)
          : [],
      }),
    [childSummaries, childrenLoading, isParentOverview, project.summary.currentStageSlug]
  );

  if (progress == null) {
    return null;
  }

  return <ProjectProgressPercent progress={progress} />;
}
