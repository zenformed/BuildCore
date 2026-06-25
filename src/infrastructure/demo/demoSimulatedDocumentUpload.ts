import type { CrmDocumentKind, CrmDocumentMetadata } from '@/domain/crm';
import { validateBuildCoreUpload } from '@/domain/crm/buildCoreUploadPolicy';
import { validateWorkflowTaskDocumentUpload } from '@/domain/crm/documentUpload';
import { buildProjectPrimaryPhotoStorageKey, validateProjectPrimaryPhotoUpload } from '@/domain/crm/projectPrimaryPhoto';
import type { CrmProjectDetail } from '@/domain/crm';
import { DEMO_ORGANIZATION_ID, DEMO_TEAM_MEMBER_ID } from '@/infrastructure/demo/demoProfileFixtures';
import {
  getEffectiveMockProjectDetailBySlug,
  saveMockProjectDetail,
} from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { resolveMockCrmTeamMember } from '@/platform/mock/crm';
import type { CrmDirectUploadScope } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';

function requireDetail(slug: string): CrmProjectDetail {
  const detail = getEffectiveMockProjectDetailBySlug(slug);
  if (detail == null) {
    throw new Error('Project not found');
  }
  return detail;
}

function demoUploader(): CrmDocumentMetadata['uploadedBy'] {
  return (
    resolveMockCrmTeamMember(DEMO_TEAM_MEMBER_ID) ?? {
      id: DEMO_TEAM_MEMBER_ID,
      displayName: 'Alex Rivera',
      initials: 'AR',
      avatarUrl: null,
      email: 'alex.rivera@zenformed.test',
    }
  );
}

function inferDocumentKind(mimeType: string): CrmDocumentKind {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

function appendDocument(projectSlug: string, document: CrmDocumentMetadata): void {
  const detail = requireDetail(projectSlug);
  saveMockProjectDetail(projectSlug, {
    ...detail,
    documents: [document, ...detail.documents],
  });
}

/** Creates a fake uploaded document row in mock project state without touching storage or APIs. */
export async function simulateDemoDocumentUpload(
  file: File,
  uploadScope: CrmDirectUploadScope
): Promise<{ readonly documentId: string; readonly mimeType: string; readonly fileName: string }> {
  const mimeType = file.type || 'application/octet-stream';
  const validation = validateBuildCoreUpload({
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const documentId = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();
  const uploadedBy = demoUploader();

  if (uploadScope.scope === 'workflow_task') {
    const workflowValidation = validateWorkflowTaskDocumentUpload({
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
    });
    if (!workflowValidation.ok) {
      throw new Error(workflowValidation.message);
    }

    const detail = requireDetail(uploadScope.projectSlug);
    const task = detail.workflowTasks.find((entry) => entry.id === uploadScope.workflowTaskId);
    if (task == null) {
      throw new Error('Workflow task not found');
    }

    appendDocument(uploadScope.projectSlug, {
      id: documentId,
      workflowTaskId: uploadScope.workflowTaskId,
      budgetEntryId: null,
      name: file.name.trim(),
      kind: inferDocumentKind(mimeType),
      stageSlug: task.stageSlug,
      uploadedAt,
      uploadedBy,
      reviewedAt: null,
      reviewedBy: null,
      mimeType,
      sizeBytes: file.size,
    });
  } else if (uploadScope.scope === 'budget_entry') {
    const detail = requireDetail(uploadScope.projectSlug);
    const entry = detail.budget.entries.find((item) => item.id === uploadScope.budgetEntryId);
    if (entry == null) {
      throw new Error('Budget entry not found');
    }

    appendDocument(uploadScope.projectSlug, {
      id: documentId,
      workflowTaskId: null,
      budgetEntryId: uploadScope.budgetEntryId,
      name: file.name.trim(),
      kind: inferDocumentKind(mimeType),
      stageSlug: null,
      uploadedAt,
      uploadedBy,
      reviewedAt: null,
      reviewedBy: null,
      mimeType,
      sizeBytes: file.size,
    });
  } else {
    appendDocument(uploadScope.projectSlug, {
      id: documentId,
      workflowTaskId: null,
      budgetEntryId: null,
      name: file.name.trim(),
      kind: inferDocumentKind(mimeType),
      stageSlug: null,
      uploadedAt,
      uploadedBy,
      reviewedAt: null,
      reviewedBy: null,
      mimeType,
      sizeBytes: file.size,
    });
  }

  return { documentId, mimeType, fileName: file.name };
}

export async function simulateDemoPrimaryPhotoUpload(
  slug: string,
  file: File
): Promise<CrmProjectDetail> {
  const validationMessage = validateProjectPrimaryPhotoUpload({
    size: file.size,
    type: file.type,
    name: file.name,
  });
  if (validationMessage != null) {
    throw new Error(validationMessage);
  }

  const detail = requireDetail(slug);
  const photoPath = buildProjectPrimaryPhotoStorageKey(
    DEMO_ORGANIZATION_ID,
    detail.summary.id,
    file.name
  );

  const updated: CrmProjectDetail = {
    ...detail,
    summary: {
      ...detail.summary,
      primaryPhotoPath: photoPath,
    },
  };
  saveMockProjectDetail(slug, updated);
  return updated;
}

export async function simulateDemoPrimaryPhotoRemoval(slug: string): Promise<CrmProjectDetail> {
  const detail = requireDetail(slug);
  const updated: CrmProjectDetail = {
    ...detail,
    summary: {
      ...detail.summary,
      primaryPhotoPath: null,
    },
  };
  saveMockProjectDetail(slug, updated);
  return updated;
}
