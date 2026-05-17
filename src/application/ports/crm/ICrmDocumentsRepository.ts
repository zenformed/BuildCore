import type { CrmDocumentMetadata } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmDocumentsRepository {
  listByProjectId(projectId: string): CrmRepositoryResult<readonly CrmDocumentMetadata[]>;
}
