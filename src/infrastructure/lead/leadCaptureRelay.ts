import { NextResponse } from 'next/server';
import { createCrmServiceRoleClient } from '@/infrastructure/crm/server/createCrmServiceRoleClient';
import { LeadCaptureInvalidTokenError, LeadCapturePersistenceError } from '@/infrastructure/lead/leadCaptureErrors';
import {
  getLeadCaptureProjectPhoto,
  getLeadCapturePublicContext,
  submitLeadCaptureForToken,
} from '@/infrastructure/lead/leadCaptureService';
import { validateLeadCaptureBody } from '@/infrastructure/crm/server/validateLeadCaptureBody';

function serviceUnavailable(): NextResponse {
  return NextResponse.json(
    { error: 'misconfigured', message: 'Lead capture is not configured.' },
    { status: 503 }
  );
}

function invalidTokenContext() {
  return {
    context: {
      state: 'invalid' as const,
      projectName: '',
      organizationName: '',
      industry: null,
      hasProjectPhoto: false,
    },
  };
}

export async function relayLeadCapturePhotoGet(token: string): Promise<NextResponse> {
  const leadToken = token.trim();
  if (!leadToken) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supabase = createCrmServiceRoleClient();
  if (supabase == null) return serviceUnavailable();

  try {
    const photo = await getLeadCaptureProjectPhoto(supabase, leadToken);
    if (photo == null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return new NextResponse(photo.buffer, {
      status: 200,
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    if (err instanceof LeadCapturePersistenceError) {
      console.error('[lead-capture] photo GET failed:', err.detail);
    } else {
      console.error('[lead-capture] photo GET failed:', err);
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function relayLeadCaptureGet(token: string): Promise<NextResponse> {
  const leadToken = token.trim();
  if (!leadToken) {
    return NextResponse.json(invalidTokenContext());
  }

  const supabase = createCrmServiceRoleClient();
  if (supabase == null) return serviceUnavailable();

  try {
    const context = await getLeadCapturePublicContext(supabase, leadToken);
    return NextResponse.json({ context });
  } catch (err) {
    if (err instanceof LeadCapturePersistenceError) {
      console.error('[lead-capture] GET failed:', err.detail);
    } else {
      console.error('[lead-capture] GET failed:', err);
    }
    return NextResponse.json(
      { error: 'server_error', message: 'Could not load lead form.' },
      { status: 500 }
    );
  }
}

export async function relayLeadCapturePost(
  token: string,
  body: unknown
): Promise<NextResponse> {
  const leadToken = token.trim();
  if (!leadToken) {
    return NextResponse.json(
      { error: 'invalid_token', message: 'Lead link is invalid or expired.' },
      { status: 404 }
    );
  }

  const validated = validateLeadCaptureBody(
    body != null && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  );
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  const supabase = createCrmServiceRoleClient();
  if (supabase == null) return serviceUnavailable();

  try {
    const result = await submitLeadCaptureForToken(supabase, leadToken, validated.input);
    return NextResponse.json({
      ok: true,
      subprojectSlug: result.subprojectSlug,
      subprojectName: result.subprojectName,
    });
  } catch (err) {
    if (err instanceof LeadCaptureInvalidTokenError) {
      return NextResponse.json({ error: 'invalid_token', message: err.message }, { status: 404 });
    }
    if (err instanceof LeadCapturePersistenceError) {
      console.error('[lead-capture] POST failed:', err.detail);
    } else {
      console.error('[lead-capture] POST failed:', err);
    }
    return NextResponse.json(
      { error: 'server_error', message: 'Could not submit your information. Try again.' },
      { status: 500 }
    );
  }
}
