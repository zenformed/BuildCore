'use client';

import type { ReactElement } from 'react';
import type { CrmPriority } from '@/domain/crm';
import { isProjectPriorityActive, toggleProjectPriority } from '@/domain/crm/projectPriorityToggle';
import { CrmProjectStatusCircleIcon } from '@/presentation/components/crmShared/CrmProjectStatusCircleIcon';
import styles from './ProjectDetail.module.css';

export type ProjectPriorityToggleProps = {
  readonly priority: CrmPriority;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly markPriorityLabel: string;
  readonly removePriorityLabel: string;
  readonly onToggle: (nextPriority: CrmPriority) => void | Promise<void>;
};

export function ProjectPriorityToggle({
  priority,
  busy = false,
  disabled = false,
  markPriorityLabel,
  removePriorityLabel,
  onToggle,
}: ProjectPriorityToggleProps): ReactElement {
  const active = isProjectPriorityActive(priority);
  const label = active ? removePriorityLabel : markPriorityLabel;

  return (
    <button
      type="button"
      className={styles.headerIconBtn}
      disabled={disabled || busy}
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-busy={busy || undefined}
      onClick={() => void onToggle(toggleProjectPriority(priority))}
    >
      <CrmProjectStatusCircleIcon kind="priority" active={active} size={18} />
    </button>
  );
}
