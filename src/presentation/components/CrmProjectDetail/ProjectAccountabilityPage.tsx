'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export function ProjectAccountabilityContent(): ReactElement {
  const { project } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const entries = sortAccountabilityEntries(project.accountabilityLog);

  return (
    <section
      className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}`}
      aria-labelledby="project-accountability-heading"
    >
      <div className={styles.cardTitleRow}>
        <h3 id="project-accountability-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.accountability}
        </h3>
      </div>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{acc.empty}</p>
      ) : (
        <AccountabilityLogTable entries={entries} layout="modal" />
      )}
    </section>
  );
}
