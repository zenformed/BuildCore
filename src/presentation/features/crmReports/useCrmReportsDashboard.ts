'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  listCrmProjectsForReporting,
  listCrmProjectsForReportingSync,
} from '@/application/use-cases/crm';
import { computeCrmReportsDashboard } from '@/reports/calculations/crmReportsDashboardCalculations';
import type { CrmReportsDashboardData, ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import {
  invalidateSessionCache,
  runSessionCached,
} from '@/infrastructure/coreApi/clientRequestDedupe';
import { DEMO_RESET_EVENT, useOptionalDemoMode } from '@/presentation/providers/DemoModeProvider';
import { crmRepositories } from '@/shared/di/container';

const CRM_REPORTS_PROJECTS_CACHE_KEY = 'crm-reports-projects';

export function useCrmReportsDashboard(): {
  dashboard: CrmReportsDashboardData | null;
  projects: readonly CrmProjectDetail[] | null;
  isLoading: boolean;
  error: string | null;
  period: ReportPeriodId;
  setPeriod: (period: ReportPeriodId) => void;
  reload: () => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const demoMode = useOptionalDemoMode();
  const [period, setPeriod] = useState<ReportPeriodId>('mtd');
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<readonly CrmProjectDetail[] | null>(() =>
    isApiSource ? null : listCrmProjectsForReportingSync(crmRepositories)
  );

  const reload = useCallback(() => {
    if (isApiSource) {
      invalidateSessionCache(CRM_REPORTS_PROJECTS_CACHE_KEY);
      setReloadKey((key) => key + 1);
      return;
    }
    setProjects(listCrmProjectsForReportingSync(crmRepositories));
    setError(null);
  }, [isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;

    let cancelled = false;
    setError(null);
    void runSessionCached(CRM_REPORTS_PROJECTS_CACHE_KEY, () =>
      listCrmProjectsForReporting(crmRepositories)
    )
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reports');
          setProjects([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isApiSource, reloadKey]);

  useEffect(() => {
    if (demoMode == null) return;
    reload();
  }, [demoMode, demoMode?.resetVersion, reload]);

  useEffect(() => {
    const onDemoReset = () => {
      reload();
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, [reload]);

  const dashboard = useMemo(() => {
    if (projects == null) return null;
    return computeCrmReportsDashboard(projects, period);
  }, [projects, period]);

  return {
    dashboard,
    projects,
    isLoading: projects == null,
    error,
    period,
    setPeriod,
    reload,
  };
}
