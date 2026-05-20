'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import styles from './CorePlatformDegradedBanner.module.css';

export type CorePlatformDegradedBannerProps = {
  /** Fixed overlay across the top of the viewport (does not shift layout). */
  variant?: 'overlay' | 'inline';
};

type BannerMarkupProps = {
  className: string;
  onDismiss: () => void;
};

function BannerMarkup({ className, onDismiss }: BannerMarkupProps): ReactElement {
  const c = content.corePlatform;
  return (
    <div className={className} role="alert" aria-live="polite">
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label={c.degradedBannerDismissAriaLabel}
      >
        ×
      </button>
      <div className={styles.copy}>
        <p className={styles.title}>{c.degradedBannerTitle}</p>
        <p className={styles.lead}>{c.degradedBannerLead}</p>
        <p className={styles.affected}>{c.degradedBannerAffected}</p>
      </div>
    </div>
  );
}

export function CorePlatformDegradedBanner({
  variant = 'overlay',
}: CorePlatformDegradedBannerProps): ReactElement | null {
  const { corePlatformStatus } = useSaaSProfile();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (corePlatformStatus === 'available') {
      setDismissed(false);
    }
  }, [corePlatformStatus]);

  if (corePlatformStatus !== 'unavailable' || dismissed) {
    return null;
  }

  const className =
    variant === 'overlay' ? `${styles.banner} ${styles.bannerNavbar}` : styles.banner;

  const markup = (
    <BannerMarkup className={className} onDismiss={() => setDismissed(true)} />
  );

  if (variant === 'overlay') {
    if (!mounted) return null;
    return createPortal(markup, document.body);
  }

  return markup;
}
