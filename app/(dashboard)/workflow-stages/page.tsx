'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

export default function WorkflowStagesRedirectPage(): ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    router.replace(nav.routes.workflowStages);
  }, [router]);

  return null;
}
