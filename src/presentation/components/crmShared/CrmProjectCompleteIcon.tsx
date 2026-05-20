'use client';

import type { ReactElement } from 'react';
import styles from './crmShared.module.css';

export type CrmProjectCompleteIconProps = {
  ariaLabel: string;
};

export function CrmProjectCompleteIcon({ ariaLabel }: CrmProjectCompleteIconProps): ReactElement {
  return (
    <span className={styles.projectCompleteIcon} aria-label={ariaLabel} title={ariaLabel} />
  );
}
