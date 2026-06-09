'use client';

import { useMemo, type ReactElement } from 'react';
import { resolveProjectDetailProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { useCrmProjectChildSummaries } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectProgressPercent } from './ProjectProgressPercent';

export function ProjectDetailHeaderProgress(): ReactElement {
  const { project, subSlug } = useProjectDetailShell();
  const isParentOverview =
    subSlug == null && project.summary.parentProjectId == null;
  const { rows: childSummaries } = useCrmProjectChildSummaries(
    isParentOverview ? project.summary : null,
    ''
  );

  const progress = useMemo(
    () =>
      resolveProjectDetailProgressDisplay({
        currentStageSlug: project.summary.currentStageSlug,
        childStageSlugs: isParentOverview
          ? childSummaries.map((child) => child.currentStageSlug)
          : [],
      }),
    [childSummaries, isParentOverview, project.summary.currentStageSlug]
  );

  return <ProjectProgressPercent progress={progress} />;
}
