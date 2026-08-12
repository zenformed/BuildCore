import Image from 'next/image';
import type { ReactElement } from 'react';
import styles from './ZenformedLoadingScreen.module.css';

export interface ZenformedLoadingScreenProps {
  statusMessage?: string;
}

export function ZenformedLoadingScreen({
  statusMessage,
}: ZenformedLoadingScreenProps = {}): ReactElement {
  return (
    <div className={styles.loadingShell} role="status" aria-label="Loading">
      <div className={styles.loadingStack}>
        <div className={styles.loadingContent}>
          <Image
            className={styles.loadingLogo}
            src="/zenformed-app-icons/platform.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <p className={styles.loadingLabel}>
            Loading
            <span className={styles.loadingDots} aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
        {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}
      </div>
    </div>
  );
}
