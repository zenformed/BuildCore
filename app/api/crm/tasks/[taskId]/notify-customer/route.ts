/**
 * POST /api/crm/tasks/[taskId]/notify-customer — relay to ZenformedCore (token + email on Core).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  notifyCustomerErrorMessage,
  postBuildCoreWorkflowTaskNotifyCustomer,
} from '@/infrastructure/coreApi/buildCoreCrmNotifyClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { env } from '@/infrastructure/config/env';
import { getBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { taskId: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const taskId = context.params.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json(
      {
        error: 'email_not_configured',
        message: 'Customer email notifications require ZenformedCore configuration.',
      },
      { status: 503 }
    );
  }

  const token = auth.context.authHeader.slice('Bearer '.length).trim();
  const result = await postBuildCoreWorkflowTaskNotifyCustomer(token, taskId, {
    portalBaseUrl: getBuildCorePublicAppUrl(),
  });

  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
    }
    return NextResponse.json(
      {
        error: 'notify_failed',
        message: notifyCustomerErrorMessage(result.error),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(result.data);
}
