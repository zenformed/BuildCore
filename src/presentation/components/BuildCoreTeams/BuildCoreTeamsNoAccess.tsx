'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './BuildCoreTeams.module.css';

export function BuildCoreTeamsNoAccess(): ReactElement {
  return <p className={styles.noAccess}>{content.teams.noAccess}</p>;
}
