'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ListViewSwitchIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import {
  DASHBOARD_LIST_VIEW_MODES,
  type DashboardListViewMode,
} from '@/presentation/features/crmProjects/dashboardListViewMode';
import styles from './CrmProjects.module.css';

export type CrmProjectsListViewMenuProps = {
  readonly viewMode: DashboardListViewMode;
  readonly onChange: (viewMode: DashboardListViewMode) => void;
};

export function CrmProjectsListViewMenu({
  viewMode,
  onChange,
}: CrmProjectsListViewMenuProps): ReactElement {
  const copy = content.crm.panel.listView;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const isSubprojectsView = viewMode === 'subprojects';

  return (
    <div ref={anchorRef} className={styles.projectsListViewWrap}>
      <button
        type="button"
        className={
          isSubprojectsView
            ? `${styles.projectsFilterBtn} ${styles.projectsFilterBtn_active}`
            : styles.projectsFilterBtn
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.toggleAriaLabel}
        title={copy.toggleAriaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <ListViewSwitchIcon className={styles.projectsFilterBtnIcon} />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="start"
        sizeToContent
        portalClassName={styles.projectsFilterMenuPortal}
      >
        <div className={styles.projectsListViewMenu} role="group" aria-label={copy.menuAriaLabel}>
          {DASHBOARD_LIST_VIEW_MODES.map((mode) => {
            const selected = viewMode === mode;
            const label = mode === 'projects' ? copy.projects : copy.subprojects;
            return (
              <button
                key={mode}
                type="button"
                className={[
                  styles.projectsListViewOption,
                  selected ? styles.projectsListViewOption_selected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selected}
                onClick={() => {
                  onChange(mode);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
