'use client';

import type { ReactElement, ReactNode } from 'react';
import { Card } from '@/presentation/components/Card';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import { useBranding } from '@/presentation/hooks/useBranding';
import styles from './authPage.module.css';

export type AuthPageShellProps = {
  readonly cardTitle: string;
  readonly children: ReactNode;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  /** Hide the product logo above the card (e.g. cross-app launch handoff). */
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
      {!hideBrand ? (
        <div className={styles.brandBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={160} height={40} />
        </div>
      ) : null}
      <Card title={cardTitle} className={styles.card}>
        {loading ? <p className={styles.loading}>{loadingMessage}</p> : children}
      </Card>
    </div>
  );
}
