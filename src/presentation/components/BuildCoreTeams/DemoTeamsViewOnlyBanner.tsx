'use client';

import { useCallback, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { navigateToDemoPlatformProductPage } from '@/presentation/components/Demo/demoPlatformProductUrl';
import styles from './BuildCoreTeams.module.css';

export function DemoTeamsViewOnlyBanner(): ReactElement {
  const copy = content.teams.demo;

  const handleStartFreeTrial = useCallback(() => {
    navigateToDemoPlatformProductPage(true);
  }, []);

  return (
    <section className={styles.demoTeamsBanner} aria-label="Demo teams notice">
      <div className={styles.demoTeamsBannerCopy}>
        <p className={styles.demoTeamsBannerTitle}>{copy.viewOnlyBannerTitle}</p>
        <p className={styles.demoTeamsBannerMessage}>{copy.viewOnlyBannerMessage}</p>
      </div>
      <button type="button" className={styles.demoTeamsBannerCta} onClick={handleStartFreeTrial}>
        {copy.startFreeTrial}
      </button>
    </section>
  );
}