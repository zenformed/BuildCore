'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { navigateToDemoPlatformProductPage } from '@/presentation/components/Demo/demoPlatformProductUrl';
import { useDemoMode } from '@/presentation/providers/DemoModeProvider';
import styles from './demoBanner.module.css';

function DemoBannerChevron({ expanded }: { readonly expanded: boolean }): ReactElement {
  return (
    <svg
      className={styles.demoBannerToggleIcon}
      viewBox="0 0 20 20"
      aria-hidden
    >
      {expanded ? (
        <path
          d="M5 12.5 10 7.5 15 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5 7.5 10 12.5 15 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function DemoBanner(): ReactElement {
  const { resetDemo } = useDemoMode();
  const copy = content.demo.banner;
  const [collapsed, setCollapsed] = useState(false);

  const handleCloseDemo = useCallback(() => {
    navigateToDemoPlatformProductPage();
  }, []);

  const handleStartFreeTrial = useCallback(() => {
    navigateToDemoPlatformProductPage(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  return (
    <div className={styles.demoBannerDock}>
      {collapsed ? (
        <div className={styles.demoBannerCollapsedRail} aria-hidden />
      ) : (
        <div
          id="demo-banner-panel"
          className={styles.demoBanner}
          role="banner"
          aria-label="Interactive demo notice"
        >
          <div className={styles.demoBannerContent}>
            <div className={styles.demoBannerCopy}>
              <p className={styles.demoBannerTitle}>{copy.title}</p>
              <p className={styles.demoBannerMessage}>{copy.message}</p>
            </div>
            <div className={styles.demoBannerActions}>
              <button type="button" className={styles.demoBannerButton} onClick={handleCloseDemo}>
                {copy.closeDemo}
              </button>
              <button type="button" className={styles.demoBannerButton} onClick={resetDemo}>
                {copy.resetDemo}
              </button>
              <button
                type="button"
                className={styles.demoBannerButtonSecondary}
                onClick={handleStartFreeTrial}
              >
                {copy.startFreeTrial}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.demoBannerToggle}
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="demo-banner-panel"
        aria-label={collapsed ? copy.expandBanner : copy.collapseBanner}
      >
        <DemoBannerChevron expanded={!collapsed} />
      </button>
    </div>
  );
}
