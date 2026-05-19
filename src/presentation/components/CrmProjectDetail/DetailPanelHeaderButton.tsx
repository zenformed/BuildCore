'use client';

import type { ButtonHTMLAttributes, ReactElement } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelHeaderButtonVariant = 'add' | 'download';

export type DetailPanelHeaderButtonProps = {
  variant: DetailPanelHeaderButtonVariant;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'title' | 'aria-label' | 'onClick' | 'disabled' | 'type'
>;

export function DetailPanelHeaderButton({
  variant,
  title,
  'aria-label': ariaLabel,
  onClick,
  disabled,
  type = 'button',
}: DetailPanelHeaderButtonProps): ReactElement {
  const className =
    variant === 'add'
      ? `${styles.detailPanelHeaderBtn} ${styles.detailPanelHeaderBtn_add}`
      : `${styles.detailPanelHeaderBtn} ${styles.detailPanelHeaderBtn_download}`;

  return (
    <button
      type={type}
      className={className}
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={disabled}
      onClick={onClick}
    >
      {variant === 'add' ? (
        <span aria-hidden>+</span>
      ) : (
        <span className={styles.detailPanelHeaderBtnIcon_download} aria-hidden />
      )}
    </button>
  );
}
