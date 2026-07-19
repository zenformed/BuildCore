'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { MemberMyTaskDetail } from '@/presentation/components/MemberTasks/MemberMyTaskDetail';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';

export default function DemoMemberMyTaskDetailPage({
  params,
}: {
  params: { taskId: string };
}): ReactElement | null {
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const router = useRouter();
  const nav = useBuildCoreNavigation();

  useEffect(() => {
    if (!isMemberRole) {
      router.replace(nav.routes.dashboard);
    }
  }, [isMemberRole, nav.routes.dashboard, router]);

  if (!isMemberRole) return null;

  return <MemberMyTaskDetail taskId={params.taskId} />;
}
