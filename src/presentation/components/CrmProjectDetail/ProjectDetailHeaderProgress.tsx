'use client';

import { useMemo, type ReactElement } from 'react';
import { resolveProjectDetailProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectProgressPercent } from './ProjectProgressPercent';

export function ProjectDetailHeaderProgress(): ReactElement | null {
  const { project, subSlug, childSummaries } = useProjectDetailShell();
  const isParentOverview =
    subSlug == null && project.summary.parentProjectId == null;

  const progress = useMemo(() => {
    const childStageSlugs = isParentOverview
      ? childSummaries == null || childSummaries.isLoading
        ? null
        : childSummaries.allRows.map((child) => child.currentStageSlug)
      : [];

    return resolveProjectDetailProgressDisplay({
      currentStageSlug: project.summary.currentStageSlug,
      childStageSlugs,
    });
  }, [
    childSummaries,
    isParentOverview,
    project.summary.currentStageSlug,
  ]);

  if (progress == null) {
    return null;
  }

  return <ProjectProgressPercent progress={progress} />;
}
