'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { fetchCrmMyTask } from '@/presentation/features/memberTasks/fetchCrmMyTasks';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type MemberMyTaskDetailProps = {
  readonly taskId: string;
};

/**
 * Legacy task URL: resolve assignment and send Members to the parent project page
 * (header + customer + flat Workflow/Payment tables for parent + subprojects).
 */
export function MemberMyTaskDetail({ taskId }: MemberMyTaskDetailProps): ReactElement {
  const copy = content.crm.myTasks.detail;
  const nav = useBuildCoreNavigation();
  const router = useRouter();
  const [message, setMessage] = useState<string>(content.crm.myTasks.loading);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const task = await fetchCrmMyTask(taskId);
        if (cancelled) return;
        if (task == null) {
          setMessage(copy.notFound);
          return;
        }
        router.replace(nav.routes.projectDetail(task.parentProjectSlug));
      } catch {
        if (!cancelled) setMessage(copy.notFound);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.notFound, nav.routes.projectDetail, router, taskId]);

  return <p className={styles.subtitle}>{message}</p>;
}
