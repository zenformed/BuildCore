import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type DocumentPanelFilter = 'all' | 'uploaded' | 'missing';

export const DOCUMENT_PANEL_FILTERS: readonly { id: DocumentPanelFilter; label: string }[] = [
  { id: 'all', label: content.projectDetail.documents.filters.all },
  { id: 'uploaded', label: content.projectDetail.documents.filters.uploaded },
  { id: 'missing', label: content.projectDetail.documents.filters.missing },
] as const;

export type DocumentListItem =
  | { kind: 'document'; document: CrmDocumentMetadata }
  | { kind: 'missing'; task: CrmWorkflowTask }
  | { kind: 'missing_budget'; entry: CrmBudgetEntry };

export type DocumentPanelSources = {
  readonly documents: readonly CrmDocumentMetadata[];
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly budgetEntries: readonly CrmBudgetEntry[];
};

export function buildDocumentPanelSourcesFromProject(
  project: Pick<CrmProjectDetail, 'documents' | 'workflowTasks' | 'budget'>
): DocumentPanelSources {
  return {
    documents: project.documents,
    workflowTasks: project.workflowTasks,
    budgetEntries: project.budget.entries,
  };
}

function groupDocumentsByTaskId(
  documents: readonly CrmDocumentMetadata[]
): Map<string, CrmDocumentMetadata[]> {
  const docByTaskId = new Map<string, CrmDocumentMetadata[]>();
  for (const doc of documents) {
    if (doc.workflowTaskId == null) continue;
    const list = docByTaskId.get(doc.workflowTaskId) ?? [];
    list.push(doc);
    docByTaskId.set(doc.workflowTaskId, list);
  }
  return docByTaskId;
}

function groupDocumentsByBudgetEntryId(
  documents: readonly CrmDocumentMetadata[]
): Map<string, CrmDocumentMetadata[]> {
  const docByBudgetEntryId = new Map<string, CrmDocumentMetadata[]>();
  for (const doc of documents) {
    if (doc.budgetEntryId == null) continue;
    const list = docByBudgetEntryId.get(doc.budgetEntryId) ?? [];
    list.push(doc);
    docByBudgetEntryId.set(doc.budgetEntryId, list);
  }
  return docByBudgetEntryId;
}

function buildMissingWorkflowTaskItems(
  tasks: readonly CrmWorkflowTask[],
  docByTaskId: ReadonlyMap<string, CrmDocumentMetadata[]>
): DocumentListItem[] {
  return tasks
    .filter(
      (task) => task.documentsRequired && (docByTaskId.get(task.id)?.length ?? 0) === 0
    )
    .map((task) => ({ kind: 'missing' as const, task }));
}

function buildMissingBudgetEntryItems(
  budgetEntries: readonly CrmBudgetEntry[],
  docByBudgetEntryId: ReadonlyMap<string, CrmDocumentMetadata[]>
): DocumentListItem[] {
  return budgetEntries
    .filter(
      (entry) =>
        entry.documentsRequired && (docByBudgetEntryId.get(entry.id)?.length ?? 0) === 0
    )
    .map((entry) => ({ kind: 'missing_budget' as const, entry }));
}

export function filterDocumentPanelItems(
  sources: DocumentPanelSources,
  filter: DocumentPanelFilter
): DocumentListItem[] {
  const { documents, workflowTasks, budgetEntries } = sources;
  const docByTaskId = groupDocumentsByTaskId(documents);
  const docByBudgetEntryId = groupDocumentsByBudgetEntryId(documents);

  const missingItems: DocumentListItem[] = [
    ...buildMissingWorkflowTaskItems(workflowTasks, docByTaskId),
    ...buildMissingBudgetEntryItems(budgetEntries, docByBudgetEntryId),
  ];

  if (filter === 'missing') {
    return missingItems;
  }

  const uploaded = documents.map((document) => ({ kind: 'document' as const, document }));

  if (filter === 'uploaded') {
    return uploaded;
  }

  return [...uploaded, ...missingItems];
}

export function documentCompletionLabel(doc: CrmDocumentMetadata): string {
  return doc.reviewedAt != null ? '1/1' : '0/1';
}
