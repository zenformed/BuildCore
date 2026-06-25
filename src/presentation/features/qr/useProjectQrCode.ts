'use client';

import { useMemo } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildLeadPublicUrl } from '@/infrastructure/lead/buildLeadPublicUrl';
import { useQrCodeLink } from '@/presentation/features/qr/useQrCodeLink';

export function useProjectQrCode(project: CrmProjectSummary) {
  const leadUrl = useMemo(
    () => buildLeadPublicUrl(project.leadToken),
    [project.leadToken]
  );
  const { copyLink, copyFeedback } = useQrCodeLink(leadUrl);

  return {
    leadUrl,
    copyLink,
    copyFeedback,
    downloadFileName: `${project.slug}-qr-code.png`,
    qrAriaLabel: `QR code for ${project.name}`,
  };
}
