'use client';

import type { ReactElement } from 'react';
import {
  pickConfirmSnackbarClassNames,
  ZenformedConfirmSnackbar,
  type ZenformedConfirmSnackbarProps,
} from '@zenformed/core/dashboard-shell';
import styles from './ConfirmModal.module.css';

const confirmClassNames = pickConfirmSnackbarClassNames(styles);

export interface ConfirmModalProps extends Omit<ZenformedConfirmSnackbarProps, 'classNames'> {
  hideIcon?: boolean;
}

export function ConfirmModal({ hideIcon = false, ...props }: ConfirmModalProps): ReactElement {
  const classNames = hideIcon
    ? {
        ...confirmClassNames,
        snackbarIcon: `${confirmClassNames.snackbarIcon} ${styles.snackbarIconHidden}`,
      }
    : confirmClassNames;

  return <ZenformedConfirmSnackbar classNames={classNames} {...props} />;
}
