'use client';

import { useCallback, useState } from 'react';
import type { PipelineStageScope } from '@/domain/buildcore/orgPipelineStages';
import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import {
  createBuildCorePipelineStageBff,
  deleteBuildCorePipelineStageBff,
  reorderBuildCorePipelineStagesBff,
  renameBuildCorePipelineStageBff,
} from '@/infrastructure/coreApi/buildCorePipelineStagesBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';

export function useBuildCoreWorkflowStagesPage(scope: PipelineStageScope): {
  isLoading: boolean;
  loadError: string | null;
  canManage: boolean;
  busyStageId: string | null;
  statusMessage: string | null;
  statusKind: 'success' | 'error' | null;
  addStage: (label: string) => Promise<boolean>;
  renameStage: (stageId: string, label: string) => Promise<boolean>;
  deleteStage: (stageId: string) => Promise<boolean>;
  reorderStages: (orderedStageIds: readonly string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
  clearStatus: () => void;
} {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { canManage, isLoading, loadError, refetch, applyServerResponse } =
    useBuildCorePipelineStages();
  const [busyStageId, setBusyStageId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);

  const runMutation = useCallback(
    async (
      stageId: string | null,
      action: (token: string) => Promise<BuildCorePipelineStagesResponse>
    ): Promise<boolean> => {
      const token = getAccessToken();
      if (!token) {
        setStatusKind('error');
        setStatusMessage('You must be signed in to manage workflow stages.');
        return false;
      }

      setBusyStageId(stageId);
      setStatusMessage(null);
      setStatusKind(null);
      try {
        const response = await action(token);
        applyServerResponse(scope, response);
        return true;
      } catch (err) {
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Workflow stage update failed.');
        return false;
      } finally {
        setBusyStageId(null);
      }
    },
    [applyServerResponse, getAccessToken, scope]
  );

  const addStage = useCallback(
    async (label: string) =>
      runMutation(null, (token) => createBuildCorePipelineStageBff(token, label, scope)),
    [runMutation, scope]
  );

  const renameStage = useCallback(
    async (stageId: string, label: string) =>
      runMutation(stageId, (token) => renameBuildCorePipelineStageBff(token, stageId, label)),
    [runMutation]
  );

  const deleteStage = useCallback(
    async (stageId: string) =>
      runMutation(stageId, (token) => deleteBuildCorePipelineStageBff(token, stageId)),
    [runMutation]
  );

  const reorderStages = useCallback(
    async (orderedStageIds: readonly string[]) =>
      runMutation(null, (token) => reorderBuildCorePipelineStagesBff(token, orderedStageIds, scope)),
    [runMutation, scope]
  );

  return {
    isLoading,
    loadError,
    canManage,
    busyStageId,
    statusMessage,
    statusKind,
    addStage,
    renameStage,
    deleteStage,
    reorderStages,
    refetch,
    clearStatus: () => {
      setStatusMessage(null);
      setStatusKind(null);
    },
  };
}
