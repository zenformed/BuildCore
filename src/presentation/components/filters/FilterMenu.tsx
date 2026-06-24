'use client';

import type { ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import projectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';

export type FilterMenuProps = {
  readonly active: boolean;
  readonly ariaLabel: string;
  readonly openMenuTitle: string;
  readonly children: ReactNode;
  readonly clearLabel?: string;
  readonly onClear?: () => void;
  readonly clearDisabled?: boolean;
};

export function FilterMenu({
  active,
  ariaLabel,
  openMenuTitle,
  children,
  clearLabel,
  onClear,
  clearDisabled = false,
}: FilterMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={anchorRef} className={projectStyles.projectsFilterWrap}>
      <button
        type="button"
        className={
          active
            ? `${projectStyles.projectsFilterBtn} ${projectStyles.projectsFilterBtn_active}`
            : projectStyles.projectsFilterBtn
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        title={openMenuTitle}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FilterIcon className={projectStyles.projectsFilterBtnIcon} />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={projectStyles.projectsFilterMenuPortal}
      >
        <div className={projectStyles.projectsFilterMenu} role="group" aria-label={ariaLabel}>
          {children}
          {onClear != null && clearLabel != null ? (
            <button
              type="button"
              className={projectStyles.projectsFilterClearBtn}
              disabled={clearDisabled}
              onClick={onClear}
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
