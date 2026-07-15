import { NextRequest } from 'next/server';
import {
  getCoreNotificationsLatest,
} from '@/infrastructure/coreApi/platformNotificationsClient';
import {
  readOptionalQueryParam,
  relayNotifications,
} from '../notificationsRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const limit = readOptionalQueryParam(request, 'limit');
  return relayNotifications(request, (token, organizationId) =>
    getCoreNotificationsLatest(token, organizationId, { limit })
  );
}
