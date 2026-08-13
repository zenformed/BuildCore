'use client';

import type { ReactElement } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import styles from './crmShared.module.css';

export type CrmProjectPriorityIconProps = {
  ariaLabel: string;
};

export function CrmProjectPriorityIcon({ ariaLabel }: CrmProjectPriorityIconProps): ReactElement {
  return (
    <span className={styles.statusCircleIconSlot} aria-label={ariaLabel} title={ariaLabel} role="img">
      <LuTriangleAlert className={styles.projectPriorityTriangle} size={17} aria-hidden />
    </span>
  );
}
