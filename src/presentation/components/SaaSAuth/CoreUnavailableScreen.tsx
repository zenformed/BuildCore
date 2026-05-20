'use client';

import React, { useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { Button } from '@/presentation/components/Button';
import { useAuthInterface } from '@/presentation/hooks/useAuthInterface';
import styles from './SaaSAuth.module.css';

const c = content.corePlatform;

export type CoreUnavailableScreenProps = {
  onRetry: () => void | Promise<void>;
  onContinueDegraded?: () => void;
  retryCooldownMs?: number;
};

export function CoreUnavailableScreen({
  onRetry,
  onContinueDegraded,
  retryCooldownMs = 30_000,
}: CoreUnavailableScreenProps): React.ReactElement {
  const { signOut } = useAuthInterface();
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryBlockedUntil, setRetryBlockedUntil] = useState(0);

  const retryDisabled = retryBusy || Date.now() < retryBlockedUntil;

  const handleRetry = async () => {
    if (retryDisabled) return;
    setRetryBusy(true);
    setRetryBlockedUntil(Date.now() + retryCooldownMs);
    try {
      await onRetry();
    } finally {
      setRetryBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{c.unavailableTitle}</h1>
        <p className={styles.message}>{c.unavailableMessage}</p>
        <div className={styles.actions}>
          <Button variant="primary" disabled={retryDisabled} onClick={() => void handleRetry()}>
            {retryBusy ? content.loading.page : c.retry}
          </Button>
          {onContinueDegraded ? (
            <Button variant="outline" onClick={onContinueDegraded}>
              {c.continueLimited}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => void signOut()}>
            {c.signOut}
          </Button>
        </div>
        {retryDisabled && !retryBusy ? (
          <p className={styles.message}>{c.retryCooldownHint}</p>
        ) : null}
      </div>
    </div>
  );
}
