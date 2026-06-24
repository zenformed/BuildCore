/**
 * POST /api/crm/communications/send — relay to ZenformedCore communications platform.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  CommunicationSendAttachmentInput,
  CommunicationSendRequestBody,
} from '@/infrastructure/coreApi/buildCoreCommunicationClient';
import {
  communicationSendErrorMessage,
  relayCommunicationSend,
} from '@/infrastructure/crm/server/communicationSendRelay';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { env } from '@/infrastructure/config/env';

export const dynamic = 'force-dynamic';

const VALID_ENTITY_TYPES = new Set([
  'workflow_task',
  'payment',
  'budget_entry',
  'project',
  'subproject',
]);

function parseSendBody(raw: unknown): CommunicationSendRequestBody | { error: string } {
  if (raw == null || typeof raw !== 'object') {
    return { error: 'Invalid request body.' };
  }
  const body = raw as Record<string, unknown>;
  const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';
  const channel = typeof body.channel === 'string' ? body.channel.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message : null;

  if (templateKey === '') return { error: 'templateKey is required.' };
  if (channel !== 'email') return { error: 'Only email channel is supported.' };
  if (subject === '') return { error: 'Subject is required.' };

  const recipientRaw = body.recipient;
  if (recipientRaw == null || typeof recipientRaw !== 'object') {
    return { error: 'recipient is required.' };
  }
  const recipientObj = recipientRaw as Record<string, unknown>;
  const email = typeof recipientObj.email === 'string' ? recipientObj.email.trim() : '';
  if (email === '') return { error: 'recipient.email is required.' };

  let entity: CommunicationSendRequestBody['entity'] = null;
  if (body.entity != null && typeof body.entity === 'object') {
    const entityObj = body.entity as Record<string, unknown>;
    const type = typeof entityObj.type === 'string' ? entityObj.type.trim() : '';
    const id = typeof entityObj.id === 'string' ? entityObj.id.trim() : '';
    if (type === '' || id === '') {
      return { error: 'entity.type and entity.id are required when entity is provided.' };
    }
    if (!VALID_ENTITY_TYPES.has(type)) {
      return { error: 'Invalid entity.type.' };
    }
    entity = { type: type as NonNullable<CommunicationSendRequestBody['entity']>['type'], id };
  }

  const attachments: CommunicationSendAttachmentInput[] = [];
  if (body.attachments != null) {
    if (!Array.isArray(body.attachments)) {
      return { error: 'attachments must be an array.' };
    }
    for (const item of body.attachments) {
      if (item == null || typeof item !== 'object') {
        return { error: 'Each attachment must include crmDocumentId.' };
      }
      const crmDocumentId =
        typeof (item as { crmDocumentId?: unknown }).crmDocumentId === 'string'
          ? (item as { crmDocumentId: string }).crmDocumentId.trim()
          : '';
      if (crmDocumentId === '') {
        return { error: 'Each attachment must include crmDocumentId.' };
      }
      attachments.push({ crmDocumentId });
    }
  }

  let context: CommunicationSendRequestBody['context'] = null;
  if (body.context != null && typeof body.context === 'object') {
    const contextObj = body.context as Record<string, unknown>;
    context = {
      projectName: typeof contextObj.projectName === 'string' ? contextObj.projectName : null,
      entityLabel: typeof contextObj.entityLabel === 'string' ? contextObj.entityLabel : null,
    };
  }

  return {
    templateKey,
    channel: 'email',
    recipient: {
      email,
      name: typeof recipientObj.name === 'string' ? recipientObj.name : null,
      contactId: typeof recipientObj.contactId === 'string' ? recipientObj.contactId : null,
      memberId: typeof recipientObj.memberId === 'string' ? recipientObj.memberId : null,
    },
    entity,
    subject,
    message,
    attachments,
    context,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json(
      {
        error: 'email_not_configured',
        message: 'Communications require ZenformedCore configuration.',
      },
      { status: 503 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parseSendBody(rawBody);
  if ('error' in parsed) {
    return NextResponse.json({ error: 'invalid_request', message: parsed.error }, { status: 400 });
  }

  const token = auth.context.authHeader.slice('Bearer '.length).trim();
  const result = await relayCommunicationSend(token, auth.context.organizationId, parsed);

  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
      const body =
        result.error.body != null && typeof result.error.body === 'object'
          ? (result.error.body as Record<string, unknown>)
          : null;
      if (body?.ok === false) {
        return NextResponse.json(body, { status: result.error.status });
      }
    }
    return NextResponse.json(
      {
        error: 'communication_send_failed',
        message: communicationSendErrorMessage(result.error),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(result.data);
}
