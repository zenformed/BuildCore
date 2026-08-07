'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { CrmProjectStatus } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  listCrmProjectStatusMenuOptions,
  resolveCrmProjectStatusBadgeTone,
  resolveCrmProjectStatusPillLabel,
} from '@/presentation/features/crmProjectDetail/crmProjectStatusPill';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: CrmProjectStatus): string {
  const tone = resolveCrmProjectStatusBadgeTone(status);
  switch (tone) {
    case 'completed':
      return styles.overviewStatusBadgeCompleted;
    case 'lost':
      return styles.overviewStatusBadgeLost;
    case 'cancelled':
      return styles.overviewStatusBadgeCancelled;
    case 'active':
    default:
      return styles.overviewStatusBadgeActive;
  }
}

export type CrmProjectStatusPillPickerProps = {
  readonly status: CrmProjectStatus;
  readonly canChange: boolean;
  readonly busy?: boolean;
  readonly onRequestStatus: (status: CrmProjectStatus) => void;
};

export function CrmProjectStatusPillPicker({
  status,
  canChange,
  busy = false,
  onRequestStatus,
}: CrmProjectStatusPillPickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const copy = content.projectDetail.projectStatus;
  const label = resolveCrmProjectStatusPillLabel(status);
  const badgeClass = statusBadgeClass(status);
  const interactive = canChange && !busy;

  if (!interactive) {
    return (
      <span className={badgeClass} aria-label={label}>
        {label}
      </span>
    );
  }

  const menuOptions = listCrmProjectStatusMenuOptions(status);

  return (
    <div ref={anchorRef} className={styles.overviewStatusPillPicker}>
      <button
        type="button"
        className={`${badgeClass} ${styles.overviewStatusPillTrigger}`}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={copy.changeAriaLabel(label)}
        aria-busy={busy || undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {label}
        <span className={styles.overviewStatusPillCaret} aria-hidden />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        sizeToContent
        portalClassName={styles.formStatusPickerMenuPortal}
      >
        <div className={styles.overviewStatusPillMenu} role="listbox" aria-label={copy.menuAriaLabel}>
          {menuOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.selected}
              className={styles.overviewStatusPillOption}
              disabled={busy}
              onClick={() => {
                setOpen(false);
                onRequestStatus(option.value);
              }}
            >
              <span className={statusBadgeClass(option.value)}>{option.label}</span>
              {option.selected ? (
                <span className={styles.overviewStatusPillCheck} aria-hidden>
                  ✓
                </span>
              ) : (
                <span className={styles.overviewStatusPillCheckSpacer} aria-hidden />
              )}
            </button>
          ))}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
