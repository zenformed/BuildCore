import { NextRequest, NextResponse } from 'next/server';
import { relayLeadCaptureGet } from '@/infrastructure/lead/leadCaptureRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return relayLeadCaptureGet(context.params.token ?? '');
}
