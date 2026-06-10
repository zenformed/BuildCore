'use client';

import { useMemo, type ReactElement } from 'react';
import { isCrmProjectComplete } from '@/domain/crm';
import { resolveProjectDetailProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectProgressPercent } from './ProjectProgressPercent';

export function ProjectDetailHeaderProgress(): ReactElement | null {
  const { project, subSlug, childSummaries, isMemberRole } = useProjectDetailShell();
  const isParentOverview =
    subSlug == null && project.summary.parentProjectId == null;
  const isComplete = isCrmProjectComplete(project.summary);

  const progress = useMemo(() => {
    if (isMemberRole) {
      return null;
    }

    if (isParentOverview && childSummaries?.isLoading) {
      return null;
    }

    const childStageSlugs = isParentOverview
      ? (childSummaries?.allRows ?? []).map((child) => child.currentStageSlug)
      : [];

    return resolveProjectDetailProgressDisplay({
      currentStageSlug: project.summary.currentStageSlug,
      childStageSlugs,
      isComplete,
    });
  }, [
    childSummaries?.allRows,
    childSummaries?.isLoading,
    isComplete,
    isMemberRole,
    isParentOverview,
    project.summary.currentStageSlug,
  ]);

  if (progress == null) {
    return null;
  }

  return <ProjectProgressPercent progress={progress} />;
}
