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
};

export function AuthPageShell({
  cardTitle,
  children,
  loading = false,
  loadingMessage = 'Loading…',
}: AuthPageShellProps): ReactElement {
  const { hasLogo, logoUrl } = useBranding();

  return (
    <div className={styles.page}>
      <div className={styles.themeSlot}>
        <ThemeToggle />
      </div>
      {hasLogo && logoUrl ? (
        <div className={styles.companyLogoSpot}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Company" />
        </div>
      ) : null}
      <div className={styles.brandBlock}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={160} height={40} />
      </div>
      <Card title={cardTitle} className={styles.card}>
        {loading ? <p className={styles.loading}>{loadingMessage}</p> : children}
      </Card>
    </div>
  );
}
