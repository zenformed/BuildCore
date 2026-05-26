'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatProjectTemplateCreatedDate } from '@/presentation/features/projectTemplates/projectTemplateFormatters';
import styles from './ProjectTemplates.module.css';

export type ProjectTemplateListItemProps = {
  readonly template: BuildCoreProjectTemplate;
  readonly busy: boolean;
  readonly onLoad: (template: BuildCoreProjectTemplate) => void;
  readonly onDelete: (template: BuildCoreProjectTemplate) => void;
};

export function ProjectTemplateListItem({
  template,
  busy,
  onLoad,
  onDelete,
}: ProjectTemplateListItemProps): ReactElement {
  const copy = content.projectDetail.loadTemplate;
  const workflowCount = template.workflowTasksPayload.length;
  const paymentCount = template.paymentsPayload.length;

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <p className={styles.itemName}>{template.name}</p>
        <p className={styles.itemMeta}>
          {copy.createdLabel(formatProjectTemplateCreatedDate(template.createdAt))}
        </p>
        <p className={styles.itemMeta}>
          {copy.countsLabel(workflowCount, paymentCount)}
        </p>
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
