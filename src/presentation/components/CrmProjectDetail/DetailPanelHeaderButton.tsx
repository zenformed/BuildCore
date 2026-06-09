'use client';

import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { CloseIcon, RefreshIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderButtonVariant = 'add' | 'download' | 'refresh';

export type DetailPanelHeaderButtonProps = {
  variant: DetailPanelHeaderButtonVariant;
  refreshing?: boolean;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'title' | 'aria-label' | 'onClick' | 'disabled' | 'type'
>;

export function DetailPanelHeaderButton({
  variant,
  refreshing = false,
  title,
  'aria-label': ariaLabel,
  onClick,
  disabled,
  type = 'button',
}: DetailPanelHeaderButtonProps): ReactElement {
  const isRefreshBusy = variant === 'refresh' && refreshing;
  const className = [
    styles.detailPanelHeaderBtn,
    variant === 'add'
      ? styles.detailPanelHeaderBtn_add
      : variant === 'refresh'
        ? styles.detailPanelHeaderBtn_refresh
        : styles.detailPanelHeaderBtn_download,
    isRefreshBusy ? styles.detailPanelHeaderBtn_refreshing : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={className}
      title={title}
      aria-label={ariaLabel ?? title}
      aria-busy={isRefreshBusy || undefined}
      disabled={disabled || isRefreshBusy}
      onClick={onClick}
    >
      {variant === 'add' ? (
        <span aria-hidden>+</span>
      ) : variant === 'refresh' ? (
        isRefreshBusy ? (
          <CloseIcon className={styles.detailPanelHeaderBtnIcon_refresh} />
        ) : (
          <RefreshIcon className={styles.detailPanelHeaderBtnIcon_refresh} />
        )
      ) : (
        <span className={styles.detailPanelHeaderBtnIcon_download} aria-hidden />
      )}
    </button>
  );
}
