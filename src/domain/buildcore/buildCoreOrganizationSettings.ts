export const CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES = {
  daily: 1440,
  threeDays: 4320,
  weekly: 10080,
  monthly: 43200,
} as const;

export type CustomerTaskReminderFrequencyMinutes =
  (typeof CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES)[keyof typeof CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES];

export const CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS: readonly {
  readonly value: CustomerTaskReminderFrequencyMinutes;
  readonly label: string;
}[] = [
  { value: CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES.daily, label: '24 Hours' },
  { value: CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES.threeDays, label: '3 Days' },
  { value: CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES.weekly, label: '1 Week' },
  { value: CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES.monthly, label: '1 Month' },
] as const;

export type BuildCoreOrganizationCustomerTaskReminderSettings = {
  readonly customerTaskRemindersEnabled: boolean;
  readonly customerTaskReminderFrequencyMinutes: CustomerTaskReminderFrequencyMinutes;
};

export const DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS: BuildCoreOrganizationCustomerTaskReminderSettings =
  {
    customerTaskRemindersEnabled: true,
    customerTaskReminderFrequencyMinutes: CUSTOMER_TASK_REMINDER_FREQUENCY_MINUTES.daily,
  };

const ALLOWED_FREQUENCY_MINUTES = new Set<number>(
  CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS.map((option) => option.value)
);

export function isCustomerTaskReminderFrequencyMinutes(
  value: number
): value is CustomerTaskReminderFrequencyMinutes {
  return ALLOWED_FREQUENCY_MINUTES.has(value);
}
