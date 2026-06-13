'use client';

import { Suspense, useEffect, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseAuthEntryQueryParams } from '@zenformed/core/auth';
import {
  buildPlatformLoginUrl,
  redirectToPlatformLogin,
} from '@/infrastructure/auth/buildPlatformAuthEntryUrl';
import pageStyles from '@/presentation/components/SaaSAuth/authPage.module.css';

function LoginRedirectContent(): ReactElement {
  const searchParams = useSearchParams();

  useEffect(() => {
    const authEntryParams = parseAuthEntryQueryParams(searchParams);
    redirectToPlatformLogin({ authEntryParams });
  }, [searchParams]);

  return (
    <div className={pageStyles.page}>
      <p className={pageStyles.loading}>Redirecting to sign in…</p>
      <p className={pageStyles.previewDetail}>
        <a href={buildPlatformLoginUrl({ authEntryParams: parseAuthEntryQueryParams(searchParams) })}>
          Continue to sign in
        </a>
      </p>
    </div>
  );
}

export default function LoginPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className={pageStyles.page}>
          <p className={pageStyles.loading}>Redirecting to sign in…</p>
        </div>
      }
    >
      <LoginRedirectContent />
    </Suspense>
  );
}
