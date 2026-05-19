import type { CrmDocumentMetadata, CrmWorkflowTask } from '@/domain/crm';

export type DocumentPanelFilter = 'all' | 'uploaded' | 'missing';

export type DocumentListItem =
  | { kind: 'document'; document: CrmDocumentMetadata }
  | { kind: 'missing'; task: CrmWorkflowTask };

export function filterDocumentPanelItems(
  documents: readonly CrmDocumentMetadata[],
  tasks: readonly CrmWorkflowTask[],
  filter: DocumentPanelFilter
): DocumentListItem[] {
  const docByTaskId = new Map<string, CrmDocumentMetadata[]>();
  for (const doc of documents) {
    if (doc.workflowTaskId == null) continue;
    const list = docByTaskId.get(doc.workflowTaskId) ?? [];
    list.push(doc);
    docByTaskId.set(doc.workflowTaskId, list);
  }

  const missingItems: DocumentListItem[] = tasks
    .filter(
      (task) => task.documentsRequired && (docByTaskId.get(task.id)?.length ?? 0) === 0
    )
    .map((task) => ({ kind: 'missing' as const, task }));

  if (filter === 'missing') {
    return missingItems;
  }

  if (filter === 'uploaded') {
    return documents.map((document) => ({ kind: 'document' as const, document }));
  }

  const uploaded = documents.map((document) => ({ kind: 'document' as const, document }));
  return [...uploaded, ...missingItems];
}

export function documentCompletionLabel(doc: CrmDocumentMetadata): string {
  return doc.reviewedAt != null ? '1/1' : '0/1';
}
