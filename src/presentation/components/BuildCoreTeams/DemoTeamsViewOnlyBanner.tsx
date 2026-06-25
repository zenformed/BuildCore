'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './BuildCoreTeams.module.css';

export function DemoTeamsViewOnlyBanner(): ReactElement {
  const copy = content.teams.demo;

  return (
    <section className={styles.demoTeamsBanner} aria-label="Demo teams notice">
      <div className={styles.demoTeamsBannerCopy}>
        <p className={styles.demoTeamsBannerTitle}>{copy.viewOnlyBannerTitle}</p>
        <p className={styles.demoTeamsBannerMessage}>{copy.viewOnlyBannerMessage}</p>
      </div>
      <button type="button" className={styles.demoTeamsBannerCta} disabled>
        {copy.startFreeTrial}
      </button>
    </section>
  );
}
