'use client';

import type { ReactElement } from 'react';
import { BsCheckLg } from 'react-icons/bs';
import styles from './crmShared.module.css';

export type CrmProjectCompleteIconProps = {
  ariaLabel: string;
};

export function CrmProjectCompleteIcon({ ariaLabel }: CrmProjectCompleteIconProps): ReactElement {
  return (
    <span className={styles.statusCircleIconSlot} aria-label={ariaLabel} title={ariaLabel} role="img">
      <BsCheckLg className={styles.projectCompleteCheck} size={15} aria-hidden />
    </span>
  );
}
