import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS,
  isCustomerTaskReminderFrequencyMinutes,
  type BuildCoreOrganizationCustomerTaskReminderSettings,
} from '@/domain/buildcore/buildCoreOrganizationSettings';

type DbOrganizationSettingsRow = {
  customer_task_reminders_enabled: boolean;
  customer_task_reminder_frequency_minutes: number;
};

function mapRow(row: DbOrganizationSettingsRow | null): BuildCoreOrganizationCustomerTaskReminderSettings {
  if (row == null) return DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS;
  const frequency = row.customer_task_reminder_frequency_minutes;
  return {
    customerTaskRemindersEnabled: row.customer_task_reminders_enabled,
    customerTaskReminderFrequencyMinutes: isCustomerTaskReminderFrequencyMinutes(frequency)
      ? frequency
      : DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS.customerTaskReminderFrequencyMinutes,
  };
}

export async function loadBuildCoreOrganizationCustomerTaskReminderSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BuildCoreOrganizationCustomerTaskReminderSettings> {
  const { data, error } = await supabase
    .from('buildcore_organization_settings')
    .select('customer_task_reminders_enabled, customer_task_reminder_frequency_minutes')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error != null) {
    throw new Error(`buildcore_organization_settings_read_failed: ${error.message}`);
  }
  return mapRow((data as DbOrganizationSettingsRow | null) ?? null);
}

export async function saveBuildCoreOrganizationCustomerTaskReminderSettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: BuildCoreOrganizationCustomerTaskReminderSettings
): Promise<BuildCoreOrganizationCustomerTaskReminderSettings> {
  const { data, error } = await supabase
    .from('buildcore_organization_settings')
    .upsert(
      {
        organization_id: organizationId,
        customer_task_reminders_enabled: settings.customerTaskRemindersEnabled,
        customer_task_reminder_frequency_minutes: settings.customerTaskReminderFrequencyMinutes,
      },
      { onConflict: 'organization_id' }
    )
    .select('customer_task_reminders_enabled, customer_task_reminder_frequency_minutes')
    .single();
  if (error != null || data == null) {
    throw new Error(
      `buildcore_organization_settings_write_failed: ${error?.message ?? 'unknown'}`
    );
  }
  return mapRow(data as DbOrganizationSettingsRow);
}
