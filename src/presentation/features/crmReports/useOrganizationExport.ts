'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  DEFAULT_PIPELINE_STAGES,
  organizationExportStageLabelsFromCatalogs,
} from '@/domain/crm/pipelineStage';
import { buildOrganizationExportWorkbook } from '@/export/organization/buildOrganizationExportData';
import { renderOrganizationExportBlob } from '@/export/organization/buildOrganizationExportWorkbook';
import { organizationExportFilename } from '@/export/organization/organizationExportFilename';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { downloadOrganizationExportFromApi } from '@/infrastructure/crm/api/downloadOrganizationExportFromApi';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { downloadBlob } from '@/reports/export/downloadBlob';
import { canExportBuildCoreOrganizationData } from './buildCoreOrganizationExportAccess';

export type UseOrganizationExportResult = {
  readonly canExport: boolean;
  readonly disabledInDemo: boolean;
  readonly disabledReason: string | null;
  readonly isExporting: boolean;
  readonly exportOrganization: () => Promise<void>;
};

export function useOrganizationExport(
  projects: readonly CrmProjectDetail[] | null
): UseOrganizationExportResult {
  const { organizationMembershipContext } = useSaaSProfile();
  const [isExporting, setIsExporting] = useState(false);
  const isApiSource = getCrmDataSource() === 'api';
  const disabledInDemo = isDemoRuntimeClient();
  const disabledReason = disabledInDemo ? content.demo.exportDisabledMessage : null;

  const canExport = useMemo(
    () =>
      !disabledInDemo &&
      canExportBuildCoreOrganizationData(organizationMembershipContext?.role) &&
      projects != null,
    [disabledInDemo, organizationMembershipContext?.role, projects]
  );

  const exportOrganization = useCallback(async () => {
    if (!canExport || isExporting || projects == null || disabledInDemo) return;

    setIsExporting(true);
    try {
      if (isApiSource) {
        await downloadOrganizationExportFromApi();
        return;
      }

      const stageLabels = organizationExportStageLabelsFromCatalogs({
        project: DEFAULT_PIPELINE_STAGES,
        subproject: DEFAULT_PIPELINE_STAGES,
      });
      const workbook = buildOrganizationExportWorkbook({
        projects,
        projectTimestampsById: new Map(),
        stageLabels,
        teamMembers: [],
      });
      downloadBlob(renderOrganizationExportBlob(workbook), organizationExportFilename());
    } catch {
      window.alert(content.reports.organizationExport.error);
    } finally {
      setIsExporting(false);
    }
  }, [canExport, disabledInDemo, isApiSource, isExporting, projects]);

  return {
    canExport,
    disabledInDemo,
    disabledReason,
    isExporting,
    exportOrganization,
  };
}
