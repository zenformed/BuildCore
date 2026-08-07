'use client';

import { useCallback, useState } from 'react';
import type { CrmLossReason, CrmProjectStatus, CrmProjectSummary } from '@/domain/crm';
import { CRM_PROJECTS_STATUS_BULK_MAX_IDS } from '@/domain/crm/setCrmProjectsStatus';
import { setCrmProjectsStatus } from '@/application/use-cases/crm/setCrmProjectsStatus';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { MarkInactiveDialogTarget } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import { crmRepositories } from '@/shared/di/container';
import {
  formatBulkCrmProjectStatusSuccessMessage,
  interpretBulkSetCrmProjectsStatusResult,
} from './crmProjectBulkStatus';

export function useCrmProjectsBulkStatusChange(input: {
  readonly onProjectsUpdated: (slugs: readonly string[]) => void;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
}): {
  busy: boolean;
  lostDialogTarget: MarkInactiveDialogTarget | null;
  cancelledConfirmOpen: boolean;
  incompleteTasksWarningCount: number | null;
  setIncompleteTasksWarningCount: (value: number | null) => void;
  requestBulkStatus: (
    projects: readonly CrmProjectSummary[],
    status: CrmProjectStatus
  ) => void;
  closeLostDialog: () => void;
  submitLost: (values: {
    readonly reason: CrmLossReason;
    readonly customReason: string | null;
  }) => Promise<boolean>;
  closeCancelledConfirm: () => void;
  confirmCancelled: () => Promise<boolean>;
  confirmCompleteAnyway: () => Promise<boolean>;
} {
  const copy = content.projectDetail.projectStatus;
  const mockDisabled = content.crm.delete.mockDisabledMessage;
  const [busy, setBusy] = useState(false);
  const [pendingProjects, setPendingProjects] = useState<readonly CrmProjectSummary[]>([]);
  const [pendingStatus, setPendingStatus] = useState<CrmProjectStatus | null>(null);
  const [lostDialogTarget, setLostDialogTarget] = useState<MarkInactiveDialogTarget | null>(null);
  const [cancelledConfirmOpen, setCancelledConfirmOpen] = useState(false);
  const [incompleteTasksWarningCount, setIncompleteTasksWarningCount] = useState<number | null>(
    null
  );

  const applyStatus = useCallback(
    async (args: {
      readonly projects: readonly CrmProjectSummary[];
      readonly status: CrmProjectStatus;
      readonly confirmIncompleteTasks?: boolean;
      readonly lossReason?: CrmLossReason | null;
      readonly lossReasonOther?: string | null;
    }): Promise<'ok' | 'noop' | 'needs_confirmation' | 'failed'> => {
      if (args.projects.length === 0) return 'noop';
      if (!canMutateCrmProjectsInCurrentRuntime()) {
        input.onError(mockDisabled);
        return 'failed';
      }
      if (args.projects.length > CRM_PROJECTS_STATUS_BULK_MAX_IDS) {
        input.onError(copy.bulkMaxExceeded(CRM_PROJECTS_STATUS_BULK_MAX_IDS));
        return 'failed';
      }

      const projectSlugs = args.projects.map((project) => project.slug);
      setBusy(true);
      try {
        const result = await setCrmProjectsStatus(crmRepositories, {
          projectSlugs,
          status: args.status,
          source: 'table_bulk',
          confirmIncompleteTasks: args.confirmIncompleteTasks === true ? true : null,
          lossReason: args.lossReason ?? null,
          lossReasonOther: args.lossReasonOther ?? null,
        });
        const outcome = interpretBulkSetCrmProjectsStatusResult(
          result,
          args.status,
          copy.failed
        );
        if (outcome.kind === 'confirmation_required') {
          setPendingProjects(args.projects);
          setPendingStatus('completed');
          setIncompleteTasksWarningCount(outcome.incompleteTaskCount);
          return 'needs_confirmation';
        }
        if (outcome.kind === 'noop') {
          return 'noop';
        }
        if (outcome.kind === 'failure') {
          input.onError(outcome.message);
          return 'failed';
        }
        input.onProjectsUpdated(result.results.filter((row) => row.success).map((row) => row.slug));
        if (outcome.kind === 'partial') {
          input.onError(
            copy.bulkPartialFailure(outcome.updatedCount, outcome.failedCount)
          );
          input.onSuccess(
            formatBulkCrmProjectStatusSuccessMessage(args.status, outcome.updatedCount, copy)
          );
          return 'ok';
        }
        input.onSuccess(
          formatBulkCrmProjectStatusSuccessMessage(args.status, outcome.updatedCount, copy)
        );
        return 'ok';
      } catch {
        input.onError(copy.failed);
        return 'failed';
      } finally {
        setBusy(false);
      }
    },
    [copy, input, mockDisabled]
  );

  const requestBulkStatus = useCallback(
    (projects: readonly CrmProjectSummary[], status: CrmProjectStatus) => {
      if (busy || projects.length === 0) return;
      setPendingProjects(projects);
      setPendingStatus(status);
      if (status === 'lost') {
        setLostDialogTarget(
          projects.length === 1
            ? { mode: 'single', project: projects[0]! }
            : { mode: 'bulk', projects }
        );
        return;
      }
      if (status === 'cancelled') {
        setCancelledConfirmOpen(true);
        return;
      }
      void applyStatus({ projects, status });
    },
    [applyStatus, busy]
  );

  const closeLostDialog = useCallback(() => {
    if (busy) return;
    setLostDialogTarget(null);
    setPendingProjects([]);
    setPendingStatus(null);
  }, [busy]);

  const submitLost = useCallback(
    async (values: {
      readonly reason: CrmLossReason;
      readonly customReason: string | null;
    }): Promise<boolean> => {
      if (lostDialogTarget == null || pendingProjects.length === 0) return false;
      const result = await applyStatus({
        projects: pendingProjects,
        status: 'lost',
        lossReason: values.reason,
        lossReasonOther: values.customReason,
      });
      if (result === 'ok' || result === 'noop') {
        setLostDialogTarget(null);
        setPendingProjects([]);
        setPendingStatus(null);
        return true;
      }
      return false;
    },
    [applyStatus, lostDialogTarget, pendingProjects]
  );

  const closeCancelledConfirm = useCallback(() => {
    if (busy) return;
    setCancelledConfirmOpen(false);
    setPendingProjects([]);
    setPendingStatus(null);
  }, [busy]);

  const confirmCancelled = useCallback(async (): Promise<boolean> => {
    setCancelledConfirmOpen(false);
    if (pendingProjects.length === 0) return false;
    const result = await applyStatus({ projects: pendingProjects, status: 'cancelled' });
    setPendingProjects([]);
    setPendingStatus(null);
    return result === 'ok' || result === 'noop';
  }, [applyStatus, pendingProjects]);

  const confirmCompleteAnyway = useCallback(async (): Promise<boolean> => {
    setIncompleteTasksWarningCount(null);
    if (pendingProjects.length === 0 || pendingStatus !== 'completed') return false;
    const result = await applyStatus({
      projects: pendingProjects,
      status: 'completed',
      confirmIncompleteTasks: true,
    });
    setPendingProjects([]);
    setPendingStatus(null);
    return result === 'ok' || result === 'noop';
  }, [applyStatus, pendingProjects, pendingStatus]);

  return {
    busy,
    lostDialogTarget,
    cancelledConfirmOpen,
    incompleteTasksWarningCount,
    setIncompleteTasksWarningCount,
    requestBulkStatus,
    closeLostDialog,
    submitLost,
    closeCancelledConfirm,
    confirmCancelled,
    confirmCompleteAnyway,
  };
}
