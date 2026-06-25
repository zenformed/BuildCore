import { NextRequest, NextResponse } from 'next/server';
import { relayLeadCapturePost } from '@/infrastructure/lead/leadCaptureRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'validation_error', message: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  return relayLeadCapturePost(context.params.token ?? '', body);
}
