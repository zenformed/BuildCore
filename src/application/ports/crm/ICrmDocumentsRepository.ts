import type { CrmDocumentMetadata } from '@/domain/crm';

export interface ICrmDocumentsRepository {
  listByProjectId(projectId: string): readonly CrmDocumentMetadata[];
}
