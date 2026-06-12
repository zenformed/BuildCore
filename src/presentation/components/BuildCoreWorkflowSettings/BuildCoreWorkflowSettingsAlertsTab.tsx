'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { CustomerTaskReminderFrequencyMinutes } from '@/domain/buildcore/buildCoreOrganizationSettings';
import { useBuildCoreCustomerTaskReminders } from '@/presentation/features/buildCoreWorkflowSettings/useBuildCoreCustomerTaskReminders';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import teamsStyles from '../BuildCoreTeams/BuildCoreTeams.module.css';
import stageStyles from '../BuildCoreWorkflowStages/BuildCoreWorkflowStages.module.css';
import { BuildCoreCustomerTaskReminderFrequencyPicker } from './BuildCoreCustomerTaskReminderFrequencyPicker';
import styles from './BuildCoreWorkflowSettings.module.css';

export function BuildCoreWorkflowSettingsAlertsTab(): ReactElement {
  const copy = content.workflowSettings.alerts.customerTaskReminders;
  const reminders = useBuildCoreCustomerTaskReminders(true);

  if (reminders.isLoading) {
    return <p className={styles.loading}>{copy.loading}</p>;
  }

  if (reminders.loadError) {
    return <p className={styles.error}>{reminders.loadError ?? copy.loadError}</p>;
  }

  const options =
    reminders.frequencyOptions.length > 0 ? reminders.frequencyOptions : [];
  const frequencyDisabled =
    !reminders.canEdit || reminders.isSaving || !reminders.customerTaskRemindersEnabled;

  return (
    <section className={styles.alertsSection} aria-labelledby="workflow-settings-alerts-heading">
      <div className={styles.alertsSplitTab}>
        <div className={styles.alertsSplitColumn}>
          <div className={styles.reminderSettingRow}>
            <div className={styles.reminderSettingCopy}>
              <h2 className={stageStyles.panelTitle}>{copy.enableLabel}</h2>
              <p className={`${projectStyles.cardHelper} ${styles.reminderSettingHint}`}>
                {copy.enableHint}
              </p>
            </div>
            <div className={styles.reminderSettingControl}>
              <button
                type="button"
                role="switch"
                className={`${teamsStyles.permissionSwitch} ${
                  reminders.customerTaskRemindersEnabled ? teamsStyles.permissionSwitchOn : ''
                }`}
                disabled={!reminders.canEdit || reminders.isSaving}
                aria-checked={reminders.customerTaskRemindersEnabled}
                aria-label={`${copy.enableLabel}: ${reminders.customerTaskRemindersEnabled ? 'on' : 'off'}`}
                onClick={() =>
                  void reminders.setCustomerTaskRemindersEnabled(!reminders.customerTaskRemindersEnabled)
                }
              >
                <span className={teamsStyles.permissionSwitchThumb} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.alertsSplitColumn}>
          <div className={styles.reminderSettingRow}>
            <div className={styles.reminderSettingCopy}>
              <h2 className={stageStyles.panelTitle}>{copy.frequencyLabel}</h2>
              <p className={`${projectStyles.cardHelper} ${styles.reminderSettingHint}`}>
                {copy.frequencyHint}
              </p>
            </div>
            <div className={styles.reminderSettingControl}>
              <BuildCoreCustomerTaskReminderFrequencyPicker
                value={reminders.customerTaskReminderFrequencyMinutes}
                options={options}
                disabled={frequencyDisabled}
                ariaLabel={copy.frequencyLabel}
                onChange={(minutes: CustomerTaskReminderFrequencyMinutes) =>
                  void reminders.setCustomerTaskReminderFrequencyMinutes(minutes)
                }
              />
            </div>
          </div>
        </div>
      </div>

      {!reminders.canEdit ? <p className={styles.readOnlyNote}>{copy.readOnlyNote}</p> : null}

      {reminders.statusMessage ? (
        <p
          className={`${teamsStyles.permissionStatusLine} ${
            reminders.statusKind === 'success'
              ? teamsStyles.permissionStatusSuccess
              : teamsStyles.permissionStatusError
          }`}
          role="status"
        >
          {reminders.statusMessage}
        </p>
      ) : null}
    </section>
  );
}
