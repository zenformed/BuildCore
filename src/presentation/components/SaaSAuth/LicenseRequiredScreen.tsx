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
  const stripeUrl = env.stripePaymentUrl;

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>License required</h1>
        <p className={styles.message}>
          Your account does not have an active subscription. Subscribe to access the full app.
        </p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={() => window.open(stripeUrl, '_blank', 'noopener,noreferrer')}
          >
            Subscribe now
          </Button>
          {onRefetch && (
            <Button variant="outline" onClick={() => onRefetch()}>
              Refresh status
            </Button>
          )}
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
