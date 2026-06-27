'use client';

import type { ReactElement } from 'react';
import { ProjectDocumentsTabPanel } from './ProjectDocumentsTabPanel';
import styles from './ProjectDetail.module.css';

export function ProjectDocumentsContent(): ReactElement {
  return (
    <ProjectDocumentsTabPanel
      className={`${styles.workflowPanel} ${styles.documentsPagePanel}`}
      titleId="project-documents-heading"
    />
  );
}
