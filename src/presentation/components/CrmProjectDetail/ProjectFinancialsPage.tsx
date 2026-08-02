'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectFinancialReportContent } from './ProjectFinancialReportContent';
import styles from './ProjectDetail.module.css';

export type ProjectFinancialsContentProps = {
  /** When true, header actions render in the shared folder tab bar. */
  readonly embeddedInFolderTabs?: boolean;
};

export function ProjectFinancialsContent({
  embeddedInFolderTabs = false,
}: ProjectFinancialsContentProps): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();

  return (
    <div className={styles.detailFinancialsRowSingle}>
      <ProjectFinancialReportContent
        project={project}
        embeddedInFolderTabs={embeddedInFolderTabs}
        onRefresh={onRefresh}
        onRefreshError={(message) => setToast({ kind: 'error', message })}
        onError={(message) => setToast({ kind: 'error', message })}
      />
    </div>
  );
}
