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
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const openDialog = useCallback(() => {
    setTemplateName('');
    setSetAsDefault(false);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setTemplateName('');
    setSetAsDefault(false);
  }, [saving]);

  const saveTemplate = useCallback(async () => {
    const trimmed = templateName.trim();
    if (!trimmed) {
      onError(copy.nameRequired);
      return;
    }

    setSaving(true);
    try {
      await createBuildCoreProjectTemplate({
        name: trimmed,
        projectSlug,
        setAsDefault,
      });
      setOpen(false);
      setTemplateName('');
      setSetAsDefault(false);
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
  }, [copy.failed, copy.nameRequired, copy.success, onError, onSuccess, projectSlug, setAsDefault, templateName]);

  return {
    open,
    templateName,
    setTemplateName,
    setAsDefault,
    setSetAsDefault,
    saving,
    openDialog,
    closeDialog,
    saveTemplate,
    canSave: templateName.trim().length > 0,
  };
}
