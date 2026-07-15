import { NextRequest } from 'next/server';
import { postCoreNotificationsMarkAllRead } from '@/infrastructure/coreApi/platformNotificationsClient';
import { relayNotifications } from '../notificationsRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return relayNotifications(request, (token, organizationId) =>
    postCoreNotificationsMarkAllRead(token, organizationId)
  );
}
