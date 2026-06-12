'use client';

import { useMemo, type ReactElement } from 'react';
import { isCrmProjectComplete } from '@/domain/crm';
import { resolveProjectDetailProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { ProjectProgressPercent } from './ProjectProgressPercent';

export function ProjectDetailHeaderProgress(): ReactElement | null {
  const { project, isMemberRole } = useProjectDetailShell();
  const { catalog } = useBuildCorePipelineStages();
  const isComplete = isCrmProjectComplete(project.summary);

  const progress = useMemo(() => {
    if (isMemberRole) {
      return null;
    }

    return resolveProjectDetailProgressDisplay({
      workflowTasks: project.workflowTasks,
      manualStageCompletions: project.manualStageCompletions,
      isComplete,
      stages: catalog,
    });
  }, [catalog, isComplete, isMemberRole, project.manualStageCompletions, project.workflowTasks]);

  if (progress == null) {
    return null;
  }

  return <ProjectProgressPercent progress={progress} />;
}
