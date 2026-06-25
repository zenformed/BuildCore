import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail } from '@/domain/crm';
import { buildProjectBudgetSummary } from '@/domain/crm';
import {
  BUILDCORE_DOCUMENT_STORAGE_BUCKET,
  buildBudgetEntryDocumentStorageKey,
  buildSafeDocumentFileName,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import type {
  BudgetEntryDocumentDownload,
  CreateBudgetEntryDocumentDownloadInput,
  DeleteBudgetEntryDocumentInput,
  UploadBudgetEntryDocumentInput,
} from '@/domain/crm/documentMutations';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { resolveMockCrmTeamMember } from '@/platform/mock/crm';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import {
  getEffectiveMockProjectDetailBySlug,
  saveMockProjectDetail,
} from './mockCrmMutationStore';
import {
  STORAGE_LIMIT_EXCEEDED_CODE,
  STORAGE_LIMIT_EXCEEDED_MESSAGE,
} from '@/domain/crm/documentUpload';

const DEFAULT_MOCK_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
const mockOrgStorageUsed = new Map<string, number>();

function requireDetail(slug: string): CrmProjectDetail {
  const detail = getEffectiveMockProjectDetailBySlug(slug);
  if (!detail) throw new CrmDocumentServiceError('not_found', 'Project not found');
  return detail;
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

function findBudgetEntry(detail: CrmProjectDetail, entryId: string): CrmBudgetEntry {
  const entry = detail.budget.entries.find((row) => row.id === entryId);
  if (!entry) throw new CrmDocumentServiceError('not_found', 'Budget entry not found');
  return entry;
}

function withBudgetDocumentCounts(detail: CrmProjectDetail): CrmProjectDetail {
  const entries = detail.budget.entries.map((entry) => ({
    ...entry,
    documentCount: detail.documents.filter((doc) => doc.budgetEntryId === entry.id).length,
  }));
  return { ...detail, budget: buildProjectBudgetSummary(entries) };
}

export function mockListBudgetEntryDocuments(input: {
  projectSlug: string;
  budgetEntryId: string;
}): readonly CrmDocumentMetadata[] {
  const detail = requireDetail(input.projectSlug);
  findBudgetEntry(detail, input.budgetEntryId);
  return detail.documents.filter((doc) => doc.budgetEntryId === input.budgetEntryId);
}

export async function mockUploadBudgetEntryDocument(
  storage: IDocumentStorageProvider,
  organizationId: string,
  actorUserId: string,
  input: UploadBudgetEntryDocumentInput
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
  findBudgetEntry(detail, input.budgetEntryId);
  assertMockStorageCapacity(organizationId, input.sizeBytes);

  const documentId = crypto.randomUUID();
  const safeFileName = buildSafeDocumentFileName(input.fileName);
  const storageKey = buildBudgetEntryDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    budgetEntryId: input.budgetEntryId,
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
    workflowTaskId: null,
    budgetEntryId: input.budgetEntryId,
    name: input.fileName.trim(),
    kind: 'other',
    stageSlug: null,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    reviewedAt: null,
    reviewedBy: null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  };

  adjustMockStorage(organizationId, input.sizeBytes);
  saveMockProjectDetail(
    input.projectSlug,
    withBudgetDocumentCounts({
      ...detail,
      documents: [document, ...detail.documents],
    })
  );

  return document;
}

export async function mockDeleteBudgetEntryDocument(
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: DeleteBudgetEntryDocumentInput
): Promise<void> {
  const detail = requireDetail(input.projectSlug);
  findBudgetEntry(detail, input.budgetEntryId);
  const existing = detail.documents.find((doc) => doc.id === input.documentId);
  if (!existing || existing.budgetEntryId !== input.budgetEntryId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const storageKey = buildBudgetEntryDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    budgetEntryId: input.budgetEntryId,
    documentId: existing.id,
    safeFileName: buildSafeDocumentFileName(existing.name),
  });

  await storage.deleteObject({ bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET, storageKey });
  adjustMockStorage(organizationId, -existing.sizeBytes);

  saveMockProjectDetail(
    input.projectSlug,
    withBudgetDocumentCounts({
      ...detail,
      documents: detail.documents.filter((doc) => doc.id !== input.documentId),
    })
  );
}

export async function mockCreateBudgetEntryDocumentDownload(
  storage: IDocumentStorageProvider,
  organizationId: string,
  input: CreateBudgetEntryDocumentDownloadInput
): Promise<BudgetEntryDocumentDownload> {
  const detail = requireDetail(input.projectSlug);
  findBudgetEntry(detail, input.budgetEntryId);
  const existing = detail.documents.find((doc) => doc.id === input.documentId);
  if (!existing || existing.budgetEntryId !== input.budgetEntryId) {
    throw new CrmDocumentServiceError('not_found', 'Document not found');
  }

  const storageKey = buildBudgetEntryDocumentStorageKey({
    organizationId,
    projectId: detail.summary.id,
    budgetEntryId: input.budgetEntryId,
    documentId: existing.id,
    safeFileName: buildSafeDocumentFileName(existing.name),
  });

  const url = await storage.createSignedDownloadUrl({
    bucket: BUILDCORE_DOCUMENT_STORAGE_BUCKET,
    storageKey,
  });

  return { url, fileName: existing.name, mimeType: existing.mimeType };
}
