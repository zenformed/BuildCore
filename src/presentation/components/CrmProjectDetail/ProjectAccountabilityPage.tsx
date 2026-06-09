'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export function ProjectAccountabilityContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const entries = sortAccountabilityEntries(project.accountabilityLog);

  return (
    <section
      className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}`}
      aria-labelledby="project-accountability-heading"
    >
      <DetailPanelHeader
        title={content.projectDetail.sections.accountability}
        titleId="project-accountability-heading"
      >
        <DetailPanelHeaderActions>
          <DetailPanelSectionRefresh
            sectionLabel={content.projectDetail.sections.accountability}
            onRefresh={onRefresh}
            onError={(message) => setToast({ kind: 'error', message })}
          />
        </DetailPanelHeaderActions>
      </DetailPanelHeader>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{acc.empty}</p>
      ) : (
        <div className={styles.accountabilityPageTableScroll}>
          <AccountabilityLogTable entries={entries} layout="modal" />
        </div>
      )}
    </section>
  );
}
