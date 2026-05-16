'use client';

import type { ReactElement } from 'react';
import {
  pickConfirmSnackbarClassNames,
  ZenformedConfirmSnackbar,
  type ZenformedConfirmSnackbarProps,
} from '@zenformed/core/dashboard-shell';
import styles from './ConfirmModal.module.css';

const confirmClassNames = pickConfirmSnackbarClassNames(styles);

export interface ConfirmModalProps extends Omit<ZenformedConfirmSnackbarProps, 'classNames'> {}

export function ConfirmModal(props: ConfirmModalProps): ReactElement {
  return <ZenformedConfirmSnackbar classNames={confirmClassNames} {...props} />;
}
