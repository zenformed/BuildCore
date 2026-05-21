'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  listCrmProjectsForReporting,
  listCrmProjectsForReportingSync,
} from '@/application/use-cases/crm';
import { computeCrmReportsDashboard } from '@/reports/calculations/crmReportsDashboardCalculations';
import type { CrmReportsDashboardData, ReportChartTabId, ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export function useCrmReportsDashboard(): {
  dashboard: CrmReportsDashboardData | null;
  isLoading: boolean;
  error: string | null;
  period: ReportPeriodId;
  setPeriod: (period: ReportPeriodId) => void;
  chartTab: ReportChartTabId;
  setChartTab: (tab: ReportChartTabId) => void;
  reload: () => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const [period, setPeriod] = useState<ReportPeriodId>('mtd');
  const [chartTab, setChartTab] = useState<ReportChartTabId>('revenue');
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<readonly CrmProjectDetail[] | null>(() =>
    isApiSource ? null : listCrmProjectsForReportingSync(crmRepositories)
  );

  const reload = useCallback(() => {
    if (isApiSource) {
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
    void listCrmProjectsForReporting(crmRepositories)
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

  const dashboard = useMemo(() => {
    if (projects == null) return null;
    return computeCrmReportsDashboard(projects, period, chartTab);
  }, [projects, period, chartTab]);

  return {
    dashboard,
    isLoading: projects == null,
    error,
    period,
    setPeriod,
    chartTab,
    setChartTab,
    reload,
  };
}
