'use client';

import { useCallback, type MouseEvent, type ReactElement, type Ref } from 'react';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { extractUsPhoneDigits } from '@/domain/crm/phoneFormat';
import {
  useSummaryContactValuesPopover,
  type SummaryContactValuesPopoverKind,
} from '@/presentation/components/CrmProjectDetail/SummaryContactValuesPopover';
import styles from './ProjectDetail.module.css';

export type SubprojectMobileContactValueProps = {
  readonly kind: SummaryContactValuesPopoverKind;
  readonly values: readonly string[];
  readonly displayValue: string;
  readonly formatDisplayValue: (value: string) => string;
  readonly getCopyValue: (value: string) => string;
  readonly onCopied?: (message: string) => void;
  readonly isMemberRole?: boolean;
};

export function SubprojectMobileContactValue({
  kind,
  values,
  displayValue,
  formatDisplayValue,
  getCopyValue,
  onCopied,
  isMemberRole = false,
}: SubprojectMobileContactValueProps): ReactElement {
  const popoverValues = nonEmptyContactValues(values);
  const displayText = displayValue || '—';

  const getRowHref = useCallback(
    (rawValue: string): string | null => {
      if (isMemberRole && kind === 'email') return null;
      if (kind === 'phone') {
        const digits = extractUsPhoneDigits(getCopyValue(rawValue));
        return digits.length > 0 ? `tel:+1${digits}` : null;
      }
      const email = getCopyValue(rawValue).trim();
      return email ? `mailto:${encodeURIComponent(email)}` : null;
    },
    [getCopyValue, isMemberRole, kind]
  );

  if (popoverValues.length === 0) {
    return <span className={styles.subprojectMobileCardValue}>{displayText}</span>;
  }

  if (popoverValues.length === 1) {
    const singleValue = popoverValues[0];
    const label = formatDisplayValue(singleValue) || displayText;
    const href = getRowHref(singleValue);
    if (href) {
      return (
        <a
          href={href}
          className={`${styles.subprojectMobileCardValue} ${styles.subprojectMobileCardContactLink}`}
          onClick={(event) => event.stopPropagation()}
        >
          {label}
        </a>
      );
    }
    return <span className={styles.subprojectMobileCardValue}>{label}</span>;
  }

  const contactPopover = useSummaryContactValuesPopover({
    kind,
    values: popoverValues,
    formatDisplayValue,
    getCopyValue,
    onCopied: onCopied ?? (() => undefined),
    interactionMode: 'tap',
    tapTrigger: 'value',
    getRowHref,
  });

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    contactPopover.anchorHandlers.onClick?.(event);
  };

  return (
    <>
      <div
        ref={contactPopover.anchorRef as Ref<HTMLDivElement>}
        role="button"
        tabIndex={0}
        className={`${styles.subprojectMobileCardValue} ${styles.subprojectMobileCardContactButton}`}
        aria-expanded={contactPopover.open}
        aria-haspopup="dialog"
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            contactPopover.anchorHandlers.onClick?.(
              event as unknown as MouseEvent<HTMLDivElement>
            );
          }
        }}
      >
        {displayText}
      </div>
      {contactPopover.menu}
    </>
  );
}
