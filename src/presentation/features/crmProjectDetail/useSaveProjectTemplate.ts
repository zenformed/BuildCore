'use client';

import { useCallback, useState } from 'react';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { createBuildCoreProjectTemplate } from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type UseSaveProjectTemplateArgs = {
  readonly projectSlug: string;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function useSaveProjectTemplate({
  projectSlug,
  onSuccess,
  onError,
}: UseSaveProjectTemplateArgs) {
  const copy = content.projectDetail.saveTemplate;
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  const openDialog = useCallback(() => {
    setTemplateName('');
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setTemplateName('');
  }, [saving]);

  const saveTemplate = useCallback(async () => {
    const trimmed = templateName.trim();
    if (!trimmed) {
      onError(copy.nameRequired);
      return;
    }

    setSaving(true);
    try {
      await createBuildCoreProjectTemplate({ name: trimmed, projectSlug });
      setOpen(false);
      setTemplateName('');
      onSuccess(copy.success);
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.failed;
      onError(message);
    } finally {
      setSaving(false);
    }
  }, [copy.failed, copy.nameRequired, copy.success, onError, onSuccess, projectSlug, templateName]);

  return {
    open,
    templateName,
    setTemplateName,
    saving,
    openDialog,
    closeDialog,
    saveTemplate,
    canSave: templateName.trim().length > 0,
  };
}
