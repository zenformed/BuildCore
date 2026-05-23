'use client';

import { Suspense, useCallback, useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/presentation/components/Card';
import { Button } from '@/presentation/components/Button';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

type InviteLookup = {
  organizationName: string;
  invitedEmail: string;
  invitedFirstName: string | null;
  invitedLastName: string | null;
  role: string;
  expiresAt: string | null;
};

function readErrorMessage(json: unknown, fallback: string): string {
  if (json != null && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
  }
  return fallback;
}

function AcceptInviteContent(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token')?.trim() ?? '';
  const { session, user, loading: authLoading } = useSaaSProfile();

  const [lookup, setLookup] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const returnPath = token
    ? `/accept-invite?token=${encodeURIComponent(token)}`
    : '/accept-invite';
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`;

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

  const handleAccept = useCallback(async () => {
    const accessToken = session?.access_token?.trim();
    if (!accessToken || !token) return;

    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch('/api/internal/organization/invites/accept', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        setAcceptError(readErrorMessage(json, 'Could not accept invite.'));
        return;
      }
      router.replace('/dashboard?settings=organization');
    } catch {
      setAcceptError('Could not accept invite.');
    } finally {
      setAccepting(false);
    }
  }, [router, session?.access_token, token]);

  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const invitedEmail = lookup?.invitedEmail.trim().toLowerCase() ?? null;
  const emailMatches =
    signedInEmail != null && invitedEmail != null && signedInEmail === invitedEmail;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '32rem' }}>
        <Card title="Accept organization invite">
          {!token ? (
            <p role="alert">Invite link is missing a token.</p>
          ) : lookupLoading || authLoading ? (
            <p>Loading invite…</p>
          ) : lookupError ? (
            <p role="alert">{lookupError}</p>
          ) : lookup ? (
            <>
              <p>
                You have been invited to join <strong>{lookup.organizationName}</strong> as{' '}
                <strong>{lookup.role}</strong>.
              </p>
              <p>
                Invited email: <strong>{lookup.invitedEmail}</strong>
              </p>
              {lookup.expiresAt ? (
                <p>Expires: {new Date(lookup.expiresAt).toLocaleString()}</p>
              ) : null}

              {!session || !user ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginTop: '1rem',
                  }}
                >
                  <p>Sign in with the invited email address to accept this invite.</p>
                  <Link href={loginHref}>Sign in</Link>
                </div>
              ) : !emailMatches ? (
                <p role="alert" style={{ marginTop: '1rem' }}>
                  You are signed in as {user.email}. Sign in with {lookup.invitedEmail} to accept
                  this invite.
                </p>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  {acceptError ? <p role="alert">{acceptError}</p> : null}
                  <Button type="button" disabled={accepting} onClick={() => void handleAccept()}>
                    {accepting ? 'Accepting…' : 'Accept invite'}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage(): ReactElement {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', padding: '2rem' }}>Loading…</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
