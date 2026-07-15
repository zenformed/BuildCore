import { NextRequest } from 'next/server';
import { getCoreNotificationsUnreadCount } from '@/infrastructure/coreApi/platformNotificationsClient';
import { relayNotifications } from '../notificationsRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return relayNotifications(request, (token, organizationId) =>
    getCoreNotificationsUnreadCount(token, organizationId)
  );
}
