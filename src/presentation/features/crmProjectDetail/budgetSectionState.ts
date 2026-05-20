import type { CrmDocumentMetadata, CrmBudgetEntry, CrmProjectDetail } from '@/domain/crm';
import { buildProjectBudgetSummary } from '@/domain/crm/budget';

export function applyBudgetEntriesToProject(
  project: CrmProjectDetail,
  entries: readonly CrmBudgetEntry[]
): CrmProjectDetail {
  return {
    ...project,
    budget: buildProjectBudgetSummary(entries),
  };
}

export function patchBudgetEntryInProject(
  project: CrmProjectDetail,
  entry: CrmBudgetEntry
): CrmProjectDetail {
  const hasEntry = project.budget.entries.some((e) => e.id === entry.id);
  const entries = hasEntry
    ? project.budget.entries.map((e) => (e.id === entry.id ? entry : e))
    : [...project.budget.entries, entry];
  return applyBudgetEntriesToProject(project, entries);
}

export function removeBudgetEntryFromProject(
  project: CrmProjectDetail,
  entryId: string
): CrmProjectDetail {
  const entries = project.budget.entries.filter((e) => e.id !== entryId);
  const documents = project.documents.filter((d) => d.budgetEntryId !== entryId);
  return applyBudgetEntriesToProject({ ...project, documents }, entries);
}

function withBudgetEntryDocumentCount(
  entries: readonly CrmBudgetEntry[],
  entryId: string,
  documents: readonly CrmDocumentMetadata[]
): readonly CrmBudgetEntry[] {
  const count = documents.filter((d) => d.budgetEntryId === entryId).length;
  return entries.map((e) => (e.id === entryId ? { ...e, documentCount: count } : e));
}

export function appendBudgetEntryDocument(
  project: CrmProjectDetail,
  document: CrmDocumentMetadata
): CrmProjectDetail {
  const budgetEntryId = document.budgetEntryId;
  if (budgetEntryId == null) return project;

  const withoutExisting = project.documents.filter((d) => d.id !== document.id);
  const documents = [document, ...withoutExisting];
  const entries = withBudgetEntryDocumentCount(project.budget.entries, budgetEntryId, documents);
  return applyBudgetEntriesToProject({ ...project, documents }, entries);
}

export function removeBudgetEntryDocument(
  project: CrmProjectDetail,
  documentId: string
): CrmProjectDetail {
  const removed = project.documents.find((d) => d.id === documentId);
  const documents = project.documents.filter((d) => d.id !== documentId);
  if (removed?.budgetEntryId == null) {
    return { ...project, documents };
  }
  const entries = withBudgetEntryDocumentCount(
    project.budget.entries,
    removed.budgetEntryId,
    documents
  );
  return applyBudgetEntriesToProject({ ...project, documents }, entries);
}
