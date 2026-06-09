'use client';

import type { ReactElement } from 'react';
import { CrmProjectStatusCircleIcon } from './CrmProjectStatusCircleIcon';
import styles from './crmShared.module.css';

export type CrmProjectPriorityIconProps = {
  ariaLabel: string;
};

export function CrmProjectPriorityIcon({ ariaLabel }: CrmProjectPriorityIconProps): ReactElement {
  return (
    <span className={styles.statusCircleIconSlot} aria-label={ariaLabel} title={ariaLabel} role="img">
      <CrmProjectStatusCircleIcon kind="priority" active size={16} />
    </span>
  );
}
