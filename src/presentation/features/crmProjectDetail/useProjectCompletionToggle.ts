'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import { setCrmProjectCompletion } from '@/application/use-cases/crm/setCrmProjectCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';

export function useProjectCompletionToggle(
  initialProject: CrmProjectDetail,
  onRefresh: () => Promise<void>
): {
  project: CrmProjectDetail;
  setProject: (project: CrmProjectDetail) => void;
  isComplete: boolean;
  completionBusy: boolean;
  completionConfirm: 'complete' | 'incomplete' | null;
  setCompletionConfirm: (value: 'complete' | 'incomplete' | null) => void;
  requestMarkComplete: () => void;
  requestMarkIncomplete: () => void;
  confirmCompletionChange: () => Promise<void>;
} {
  const [project, setProject] = useState(initialProject);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [completionConfirm, setCompletionConfirm] = useState<'complete' | 'incomplete' | null>(
    null
  );

  const isComplete = isCrmProjectComplete(project.summary);
  const c = content.projectDetail;

  const confirmCompletionChange = useCallback(async () => {
    if (completionConfirm == null) return;
    const complete = completionConfirm === 'complete';
    setCompletionBusy(true);
    setCompletionConfirm(null);
    try {
      const updated = await setCrmProjectCompletion(
        crmRepositories,
        project.summary.slug,
        complete
      );
      if (updated == null) {
        throw new Error(c.markCompleteFailed);
      }
      setProject(updated);
      await onRefresh();
    } finally {
      setCompletionBusy(false);
    }
  }, [completionConfirm, onRefresh, project.summary.slug, c.markCompleteFailed]);

  return {
    project,
    setProject,
    isComplete,
    completionBusy,
    completionConfirm,
    setCompletionConfirm,
    requestMarkComplete: () => setCompletionConfirm('complete'),
    requestMarkIncomplete: () => setCompletionConfirm('incomplete'),
    confirmCompletionChange,
  };
}
