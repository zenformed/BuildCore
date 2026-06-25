'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS,
  CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
  type BuildCoreOrganizationCustomerTaskReminderSettings,
  type CustomerTaskReminderFrequencyMinutes,
} from '@/domain/buildcore/buildCoreOrganizationSettings';
import {
  fetchBuildCoreCustomerTaskRemindersBff,
  patchBuildCoreCustomerTaskRemindersBff,
  type BuildCoreCustomerTaskReminderFrequencyOption,
} from '@/infrastructure/coreApi/buildCoreCustomerTaskRemindersBff';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { organizationRoleCanAccessPipelineStagesAdmin } from '@/domain/buildcore/orgPipelineStages';

export function useBuildCoreCustomerTaskReminders(enabled: boolean): {
  customerTaskRemindersEnabled: boolean;
  customerTaskReminderFrequencyMinutes: CustomerTaskReminderFrequencyMinutes;
  frequencyOptions: readonly BuildCoreCustomerTaskReminderFrequencyOption[];
  canEdit: boolean;
  isLoading: boolean;
  loadError: string | null;
  statusMessage: string | null;
  statusKind: 'success' | 'error' | null;
  isSaving: boolean;
  setCustomerTaskRemindersEnabled: (nextValue: boolean) => Promise<void>;
  setCustomerTaskReminderFrequencyMinutes: (minutes: CustomerTaskReminderFrequencyMinutes) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { organizationMembershipContext, membershipContextStatus } = useSaaSProfile();
  const [settings, setSettings] = useState<BuildCoreOrganizationCustomerTaskReminderSettings>(
    DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS
  );
  const [frequencyOptions, setFrequencyOptions] = useState<
    readonly BuildCoreCustomerTaskReminderFrequencyOption[]
  >([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const loadGenerationRef = useRef(0);

  const canEdit =
    !runtimeModes.isDemoRuntime() &&
    organizationRoleCanAccessPipelineStagesAdmin(organizationMembershipContext?.role);

  const applyResponse = useCallback(
    (next: {
      customerTaskRemindersEnabled: boolean;
      customerTaskReminderFrequencyMinutes: CustomerTaskReminderFrequencyMinutes;
      frequencyOptions: readonly BuildCoreCustomerTaskReminderFrequencyOption[];
    }) => {
      setSettings({
        customerTaskRemindersEnabled: next.customerTaskRemindersEnabled,
        customerTaskReminderFrequencyMinutes: next.customerTaskReminderFrequencyMinutes,
      });
      setFrequencyOptions(next.frequencyOptions);
      setHasLoadedOnce(true);
    },
    []
  );

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) return;

      if (runtimeModes.isDemoRuntime()) {
        applyResponse({
          ...DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS,
          frequencyOptions: CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
        });
        setLoadError(null);
        setHasLoadedOnce(true);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (membershipContextStatus !== 'ready') return;
        setLoadError('Sign in required.');
        setHasLoadedOnce(true);
        return;
      }

      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      if (!options?.background && !hasLoadedOnce) {
        setLoadError(null);
      }

      try {
        const next = await fetchBuildCoreCustomerTaskRemindersBff(token);
        if (loadGenerationRef.current !== generation) return;
        applyResponse(next);
        setLoadError(null);
      } catch (err) {
        if (loadGenerationRef.current !== generation) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load reminder settings.');
      } finally {
        if (loadGenerationRef.current === generation && !hasLoadedOnce) {
          setHasLoadedOnce(true);
        }
      }
    },
    [applyResponse, enabled, getAccessToken, hasLoadedOnce, membershipContextStatus]
  );

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load, membershipContextStatus]);

  useEffect(() => {
    if (!enabled) return;

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void load({ background: true });
      }
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [enabled, load]);

  const savePatch = useCallback(
    async (patch: Partial<BuildCoreOrganizationCustomerTaskReminderSettings>) => {
      if (!canEdit || runtimeModes.isDemoRuntime()) return;
      const token = getAccessToken();
      if (!token) return;

      const previous = settings;
      setSettings({ ...settings, ...patch });
      setIsSaving(true);
      setStatusMessage(null);
      setStatusKind(null);

      try {
        const saved = await patchBuildCoreCustomerTaskRemindersBff(token, patch);
        applyResponse(saved);
        setStatusKind('success');
        setStatusMessage('Reminder settings saved.');
      } catch (err) {
        setSettings(previous);
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not save reminder settings.');
      } finally {
        setIsSaving(false);
      }
    },
    [applyResponse, canEdit, getAccessToken, settings]
  );

  const setCustomerTaskRemindersEnabled = useCallback(
    async (nextValue: boolean) => {
      await savePatch({ customerTaskRemindersEnabled: nextValue });
    },
    [savePatch]
  );

  const setCustomerTaskReminderFrequencyMinutes = useCallback(
    async (minutes: CustomerTaskReminderFrequencyMinutes) => {
      await savePatch({ customerTaskReminderFrequencyMinutes: minutes });
    },
    [savePatch]
  );

  return {
    customerTaskRemindersEnabled: settings.customerTaskRemindersEnabled,
    customerTaskReminderFrequencyMinutes: settings.customerTaskReminderFrequencyMinutes,
    frequencyOptions,
    canEdit,
    isLoading: enabled && !hasLoadedOnce,
    loadError,
    statusMessage,
    statusKind,
    isSaving,
    setCustomerTaskRemindersEnabled,
    setCustomerTaskReminderFrequencyMinutes,
    refetch: () => load({ background: true }),
  };
}
