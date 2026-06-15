'use client';

import { Suspense, useCallback, useEffect, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ZenformedAuthLinkButton,
  ZenformedAuthNavLink,
  ZenformedAuthPageLinks,
} from '@zenformed/core/auth';
import { Button } from '@/presentation/components/Button';
import { formatBuildCoreDisplayDateTime } from '@/platform/formatting/buildCoreDisplayDate';
import { AuthPageShell } from '@/presentation/components/SaaSAuth/AuthPageShell';
import { InviteRegistrationForm } from '@/presentation/components/SaaSAuth/InviteRegistrationForm';
import { LoginForm } from '@/presentation/components/SaaSAuth/LoginForm';
import pageStyles from '@/presentation/components/SaaSAuth/authPage.module.css';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

type InviteLookup = {
  organizationName: string;
  invitedEmail: string;
  invitedFirstName: string | null;
  invitedLastName: string | null;
  role: string;
  expiresAt: string | null;
};

type AuthMode = 'register' | 'signin';

function readErrorMessage(json: unknown, fallback: string): string {
  if (json != null && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
  }
  return fallback;
}

function isExistingAccountError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already')
  );
}

async function postAcceptInvite(accessToken: string, inviteToken: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/internal/organization/invites/accept', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token: inviteToken }),
  });
  const json: unknown = await res.json();
  if (!res.ok) {
    return { ok: false, message: readErrorMessage(json, 'Could not accept invite.') };
  }
  return { ok: true };
}

async function readAccessToken(): Promise<string | null> {
  const { getSupabaseClient } = await import('@/infrastructure/supabase/supabaseClient');
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  return session?.access_token?.trim() ?? null;
}

function InvitePreview({ lookup }: { lookup: InviteLookup }): ReactElement {
  return (
    <div className={pageStyles.preview}>
      <p>
        You have been invited to join <strong>{lookup.organizationName}</strong> as{' '}
        <strong>{lookup.role}</strong>.
      </p>
      <p className={pageStyles.previewDetail}>
        Invited email: <strong>{lookup.invitedEmail}</strong>
      </p>
      {lookup.expiresAt ? (
        <p className={pageStyles.previewDetail}>
          Expires: {formatBuildCoreDisplayDateTime(lookup.expiresAt)}
        </p>
      ) : null}
    </div>
  );
}

function AcceptInviteContent(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token')?.trim() ?? '';
  const { session, user, loading: authLoading, waitForAppAccessReady } = useSaaSProfile();
  const { signIn, signUp, waitForSessionSync, signOut } = useAuth();

  const [lookup, setLookup] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authError, setAuthError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    if (!token) {
      setLookupLoading(false);
      setLookupError('Invite link is missing a token.');
      return;
    }

    let cancelled = false;
    setLookupLoading(true);
    setLookupError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/internal/organization/invites/lookup?token=${encodeURIComponent(token)}`,
          { cache: 'no-store', headers: { Accept: 'application/json' } }
        );
        const json: unknown = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLookup(null);
          setLookupError(readErrorMessage(json, 'This invite link is invalid or unavailable.'));
          return;
        }
        const body = json as Record<string, unknown>;
        if (typeof body.organizationName !== 'string' || typeof body.invitedEmail !== 'string') {
          setLookup(null);
          setLookupError('Unexpected response from server.');
          return;
        }
        setLookup({
          organizationName: body.organizationName,
          invitedEmail: body.invitedEmail,
          invitedFirstName:
            typeof body.invitedFirstName === 'string' ? body.invitedFirstName : null,
          invitedLastName: typeof body.invitedLastName === 'string' ? body.invitedLastName : null,
          role: typeof body.role === 'string' ? body.role : 'member',
          expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
        });
      } catch {
        if (!cancelled) {
          setLookup(null);
          setLookupError('Could not load invite details.');
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const completeAcceptFlow = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!token) return { ok: false, message: 'Invite token is missing.' };
    setAcceptError(null);
    setAccepting(true);
    try {
      await waitForSessionSync();
      const accessToken = (await readAccessToken()) ?? session?.access_token?.trim() ?? null;
      if (!accessToken) {
        const message = 'Session is not ready. Try signing in again.';
        setAcceptError(message);
        return { ok: false, message };
      }
      const result = await postAcceptInvite(accessToken, token);
      if (!result.ok) {
        setAcceptError(result.message);
        return result;
      }
      const accessReady = await waitForAppAccessReady();
      if (!accessReady.ok) {
        setAcceptError(accessReady.reason);
        return { ok: false, message: accessReady.reason };
      }
      router.replace('/dashboard?settings=organization');
      return { ok: true };
    } catch {
      const message = 'Could not accept invite.';
      setAcceptError(message);
      return { ok: false, message };
    } finally {
      setAccepting(false);
    }
  }, [router, session?.access_token, token, waitForAppAccessReady, waitForSessionSync]);

  const handleAccept = useCallback(async (): Promise<void> => {
    await completeAcceptFlow();
  }, [completeAcceptFlow]);

  const handleRegister = useCallback(
    async (password: string, confirmPassword: string): Promise<void> => {
      if (!lookup) return;
      setAuthError(null);
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }

      const result = await signUp(lookup.invitedEmail, password, {
        firstName: lookup.invitedFirstName,
        lastName: lookup.invitedLastName,
      });

      if (!result.success) {
        const message = result.error ?? 'Could not create account.';
        if (isExistingAccountError(message)) {
          setAuthMode('signin');
          setAuthError('An account already exists for this email. Sign in to accept the invite.');
          return;
        }
        setAuthError(message);
        return;
      }

      const accepted = await completeAcceptFlow();
      if (!accepted.ok) {
        throw new Error(accepted.message);
      }
    },
    [completeAcceptFlow, lookup, signUp]
  );

  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setAuthError(null);
      const result = await signIn(email, password);
      if (!result.success) {
        const message = result.error ?? 'Sign in failed';
        setAuthError(message);
        throw new Error(message);
      }
      const accepted = await completeAcceptFlow();
      if (!accepted.ok) {
        throw new Error(accepted.message);
      }
    },
    [completeAcceptFlow, signIn]
  );

  const handleSwitchAccount = useCallback(async (): Promise<void> => {
    setSwitchingAccount(true);
    setAuthError(null);
    setAcceptError(null);
    try {
      await signOut({ redirectTo: null });
      setAuthMode('register');
    } finally {
      setSwitchingAccount(false);
    }
  }, [signOut]);

  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const invitedEmail = lookup?.invitedEmail.trim().toLowerCase() ?? null;
  const emailMatches =
    signedInEmail != null && invitedEmail != null && signedInEmail === invitedEmail;

  const pageLoading = lookupLoading || authLoading || accepting;
  const cardTitle = lookup ? `Join ${lookup.organizationName}` : 'Accept invite';
  const loadingMessage = accepting
    ? 'Setting up your access…'
    : 'Loading invite…';

  return (
    <AuthPageShell
      cardTitle={cardTitle}
      loading={pageLoading}
      loadingMessage={loadingMessage}
    >
      {!pageLoading && !token ? (
        <p className={pageStyles.error} role="alert">
          Invite link is missing a token.
        </p>
      ) : null}
      {!pageLoading && lookupError ? (
        <p className={pageStyles.error} role="alert">
          {lookupError}
        </p>
      ) : null}
      {!pageLoading && lookup ? (
        <>
          <InvitePreview lookup={lookup} />

          {!session || !user ? (
            <>
              {authMode === 'register' ? (
                <InviteRegistrationForm
                  email={lookup.invitedEmail}
                  onSubmit={handleRegister}
                  error={authError}
                />
              ) : (
                <LoginForm
                  initialEmail={lookup.invitedEmail}
                  emailReadOnly
                  onSubmit={handleSignIn}
                  error={authError}
                  submitLabel="Sign in and accept"
                  submittingLabel="Signing in…"
                />
              )}
              <ZenformedAuthPageLinks>
                {authMode === 'register' ? (
                  <ZenformedAuthLinkButton
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode('signin');
                    }}
                  >
                    Already have an account? Sign in
                  </ZenformedAuthLinkButton>
                ) : (
                  <ZenformedAuthLinkButton
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode('register');
                    }}
                  >
                    Need an account? Create one
                  </ZenformedAuthLinkButton>
                )}
              </ZenformedAuthPageLinks>
            </>
          ) : !emailMatches ? (
            <>
              <p className={pageStyles.error} role="alert">
                You are signed in as {user.email}. Sign in with {lookup.invitedEmail} to accept
                this invite.
              </p>
              <ZenformedAuthPageLinks>
                <ZenformedAuthLinkButton
                  disabled={switchingAccount}
                  onClick={() => void handleSwitchAccount()}
                >
                  {switchingAccount ? 'Signing out…' : 'Switch account'}
                </ZenformedAuthLinkButton>
                <ZenformedAuthNavLink
                  href={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${encodeURIComponent(token)}`)}`}
                >
                  Sign in
                </ZenformedAuthNavLink>
              </ZenformedAuthPageLinks>
            </>
          ) : (
            <>
              {acceptError ? (
                <p className={pageStyles.error} role="alert">
                  {acceptError}
                </p>
              ) : null}
              <Button type="button" disabled={accepting} onClick={() => void handleAccept()}>
                {accepting ? 'Accepting…' : 'Accept invite'}
              </Button>
            </>
          )}
        </>
      ) : null}
    </AuthPageShell>
  );
}

export default function AcceptInvitePage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className={pageStyles.page}>
          <p className={pageStyles.loading}>Loading…</p>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
