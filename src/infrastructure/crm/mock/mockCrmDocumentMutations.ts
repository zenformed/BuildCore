import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import {
  BUILDCORE_DOCUMENT_STORAGE_BUCKET,
  BUILDCORE_DOCUMENT_STORAGE_PROVIDER,
  buildSafeDocumentFileName,
  buildWorkflowTaskDocumentStorageKey,
  STORAGE_LIMIT_EXCEEDED_CODE,
  STORAGE_LIMIT_EXCEEDED_MESSAGE,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import type {
  CreateWorkflowTaskDocumentDownloadInput,
  DeleteWorkflowTaskDocumentInput,
  UploadWorkflowTaskDocumentInput,
  WorkflowTaskDocumentDownload,
} from '@/domain/crm/documentMutations';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { resolveMockCrmTeamMember } from '@/platform/mock/crm';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import {
  getEffectiveMockProjectDetailBySlug,
  saveMockProjectDetail,
} from './mockCrmMutationStore';
import { canMarkWorkflowTaskDone } from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';

const DEFAULT_MOCK_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
const mockOrgStorageUsed = new Map<string, number>();

function requireDetail(slug: string): CrmProjectDetail {
  const detail = getEffectiveMockProjectDetailBySlug(slug);
  if (!detail) throw new CrmDocumentServiceError('not_found', 'Project not found');
  return detail;
}

function findTask(detail: CrmProjectDetail, taskId: string): CrmWorkflowTask {
  const task = detail.workflowTasks.find((t) => t.id === taskId);
  if (!task) throw new CrmDocumentServiceError('not_found', 'Workflow task not found');
  return task;
}

function assertMockStorageCapacity(organizationId: string, additionalBytes: number): void {
  const used = mockOrgStorageUsed.get(organizationId) ?? 0;
  if (used + additionalBytes > DEFAULT_MOCK_STORAGE_LIMIT_BYTES) {
    throw new CrmDocumentServiceError(STORAGE_LIMIT_EXCEEDED_CODE, STORAGE_LIMIT_EXCEEDED_MESSAGE);
  }
}

function adjustMockStorage(organizationId: string, delta: number): void {
  const used = mockOrgStorageUsed.get(organizationId) ?? 0;
  mockOrgStorageUsed.set(organizationId, Math.max(0, used + delta));
}

export function mockListWorkflowTaskDocuments(
  input: { projectSlug: string; workflowTaskId: string }
): readonly CrmDocumentMetadata[] {
  const detail = requireDetail(input.projectSlug);
  findTask(detail, input.workflowTaskId);
  return detail.documents.filter((doc) => doc.workflowTaskId === input.workflowTaskId);
}

export async function mockUploadWorkflowTaskDocument(
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: UploadWorkflowTaskDocumentInput
): Promise<CrmDocumentMetadata> {
  const validation = validateWorkflowTaskDocumentUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!validation.ok) {
    throw new CrmDocumentServiceError(validation.code, validation.message);
  }

  const detail = requireDetail(input.projectSlug);
  const task = findTask(detail, input.workflowTaskId);
  assertMockStorageCapacity(organizationId, input.sizeBytes);

  const documentId = crypto.randomUUID();
  const safeFileName = buildSafeDocumentFileName(input.fileName);
  const storageKey = buildWorkflowTaskDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    workflowTaskId: input.workflowTaskId,
    documentId,
    safeFileName,
  });

  await storage.putObject({
    bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET,
    storageKey,
    mimeType: input.mimeType,
    body: new Uint8Array(input.body),
  });

  const uploadedBy = resolveMockCrmTeamMember(actorUserId) ?? {
    id: actorUserId,
    displayName: 'You',
    initials: 'YO',
    avatarUrl: null,
    email: null,
  };

  const document: CrmDocumentMetadata = {
    id: documentId,
    workflowTaskId: input.workflowTaskId,
    budgetEntryId: null,
    name: input.fileName.trim(),
    kind: 'other',
    stageSlug: task.stageSlug,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    reviewedAt: null,
    reviewedBy: null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationSource: null,
    locationCapturedAt: null,
  };

  adjustMockStorage(organizationId, input.sizeBytes);
  saveMockProjectDetail(input.projectSlug, {
    ...detail,
    documents: [document, ...detail.documents],
  });

  return document;
}

export async function mockDeleteWorkflowTaskDocument(
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: DeleteWorkflowTaskDocumentInput
): Promise<void> {
  const detail = requireDetail(input.projectSlug);
  findTask(detail, input.workflowTaskId);
  const existing = detail.documents.find((doc) => doc.id === input.documentId);
  if (!existing || existing.workflowTaskId !== input.workflowTaskId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const storageKey = buildWorkflowTaskDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    workflowTaskId: input.workflowTaskId,
    documentId: existing.id,
    safeFileName: buildSafeDocumentFileName(existing.name),
  });

  await storage.deleteObject({ bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET, storageKey });
  adjustMockStorage(organizationId, -existing.sizeBytes);

  saveMockProjectDetail(input.projectSlug, {
    ...detail,
    documents: detail.documents.filter((doc) => doc.id !== input.documentId),
  });
}

export async function mockCreateWorkflowTaskDocumentDownload(
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: CreateWorkflowTaskDocumentDownloadInput
): Promise<WorkflowTaskDocumentDownload> {
  const detail = requireDetail(input.projectSlug);
  findTask(detail, input.workflowTaskId);
  const existing = detail.documents.find((doc) => doc.id === input.documentId);
  if (!existing || existing.workflowTaskId !== input.workflowTaskId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const storageKey = buildWorkflowTaskDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    workflowTaskId: input.workflowTaskId,
    documentId: existing.id,
    safeFileName: buildSafeDocumentFileName(existing.name),
  });

  const url = await storage.createSignedDownloadUrl({
    bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET,
    storageKey,
  });

  return { url, fileName: existing.name, mimeType: existing.mimeType };
}

export function mockAssertWorkflowTaskCanBeMarkedDone(
  detail: CrmProjectDetail,
  task: CrmWorkflowTask
): void {
  if (!task.documentsRequired) return;
  const docCount = detail.documents.filter((d) => d.workflowTaskId === task.id).length;
  if (!canMarkWorkflowTaskDone(task, docCount)) {
    throw new CrmDocumentServiceError(
      'DOCUMENTS_REQUIRED',
      'Upload at least one document before marking this task done.'
    );
  }
}
