'use client';

import { useCallback, useState } from 'react';
import { updateCrmWorkflowTask } from '@/application/use-cases/crm';
import type { UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { crmRepositories } from '@/shared/di/container';

export function useWorkflowTaskPatch(onUpdated: () => Promise<void>): {
  saving: boolean;
  patchTask: (input: UpdateCrmWorkflowTaskInput) => Promise<void>;
} {
  const [saving, setSaving] = useState(false);

  const patchTask = useCallback(
    async (input: UpdateCrmWorkflowTaskInput) => {
      setSaving(true);
      try {
        await updateCrmWorkflowTask(crmRepositories, input);
        await onUpdated();
      } finally {
        setSaving(false);
      }
    },
    [onUpdated]
  );

  return { saving, patchTask };
}
