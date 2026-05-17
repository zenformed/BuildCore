import type { CrmDocumentMetadata } from '@/domain/crm';

export function countDocumentsByTaskId(
  documents: readonly CrmDocumentMetadata[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    counts.set(doc.workflowTaskId, (counts.get(doc.workflowTaskId) ?? 0) + 1);
  }
  return counts;
}
