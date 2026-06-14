'use client';

import type { ReactElement, ReactNode } from 'react';
import { zenformedAppIconSrc } from '@zenformed/core/dashboard-shell';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { Card } from '@/presentation/components/Card';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import { useBranding } from '@/presentation/hooks/useBranding';
import styles from './authPage.module.css';

export type AuthPageShellProps = {
  readonly cardTitle: string;
  readonly children: ReactNode;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  /** Hide the product logo above the card (e.g. company logo from branding). */
  readonly hideBrand?: boolean;
};

export function AuthPageShell({
  cardTitle,
  children,
  loading = false,
  loadingMessage = 'Loading…',
  hideBrand = false,
}: AuthPageShellProps): ReactElement {
  const { hasLogo, logoUrl } = useBranding();
  const appIconSrc = zenformedAppIconSrc('buildcore');

  return (
    <div className={styles.page}>
      <div className={styles.themeSlot}>
        <ThemeToggle />
      </div>
      {!hideBrand && hasLogo && logoUrl ? (
        <div className={styles.companyLogoSpot}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Company" />
        </div>
      ) : null}
      <div className={styles.brandBlock}>
        {appIconSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={appIconSrc}
            alt=""
            className={styles.brandIcon}
            width={40}
            height={40}
          />
        ) : null}
        <span className={styles.brandName}>{buildcoreAppDefinition.displayName}</span>
      </div>
      <Card title={cardTitle} className={styles.card}>
        {loading ? <p className={styles.loading}>{loadingMessage}</p> : children}
      </Card>
    </div>
  );
}
