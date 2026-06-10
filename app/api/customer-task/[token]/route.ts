import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerTaskPortalView } from '@/infrastructure/crm/server/customerTaskPortalRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = context.params.token?.trim();
  if (!token) {
    return NextResponse.json({
      portal: {
        state: 'invalid',
        organizationName: '',
        projectName: '',
        taskTitle: '',
        taskInstructions: null,
        canSubmit: false,
        uploadedFiles: [],
      },
    });
  }
  return relayCustomerTaskPortalView(token);
}
