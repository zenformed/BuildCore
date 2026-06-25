'use client';

import { useCallback, type ReactElement } from 'react';
import { env } from '@/infrastructure/config/env';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDemoMode } from '@/presentation/providers/DemoModeProvider';
import styles from './demoBanner.module.css';

export function DemoBanner(): ReactElement {
  const { resetDemo } = useDemoMode();
  const copy = content.demo.banner;

  const buildProductPageUrl = useCallback(
    (scrollToPricing = false) => {
      const platformOrigin = env.platformPublicAppUrl.replace(/\/+$/, '');
      const base = `${platformOrigin}/products/${encodeURIComponent(buildcoreAppDefinition.appSlug)}`;
      return scrollToPricing ? `${base}#${copy.pricingSectionId}` : base;
    },
    [copy.pricingSectionId]
  );

  const handleCloseDemo = useCallback(() => {
    window.location.assign(buildProductPageUrl());
  }, [buildProductPageUrl]);

  const handleStartFreeTrial = useCallback(() => {
    window.location.assign(buildProductPageUrl(true));
  }, [buildProductPageUrl]);

  return (
    <div className={styles.demoBanner} role="contentinfo" aria-label="Interactive demo footer">
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
  );
}
