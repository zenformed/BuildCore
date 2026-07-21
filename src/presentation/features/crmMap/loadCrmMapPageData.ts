import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { listCrmProjectSummaries } from '@/application/use-cases/crm/listCrmProjectSummaries';
import { loadCrmProjectWorkflowProgressInputIndex } from '@/application/use-cases/crm/loadCrmProjectWorkflowProgressInputIndex';
import { crmRepositories } from '@/shared/di/container';
import { buildCrmMapModel } from './buildCrmMapModel';
import type { CrmMapMarker, CrmMapSearchableProject } from './crmMapTypes';

export type CrmMapPageData = {
  readonly summaries: readonly CrmProjectSummary[];
  readonly markers: readonly CrmMapMarker[];
  readonly searchable: readonly CrmMapSearchableProject[];
  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;
};

export async function loadCrmMapPageData(): Promise<CrmMapPageData> {
  const [summaries, workflowProgressInputIndex] = await Promise.all([
    listCrmProjectSummaries(crmRepositories, { rootsOnly: false }),
    loadCrmProjectWorkflowProgressInputIndex(crmRepositories),
  ]);
  const model = buildCrmMapModel(summaries);
  return {
    summaries,
    markers: model.markers,
    searchable: model.searchable,
    workflowProgressInputIndex,
  };
}
