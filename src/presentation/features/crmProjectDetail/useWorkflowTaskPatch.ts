'use client';

import { useCallback, useState } from 'react';
import { updateCrmWorkflowTask } from '@/application/use-cases/crm';
import type { CrmWorkflowTask, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { crmRepositories } from '@/shared/di/container';

export function useWorkflowTaskPatch(onUpdated: (task: CrmWorkflowTask) => Promise<void>): {
  saving: boolean;
  patchTask: (input: UpdateCrmWorkflowTaskInput) => Promise<void>;
} {
  const [saving, setSaving] = useState(false);

  const patchTask = useCallback(
    async (input: UpdateCrmWorkflowTaskInput) => {
      setSaving(true);
      try {
        const updated = await updateCrmWorkflowTask(crmRepositories, input);
        if (updated == null) {
          throw new Error('Workflow task not found');
        }
        await onUpdated(updated);
      } finally {
        setSaving(false);
      }
    },
    [onUpdated]
  );

  return { saving, patchTask };
}
