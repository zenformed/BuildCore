'use client';

import React from 'react';
import { env } from '@/infrastructure/config/env';
import { Button } from '@/presentation/components/Button';
import { useAuthInterface } from '@/presentation/hooks/useAuthInterface';
import styles from './SaaSAuth.module.css';

export interface LicenseRequiredScreenProps {
  onRefetch?: () => void;
  onSignOut?: () => void;
}

export function LicenseRequiredScreen({ onRefetch, onSignOut }: LicenseRequiredScreenProps): React.ReactElement {
  const { signOut } = useAuthInterface();
  const platformOrigin = env.platformPublicAppUrl.replace(/\/+$/, '');
  const buildCoreProductUrl = `${platformOrigin}/products/buildcore`;
  const platformDashboardUrl = `${platformOrigin}/dashboard`;

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.licenseTitleRow}>
          <img
            className={styles.licenseAppLogo}
            src="/zenformed-app-icons/buildcore.png"
            alt=""
          />
          <h1 className={styles.title}>BuildCore access required</h1>
        </div>
        <p className={styles.message}>
          Your organization does not currently have access to BuildCore. View available plans or
          return to your Zenformed dashboard.
        </p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={() => window.location.assign(buildCoreProductUrl)}
          >
            Get BuildCore
          </Button>
          <Button variant="outline" onClick={() => window.location.assign(platformDashboardUrl)}>
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
          {onRefetch && (
            <button className={styles.refreshAccess} type="button" onClick={() => onRefetch()}>
              Already purchased? Check access again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
