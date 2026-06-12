import type {
  BuildCoreOrganizationCustomerTaskReminderSettings,
  CustomerTaskReminderFrequencyMinutes,
} from '@/domain/buildcore/buildCoreOrganizationSettings';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export type BuildCoreCustomerTaskReminderFrequencyOption = {
  readonly value: CustomerTaskReminderFrequencyMinutes;
  readonly label: string;
};

export type BuildCoreCustomerTaskRemindersResponse = BuildCoreOrganizationCustomerTaskReminderSettings & {
  readonly frequencyOptions: readonly BuildCoreCustomerTaskReminderFrequencyOption[];
  readonly canEdit: boolean;
};

export function parseBuildCoreCustomerTaskRemindersJson(
  json: unknown
): BuildCoreCustomerTaskRemindersResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.customerTaskRemindersEnabled !== 'boolean' ||
    typeof o.customerTaskReminderFrequencyMinutes !== 'number' ||
    typeof o.canEdit !== 'boolean' ||
    !Array.isArray(o.frequencyOptions)
  ) {
    return null;
  }

  const frequencyOptions = o.frequencyOptions
    .map((option): BuildCoreCustomerTaskReminderFrequencyOption | null => {
      if (option == null || typeof option !== 'object') return null;
      const row = option as Record<string, unknown>;
      if (typeof row.value !== 'number' || typeof row.label !== 'string') return null;
      return { value: row.value as CustomerTaskReminderFrequencyMinutes, label: row.label };
    })
    .filter((option): option is BuildCoreCustomerTaskReminderFrequencyOption => option != null);

  if (frequencyOptions.length === 0) return null;

  return {
    customerTaskRemindersEnabled: o.customerTaskRemindersEnabled,
    customerTaskReminderFrequencyMinutes:
      o.customerTaskReminderFrequencyMinutes as CustomerTaskReminderFrequencyMinutes,
    frequencyOptions,
    canEdit: o.canEdit,
  };
}

export async function fetchBuildCoreCustomerTaskRemindersBff(
  accessToken: string
): Promise<BuildCoreCustomerTaskRemindersResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/customer-task-reminders'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid customer task reminder settings response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load customer task reminder settings.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreCustomerTaskRemindersJson(json);
  if (parsed == null) {
    throw new Error('Invalid customer task reminder settings response.');
  }
  return parsed;
}

export async function patchBuildCoreCustomerTaskRemindersBff(
  accessToken: string,
  patch: Partial<BuildCoreOrganizationCustomerTaskReminderSettings>
): Promise<BuildCoreCustomerTaskRemindersResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/customer-task-reminders'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid customer task reminder settings response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not save customer task reminder settings.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreCustomerTaskRemindersJson(json);
  if (parsed == null) {
    throw new Error('Invalid customer task reminder settings response.');
  }
  return parsed;
}
