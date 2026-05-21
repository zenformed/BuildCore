import type { ICrmReportsRepository } from '@/application/ports/crm/ICrmReportsRepository';
import type { CrmProjectDetail } from '@/domain/crm';
import { crmApiGetJson } from './crmApiClient';

type ReportsResponse = {
  readonly projects: readonly CrmProjectDetail[];
};

export class ApiCrmReportsRepository implements ICrmReportsRepository {
  listProjectDetails(): Promise<readonly CrmProjectDetail[]> {
    return crmApiGetJson<ReportsResponse>('/api/crm/reports').then((body) => body.projects);
  }
}
