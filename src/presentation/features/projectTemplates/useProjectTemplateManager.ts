'use client';

import { useCallback, useRef, useState } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateBlueprints } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { createProjectTemplateDraftFromTemplate } from '@/domain/crm/projectTemplateDraft';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import {
  applyBuildCoreProjectTemplate,
  deleteBuildCoreProjectTemplate,
  listBuildCoreProjectTemplates,
  setBuildCoreProjectTemplateDefault,
} from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';

export type ProjectTemplateApplyTarget =
  | {
      readonly mode: 'project';
      readonly projectSlug: string;
      readonly onRefresh: () => Promise<void>;
    }
  | {
      readonly mode: 'draft';
      readonly onApplyDraft: (blueprints: BuildCoreProjectTemplateBlueprints) => void;
    };

export type UseProjectTemplateManagerArgs = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly applyTarget: ProjectTemplateApplyTarget;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function useProjectTemplateManager({
  templateScope,
  applyTarget,
  onSuccess,
  onError,
}: UseProjectTemplateManagerArgs) {
  const copy = getProjectTemplateScopeCopy(templateScope).load;
  const [listOpen, setListOpen] = useState(false);
  const [templates, setTemplates] = useState<readonly BuildCoreProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState<BuildCoreProjectTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BuildCoreProjectTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const applyInFlightRef = useRef(false);

  const busy = applying || deleting || settingDefaultId != null;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listBuildCoreProjectTemplates({ templateScope });
      setTemplates(list);
      return list;
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.loadFailed;
      setLoadError(message);
      setTemplates([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, templateScope]);

  const openList = useCallback(() => {
    setListOpen(true);
    void fetchTemplates();
  }, [fetchTemplates]);

  const closeList = useCallback(() => {
    if (busy) return;
    setListOpen(false);
    setLoadError(null);
  }, [busy]);

  const requestApply = useCallback((template: BuildCoreProjectTemplate) => {
    setPendingApply(template);
    setListOpen(false);
  }, []);

  const cancelApply = useCallback(() => {
    if (applyInFlightRef.current || applying) return;
    setPendingApply(null);
  }, [applying]);

  const confirmApply = useCallback(async () => {
    if (pendingApply == null || applyInFlightRef.current) return;
    applyInFlightRef.current = true;
    setApplying(true);
    try {
      if (applyTarget.mode === 'project') {
        await applyBuildCoreProjectTemplate({
          templateId: pendingApply.id,
          projectSlug: applyTarget.projectSlug,
        });
        await applyTarget.onRefresh();
        onSuccess(copy.applySuccess);
      } else {
        applyTarget.onApplyDraft(createProjectTemplateDraftFromTemplate(pendingApply));
        onSuccess(copy.applyDraftSuccess);
      }
      setPendingApply(null);
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.applyFailed;
      onError(message);
    } finally {
      applyInFlightRef.current = false;
      setApplying(false);
    }
  }, [applyTarget, copy.applyDraftSuccess, copy.applyFailed, copy.applySuccess, onError, onSuccess, pendingApply]);

  const requestDelete = useCallback((template: BuildCoreProjectTemplate) => {
    setPendingDelete(template);
  }, []);

  const cancelDelete = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (pendingDelete == null) return;
    setDeleting(true);
    try {
      await deleteBuildCoreProjectTemplate(pendingDelete.id);
      setTemplates((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      onSuccess(copy.deleteSuccess);
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.deleteFailed;
      onError(message);
    } finally {
      setDeleting(false);
    }
  }, [copy.deleteFailed, copy.deleteSuccess, onError, onSuccess, pendingDelete]);

  const toggleDefault = useCallback(
    async (template: BuildCoreProjectTemplate) => {
      const nextDefault = !template.isDefault;
      setSettingDefaultId(template.id);
      try {
        const updated = await setBuildCoreProjectTemplateDefault(template.id, nextDefault);
        setTemplates((current) =>
          current.map((item) => {
            if (item.id === updated.id) return updated;
            if (nextDefault && item.isDefault && item.templateScope === updated.templateScope) {
              return { ...item, isDefault: false };
            }
            return item;
          })
        );
        onSuccess(nextDefault ? copy.setDefaultSuccess : copy.unsetDefaultSuccess);
      } catch (err) {
        const message =
          err instanceof CrmApiError && err.message
            ? err.message
            : err instanceof Error
              ? err.message
              : copy.setDefaultFailed;
        onError(message);
      } finally {
        setSettingDefaultId(null);
      }
    },
    [copy.setDefaultFailed, copy.setDefaultSuccess, copy.unsetDefaultSuccess, onError, onSuccess]
  );

  const applyConfirmMessage =
    applyTarget.mode === 'draft' ? copy.applyDraftConfirmMessage : copy.applyConfirmMessage;

  return {
    templateScope,
    listOpen,
    templates,
    loading,
    loadError,
    busy,
    applying,
    pendingApply,
    pendingDelete,
    settingDefaultId,
    openList,
    closeList,
    requestApply,
    cancelApply,
    confirmApply,
    requestDelete,
    cancelDelete,
    confirmDelete,
    toggleDefault,
    fetchTemplates,
    applyConfirmMessage,
  };
}
