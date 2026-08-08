'use client';

import type { ReactElement } from 'react';
import { shouldUseProductionCrmListV2 } from '@/infrastructure/config/crmDataSource';
import { isPhotosListV2ClientFlagEnabled } from '@/infrastructure/config/photosListV2Config';
import { CrmPhotosPageV1 } from './CrmPhotosPageV1';
import { CrmPhotosPageV2 } from './CrmPhotosPageV2';

/**
 * Organization-wide Photos surface.
 * Client flag selects v2 UI; server independently protects /api/crm/photos/v2.
 * No silent v2→v1 fallback on v2 failures.
 */
export function CrmPhotosPage(): ReactElement {
  if (shouldUseProductionCrmListV2(isPhotosListV2ClientFlagEnabled())) {
    return <CrmPhotosPageV2 />;
  }
  return <CrmPhotosPageV1 />;
}
