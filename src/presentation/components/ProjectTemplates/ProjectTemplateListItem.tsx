'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { formatProjectTemplateCreatedDate } from '@/presentation/features/projectTemplates/projectTemplateFormatters';
import styles from './ProjectTemplates.module.css';

function TrashIcon(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export type ProjectTemplateListItemProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly template: BuildCoreProjectTemplate;
  readonly busy: boolean;
  readonly defaultBusy: boolean;
  readonly showLoad?: boolean;
  readonly onLoad: (template: BuildCoreProjectTemplate) => void;
  readonly onDelete: (template: BuildCoreProjectTemplate) => void;
  readonly onToggleDefault: (template: BuildCoreProjectTemplate) => void;
};

export function ProjectTemplateListItem({
  templateScope,
  template,
  busy,
  defaultBusy,
  showLoad = true,
  onLoad,
  onDelete,
  onToggleDefault,
}: ProjectTemplateListItemProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(templateScope).load;
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
        <div className={styles.itemHeaderActions}>
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
          {!showLoad ? (
            <button
              type="button"
              className={`${styles.actionBtnIcon} ${styles.actionBtnIconDanger}`}
              disabled={busy}
              aria-label={copy.deleteAriaLabel(template.name)}
              title={copy.deleteAction}
              onClick={() => onDelete(template)}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>
      {showLoad ? (
        <div className={styles.itemActions}>
          <button
            type="button"
            className={styles.actionBtnPrimary}
            disabled={busy}
            onClick={() => onLoad(template)}
          >
            {copy.itemLoadAction}
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
      ) : null}
    </li>
  );
}
