import { NextRequest } from 'next/server';
import { getCoreNotificationsPage } from '@/infrastructure/coreApi/platformNotificationsClient';
import { readOptionalQueryParam, relayNotifications } from './notificationsRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const limit = readOptionalQueryParam(request, 'limit');
  const cursor = readOptionalQueryParam(request, 'cursor');
  return relayNotifications(request, (token, organizationId) =>
    getCoreNotificationsPage(token, organizationId, { limit, cursor })
  );
}
