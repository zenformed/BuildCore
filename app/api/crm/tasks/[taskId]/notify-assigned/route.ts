/**
 * POST /api/crm/tasks/[taskId]/notify-assigned — relay to ZenformedCore (customer or member).
 * After a successful member email, also ensure the platform in-app notification exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  notifyCustomerErrorMessage,
  postBuildCoreWorkflowTaskNotifyAssigned,
} from '@/infrastructure/coreApi/buildCoreCrmNotifyClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { env } from '@/infrastructure/config/env';
import { getBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { dispatchWorkflowTaskAssignedNotifyEmailInApp } from '@/infrastructure/crm/server/dispatchWorkflowTaskAssignedNotifyEmailInApp';

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
        message: 'Task email notifications require ZenformedCore configuration.',
      },
      { status: 503 }
    );
  }

  const token = auth.context.authHeader.slice('Bearer '.length).trim();
  const result = await postBuildCoreWorkflowTaskNotifyAssigned(token, taskId, {
    appBaseUrl: getBuildCorePublicAppUrl(),
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

  // Member recipients: ensure sidebar row (idempotent with auto-assign create).
  // Customer recipients: email only — no platform in-app recipient.
  if (result.data.recipientKind !== 'customer') {
    await dispatchWorkflowTaskAssignedNotifyEmailInApp({
      supabase: auth.context.supabase,
      accessToken: token,
      organizationId: auth.context.organizationId,
      actorUserId: auth.context.user.id,
      taskId,
    });
  }

  return NextResponse.json(result.data);
}
