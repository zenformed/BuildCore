import type { CrmDocumentMetadata } from './document';

export type UploadWorkflowTaskDocumentInput = {
  readonly projectSlug: string;
  readonly workflowTaskId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly body: ArrayBuffer;
};

export type DeleteWorkflowTaskDocumentInput = {
  readonly projectSlug: string;
  readonly workflowTaskId: string;
  readonly documentId: string;
};

export type ListWorkflowTaskDocumentsInput = {
  readonly projectSlug: string;
  readonly workflowTaskId: string;
};

export type CreateWorkflowTaskDocumentDownloadInput = {
  readonly projectSlug: string;
  readonly workflowTaskId: string;
  readonly documentId: string;
};

export type WorkflowTaskDocumentDownload = {
  readonly url: string;
  readonly fileName: string;
  readonly mimeType: string;
};

export type UploadWorkflowTaskDocumentResult = {
  readonly document: CrmDocumentMetadata;
};

export type UploadBudgetEntryDocumentInput = {
  readonly projectSlug: string;
  readonly budgetEntryId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly body: ArrayBuffer;
};

export type DeleteBudgetEntryDocumentInput = {
  readonly projectSlug: string;
  readonly budgetEntryId: string;
  readonly documentId: string;
};

export type ListBudgetEntryDocumentsInput = {
  readonly projectSlug: string;
  readonly budgetEntryId: string;
};

export type CreateBudgetEntryDocumentDownloadInput = {
  readonly projectSlug: string;
  readonly budgetEntryId: string;
  readonly documentId: string;
};

export type BudgetEntryDocumentDownload = {
  readonly url: string;
  readonly fileName: string;
  readonly mimeType: string;
};

export type UploadBudgetEntryDocumentResult = {
  readonly document: CrmDocumentMetadata;
};
