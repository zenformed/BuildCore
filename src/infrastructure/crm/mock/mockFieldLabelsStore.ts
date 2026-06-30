import { buildDefaultBuildCoreFieldLabels } from '@/domain/buildcore/fieldLabels';
import type { BuildCoreFieldLabelsResponse } from '@/infrastructure/crm/server/buildCoreFieldLabelService';

const labels: Record<string, string> = {};

export function getMockFieldLabelsResponse(canEdit = true): BuildCoreFieldLabelsResponse {
  return {
    labels: { ...labels },
    defaults: buildDefaultBuildCoreFieldLabels(),
    canEdit,
  };
}

export function setMockFieldLabel(fieldKey: string, label: string): void {
  labels[fieldKey] = label;
}

export function resetMockFieldLabelsStore(): void {
  for (const key of Object.keys(labels)) {
    delete labels[key];
  }
}
