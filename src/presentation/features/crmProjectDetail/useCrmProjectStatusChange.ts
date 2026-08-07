'use client';

import { useCallback, useState } from 'react';
import type { CrmLossReason, CrmProjectStatus, CrmProjectSummary } from '@/domain/crm';
import { getCrmProjectStatusLabel } from '@/domain/crm';
import { setCrmProjectsStatus } from '@/application/use-cases/crm/setCrmProjectsStatus';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { MarkInactiveDialogTarget } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import { crmRepositories } from '@/shared/di/container';
import { interpretSetCrmProjectsStatusResult } from './crmProjectStatusPill';

export function useCrmProjectStatusChange(input: {
  readonly project: CrmProjectSummary;
  readonly canChange: boolean;
  readonly onRefresh: () => Promise<void>;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
}): {
  busy: boolean;
  lostDialogTarget: MarkInactiveDialogTarget | null;
  cancelledConfirmOpen: boolean;
  incompleteTasksWarningCount: number | null;
  setIncompleteTasksWarningCount: (value: number | null) => void;
  requestStatus: (status: CrmProjectStatus) => void;
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
  const [lostDialogTarget, setLostDialogTarget] = useState<MarkInactiveDialogTarget | null>(null);
  const [cancelledConfirmOpen, setCancelledConfirmOpen] = useState(false);
  const [incompleteTasksWarningCount, setIncompleteTasksWarningCount] = useState<number | null>(
    null
  );

  const applyStatus = useCallback(
    async (args: {
      readonly status: CrmProjectStatus;
      readonly confirmIncompleteTasks?: boolean;
      readonly lossReason?: CrmLossReason | null;
      readonly lossReasonOther?: string | null;
    }): Promise<'ok' | 'noop' | 'needs_confirmation' | 'failed'> => {
      if (!canMutateCrmProjectsInCurrentRuntime()) {
        input.onError(mockDisabled);
        return 'failed';
      }
      setBusy(true);
      try {
        const result = await setCrmProjectsStatus(crmRepositories, {
          projectSlugs: [input.project.slug],
          status: args.status,
          source: 'detail_pill',
          confirmIncompleteTasks: args.confirmIncompleteTasks === true ? true : null,
          lossReason: args.lossReason ?? null,
          lossReasonOther: args.lossReasonOther ?? null,
        });
        const outcome = interpretSetCrmProjectsStatusResult(
          result,
          input.project.slug,
          copy.failed
        );
        if (outcome.kind === 'confirmation_required') {
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
        await input.onRefresh();
        input.onSuccess(copy.success(getCrmProjectStatusLabel(args.status)));
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

  const requestStatus = useCallback(
    (status: CrmProjectStatus) => {
      if (!input.canChange || busy) return;
      if (status === input.project.status && status !== 'lost') {
        return;
      }
      if (status === 'lost') {
        setLostDialogTarget({ mode: 'single', project: input.project });
        return;
      }
      if (status === 'cancelled') {
        setCancelledConfirmOpen(true);
        return;
      }
      void applyStatus({ status });
    },
    [applyStatus, busy, input.canChange, input.project]
  );

  const closeLostDialog = useCallback(() => {
    if (busy) return;
    setLostDialogTarget(null);
  }, [busy]);

  const submitLost = useCallback(
    async (values: {
      readonly reason: CrmLossReason;
      readonly customReason: string | null;
    }): Promise<boolean> => {
      if (lostDialogTarget == null) return false;
      const result = await applyStatus({
        status: 'lost',
        lossReason: values.reason,
        lossReasonOther: values.customReason,
      });
      if (result === 'ok' || result === 'noop') {
        setLostDialogTarget(null);
        return true;
      }
      return false;
    },
    [applyStatus, lostDialogTarget]
  );

  const closeCancelledConfirm = useCallback(() => {
    if (busy) return;
    setCancelledConfirmOpen(false);
  }, [busy]);

  const confirmCancelled = useCallback(async (): Promise<boolean> => {
    setCancelledConfirmOpen(false);
    const result = await applyStatus({ status: 'cancelled' });
    return result === 'ok' || result === 'noop';
  }, [applyStatus]);

  const confirmCompleteAnyway = useCallback(async (): Promise<boolean> => {
    setIncompleteTasksWarningCount(null);
    const result = await applyStatus({ status: 'completed', confirmIncompleteTasks: true });
    return result === 'ok' || result === 'noop';
  }, [applyStatus]);

  return {
    busy,
    lostDialogTarget,
    cancelledConfirmOpen,
    incompleteTasksWarningCount,
    setIncompleteTasksWarningCount,
    requestStatus,
    closeLostDialog,
    submitLost,
    closeCancelledConfirm,
    confirmCancelled,
    confirmCompleteAnyway,
  };
}
