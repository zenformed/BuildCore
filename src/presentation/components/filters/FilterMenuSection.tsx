'use client';

import type { ReactElement, ReactNode } from 'react';
import projectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import styles from './filters.module.css';

export type FilterMenuSectionProps = {
  readonly title: string;
  readonly children: ReactNode;
};

/** Static filter section matching the Workflow Tasks / projects filter fieldset style. */
export function FilterMenuSection({ title, children }: FilterMenuSectionProps): ReactElement {
  return (
    <fieldset className={projectStyles.projectsFilterFieldset}>
      <legend className={projectStyles.projectsFilterLegend}>{title}</legend>
      <div className={styles.filterMenuSectionBody}>{children}</div>
    </fieldset>
  );
}
