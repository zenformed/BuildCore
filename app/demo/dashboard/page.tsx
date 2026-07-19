'use client';

import type { ReactElement } from 'react';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { CrmProjectsPipeline } from '@/presentation/components/CrmProjects/CrmProjectsPipeline';
import { MemberMyTasksDashboard } from '@/presentation/components/MemberTasks/MemberMyTasksDashboard';

export default function DemoDashboardPage(): ReactElement {
  const dash = useBuildCoreDashboardContext();
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  if (isMemberRole) {
    return <MemberMyTasksDashboard />;
  }

  return <CrmProjectsPipeline onProjectRowClick={dash.onProjectRowClick} />;
}
