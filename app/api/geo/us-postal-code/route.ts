/**
 * GET /api/geo/us-postal-code?code=37128
 *
 * Resolves a US ZIP code to centroid coordinates for client-side radius filtering.
 * Uses Zippopotam.us (ZIP centroid data). No lat/lng is stored on crm_projects today.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { geocodeUsPostalCode } from '@/infrastructure/geo/geocodeUsPostalCode';
import { normalizeUsPostalCode } from '@/domain/geo/normalizeUsPostalCode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const code = request.nextUrl.searchParams.get('code') ?? '';
  const normalized = normalizeUsPostalCode(code);
  if (normalized == null) {
    return NextResponse.json({ error: 'Invalid US ZIP code.' }, { status: 400 });
  }

  try {
    const coordinates = await geocodeUsPostalCode(normalized);
    if (coordinates == null) {
      return NextResponse.json({ error: 'ZIP code not found.' }, { status: 404 });
    }

    return NextResponse.json({
      postalCode: normalized,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  } catch {
    return NextResponse.json({ error: 'Geocoding lookup failed.' }, { status: 502 });
  }
}
