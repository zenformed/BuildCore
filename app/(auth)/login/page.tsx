'use client';

import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useBranding } from '@/presentation/hooks/useBranding';
import { Card } from '@/presentation/components/Card';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export default function LoginPage(): ReactElement {
  const { signIn, waitForSessionSync, isLoading } = useAuth();
  const { hasLogo, logoUrl } = useBranding();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleSubmit(email: string, password: string): Promise<void> {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const result = await signIn(email, password);
      if (result.success) {
        await waitForSessionSync();
        router.replace('/dashboard');
        return;
      }
      const extendedResult = result as { mustResetPassword?: boolean; error?: string };
      if (extendedResult.mustResetPassword) {
        setLoginError('Password reset required. Use your host app’s reset flow.');
        return;
      }
      const errorMessage = extendedResult.error ?? 'Sign in failed';
      setLoginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoggingIn(false);
    }
  }

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
      <Card title="Sign in" className={styles.card}>
        {isLoading ? (
          <p className={styles.loading}>Checking session…</p>
        ) : loggingIn ? (
          <p className={styles.loading}>Logging in…</p>
        ) : (
          <LoginForm onSubmit={handleSubmit} error={loginError} />
        )}
      </Card>
    </div>
  );
}
