import type { CrmDocumentMetadata } from '@/domain/crm';
import type {
  CreateWorkflowTaskDocumentDownloadInput,
  DeleteWorkflowTaskDocumentInput,
  ListWorkflowTaskDocumentsInput,
  UploadWorkflowTaskDocumentInput,
  UploadWorkflowTaskDocumentResult,
  WorkflowTaskDocumentDownload,
} from '@/domain/crm/documentMutations';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmDocumentsRepository {
  listByProjectId(projectId: string): CrmRepositoryResult<readonly CrmDocumentMetadata[]>;

  listByWorkflowTaskId(
    input: ListWorkflowTaskDocumentsInput
  ): CrmRepositoryResult<readonly CrmDocumentMetadata[]>;

  upload(input: UploadWorkflowTaskDocumentInput): CrmRepositoryResult<UploadWorkflowTaskDocumentResult>;

  delete(input: DeleteWorkflowTaskDocumentInput): CrmRepositoryResult<void>;

  createDownload(
    input: CreateWorkflowTaskDocumentDownloadInput
  ): CrmRepositoryResult<WorkflowTaskDocumentDownload>;
}
