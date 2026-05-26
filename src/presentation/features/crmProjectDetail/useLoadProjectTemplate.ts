'use client';

import { useCallback, useRef, useState } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import {
  applyBuildCoreProjectTemplate,
  deleteBuildCoreProjectTemplate,
  listBuildCoreProjectTemplates,
} from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type UseLoadProjectTemplateArgs = {
  readonly projectSlug: string;
  readonly onRefresh: () => Promise<void>;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function useLoadProjectTemplate({
  projectSlug,
  onRefresh,
  onSuccess,
  onError,
}: UseLoadProjectTemplateArgs) {
  const copy = content.projectDetail.loadTemplate;
  const [listOpen, setListOpen] = useState(false);
  const [templates, setTemplates] = useState<readonly BuildCoreProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState<BuildCoreProjectTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BuildCoreProjectTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const applyInFlightRef = useRef(false);

  const busy = applying || deleting;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listBuildCoreProjectTemplates();
      setTemplates(list);
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : copy.loadFailed;
      setLoadError(message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed]);

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
      await applyBuildCoreProjectTemplate({
        templateId: pendingApply.id,
        projectSlug,
      });
      setPendingApply(null);
      await onRefresh();
      onSuccess(copy.applySuccess);
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
  }, [copy.applyFailed, copy.applySuccess, onError, onRefresh, onSuccess, pendingApply, projectSlug]);

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

  return {
    listOpen,
    templates,
    loading,
    loadError,
    busy,
    applying,
    pendingApply,
    pendingDelete,
    openList,
    closeList,
    requestApply,
    cancelApply,
    confirmApply,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
