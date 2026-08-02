'use client';

import type { MouseEvent, ReactElement, ReactNode, Ref } from 'react';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  useSummaryContactValuesPopover,
  type SummaryContactValuesPopoverKind,
} from '@/presentation/components/CrmProjectDetail/SummaryContactValuesPopover';
import summaryStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectTableContactCellProps = {
  readonly kind: SummaryContactValuesPopoverKind;
  readonly values: readonly string[];
  readonly displayValue: string;
  readonly formatDisplayValue: (value: string) => string;
  readonly getCopyValue: (value: string) => string;
  readonly onCopied?: (message: string) => void;
  readonly title?: string;
  readonly leadingIcon?: ReactNode;
  readonly href?: string | null;
  readonly getRowHref?: (value: string) => string | null;
};

export function CrmProjectTableContactCell({
  kind,
  values,
  displayValue,
  formatDisplayValue,
  getCopyValue,
  onCopied,
  title,
  leadingIcon = null,
  href = null,
  getRowHref,
}: CrmProjectTableContactCellProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const popoverValues = nonEmptyContactValues(values);
  const hasPopover = popoverValues.length > 0;

  const contactPopover = useSummaryContactValuesPopover({
    kind,
    values: popoverValues,
    formatDisplayValue,
    getCopyValue,
    onCopied: onCopied ?? (() => undefined),
    enabled: hasPopover,
    interactionMode: isMobileLayout ? 'tap' : 'hover',
    getRowHref,
  });

  const displayText = displayValue || '—';
  const toggleIconClassName = [
    summaryStyles.summaryContactValuesToggleIcon,
    contactPopover.open ? summaryStyles.summaryContactValuesToggleIcon_open : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    contactPopover.toggleButtonProps?.onClick(event);
  };

  return (
    <>
      <div
        ref={contactPopover.anchorRef as Ref<HTMLDivElement>}
        className={[
          styles.tableContactCell,
          leadingIcon != null ? styles.tableContactCell_withIcon : '',
          hasPopover && isMobileLayout ? summaryStyles.summaryContactValueSlot_mobile : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...(hasPopover && !isMobileLayout ? contactPopover.anchorHandlers : {})}
        onClick={(event) => event.stopPropagation()}
      >
        {leadingIcon}
        {href && displayText !== '—' ? (
          <a
            className={styles.tableContactCellValueLink}
            href={href}
            title={title ?? displayText}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {displayText}
          </a>
        ) : (
          <span className={styles.tableContactCellValue} title={title ?? displayText}>
            {displayText}
          </span>
        )}
        {contactPopover.toggleButtonProps ? (
          <button
            type="button"
            className={summaryStyles.summaryContactValuesToggle}
            aria-expanded={contactPopover.toggleButtonProps['aria-expanded']}
            aria-haspopup={contactPopover.toggleButtonProps['aria-haspopup']}
            aria-label={contactPopover.toggleButtonProps['aria-label']}
            onClick={handleToggleClick}
          >
            <span className={toggleIconClassName} aria-hidden />
          </button>
        ) : null}
      </div>
      {contactPopover.menu}
    </>
  );
}
