'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatProjectTemplateCreatedDate } from '@/presentation/features/projectTemplates/projectTemplateFormatters';
import styles from './ProjectTemplates.module.css';

export type ProjectTemplateListItemProps = {
  readonly template: BuildCoreProjectTemplate;
  readonly busy: boolean;
  readonly defaultBusy: boolean;
  readonly onLoad: (template: BuildCoreProjectTemplate) => void;
  readonly onDelete: (template: BuildCoreProjectTemplate) => void;
  readonly onToggleDefault: (template: BuildCoreProjectTemplate) => void;
};

export function ProjectTemplateListItem({
  template,
  busy,
  defaultBusy,
  onLoad,
  onDelete,
  onToggleDefault,
}: ProjectTemplateListItemProps): ReactElement {
  const copy = content.projectDetail.loadTemplate;
  const workflowCount = template.workflowTasksPayload.length;
  const paymentCount = template.paymentsPayload.length;

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <div className={styles.itemMain}>
          <p className={styles.itemName}>
            {template.name}
            {template.isDefault ? (
              <span className={styles.defaultBadge}>{copy.defaultBadge}</span>
            ) : null}
          </p>
          <p className={styles.itemMeta}>
            {copy.createdLabel(formatProjectTemplateCreatedDate(template.createdAt))}
          </p>
          <p className={styles.itemMeta}>
            {copy.countsLabel(workflowCount, paymentCount)}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.defaultToggle} ${template.isDefault ? styles.defaultToggle_active : ''}`}
          disabled={busy || defaultBusy}
          aria-pressed={template.isDefault}
          aria-label={
            template.isDefault ? copy.unsetDefaultAriaLabel(template.name) : copy.setDefaultAriaLabel(template.name)
          }
          title={template.isDefault ? copy.unsetDefaultTitle : copy.setDefaultTitle}
          onClick={() => onToggleDefault(template)}
        >
          <span className={styles.defaultToggleMark} aria-hidden />
        </button>
      </div>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          disabled={busy}
          onClick={() => onLoad(template)}
        >
          {copy.loadAction}
        </button>
        <button
          type="button"
          className={styles.actionBtnDanger}
          disabled={busy}
          onClick={() => onDelete(template)}
        >
          {copy.deleteAction}
        </button>
      </div>
    </li>
  );
}
