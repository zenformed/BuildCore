'use client';

import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { createBudgetEntryDocumentDownload } from '@/application/use-cases/crm/createBudgetEntryDocumentDownload';
import { createProjectMediaDocumentDownload } from '@/application/use-cases/crm/createProjectMediaDocumentDownload';
import { createWorkflowTaskDocumentDownload } from '@/application/use-cases/crm/createWorkflowTaskDocumentDownload';
import {
  downloadCrmDocumentAttachment,
  downloadCrmDocumentFromSignedUrl,
} from '@/infrastructure/crm/api/downloadCrmDocumentAttachment';

export type CrmProjectDocumentDownloadTarget =
  | {
      readonly kind: 'workflow_task';
      readonly projectSlug: string;
      readonly workflowTaskId: string;
      readonly documentId: string;
      readonly fileName: string;
    }
  | {
      readonly kind: 'budget_entry';
      readonly projectSlug: string;
      readonly budgetEntryId: string;
      readonly documentId: string;
      readonly fileName: string;
    }
  | {
      readonly kind: 'project_media';
      readonly projectSlug: string;
      readonly documentId: string;
      readonly fileName: string;
    };

export function buildCrmProjectDocumentDownloadApiPath(
  target: CrmProjectDocumentDownloadTarget
): string {
  if (target.kind === 'workflow_task') {
    return `/api/crm/projects/${encodeURIComponent(target.projectSlug)}/tasks/${encodeURIComponent(target.workflowTaskId)}/documents/${encodeURIComponent(target.documentId)}/download`;
  }
  if (target.kind === 'budget_entry') {
    return `/api/crm/projects/${encodeURIComponent(target.projectSlug)}/budget-entries/${encodeURIComponent(target.budgetEntryId)}/documents/${encodeURIComponent(target.documentId)}/download`;
  }
  return `/api/crm/projects/${encodeURIComponent(target.projectSlug)}/media/${encodeURIComponent(target.documentId)}/download`;
}

export function crmProjectDocumentDownloadTargetFromMetadata(
  projectSlug: string,
  doc: CrmDocumentMetadata
): CrmProjectDocumentDownloadTarget {
  if (doc.budgetEntryId) {
    return {
      kind: 'budget_entry',
      projectSlug,
      budgetEntryId: doc.budgetEntryId,
      documentId: doc.id,
      fileName: doc.name,
    };
  }
  if (doc.workflowTaskId) {
    return {
      kind: 'workflow_task',
      projectSlug,
      workflowTaskId: doc.workflowTaskId,
      documentId: doc.id,
      fileName: doc.name,
    };
  }
  return {
    kind: 'project_media',
    projectSlug,
    documentId: doc.id,
    fileName: doc.name,
  };
}

export type CrmProjectDocumentDownloadResult = 'downloaded' | 'demo_blocked';

export async function downloadCrmProjectDocument(
  repositories: CrmRepositories,
  target: CrmProjectDocumentDownloadTarget
): Promise<CrmProjectDocumentDownloadResult> {
  if (isDemoRuntimeClient()) {
    return 'demo_blocked';
  }

  if (getCrmDataSource() === 'mock') {
    const signed =
      target.kind === 'workflow_task'
        ? await createWorkflowTaskDocumentDownload(repositories, {
            projectSlug: target.projectSlug,
            workflowTaskId: target.workflowTaskId,
            documentId: target.documentId,
          })
        : target.kind === 'budget_entry'
          ? await createBudgetEntryDocumentDownload(repositories, {
              projectSlug: target.projectSlug,
              budgetEntryId: target.budgetEntryId,
              documentId: target.documentId,
            })
          : await createProjectMediaDocumentDownload(repositories, {
              projectSlug: target.projectSlug,
              documentId: target.documentId,
            });
    await downloadCrmDocumentFromSignedUrl(signed.url, signed.fileName);
    return 'downloaded';
  }

  await downloadCrmDocumentAttachment(
    buildCrmProjectDocumentDownloadApiPath(target),
    target.fileName
  );
  return 'downloaded';
}
