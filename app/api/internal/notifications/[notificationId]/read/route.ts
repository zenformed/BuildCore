import { NextRequest, NextResponse } from 'next/server';
import { postCoreNotificationMarkRead } from '@/infrastructure/coreApi/platformNotificationsClient';
import { relayNotifications } from '../../notificationsRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  context: { params: { notificationId: string } }
) {
  const notificationId = decodeURIComponent(context.params.notificationId ?? '').trim();
  if (!notificationId) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'notificationId is required.' },
      { status: 400 }
    );
  }

  return relayNotifications(request, (token, organizationId) =>
    postCoreNotificationMarkRead(token, organizationId, notificationId)
  );
}
