import {
  buildDefaultEntityTerminologyOverrides,
  resolveEntityTerminology,
  validateEntityTerminologyDisplayName,
  type BuildCoreEntityTerminologyKey,
} from '@/domain/buildcore/entityTerminology';
import type { BuildCoreEntityTerminologyResponse } from '@/infrastructure/crm/server/buildCoreEntityTerminologyService';

const overrides: Partial<Record<BuildCoreEntityTerminologyKey, string>> = {};

export function getMockEntityTerminologyResponse(
  canEdit = true
): BuildCoreEntityTerminologyResponse {
  return {
    terms: resolveEntityTerminology(overrides),
    overrides: { ...overrides },
    defaults: buildDefaultEntityTerminologyOverrides(),
    canEdit,
  };
}

export function setMockEntityTerminology(
  entityKey: BuildCoreEntityTerminologyKey,
  displayName: string
): boolean {
  const validated = validateEntityTerminologyDisplayName(displayName);
  if (!validated.ok) return false;
  overrides[entityKey] = validated.value;
  return true;
}

export function resetMockEntityTerminologyStore(): void {
  for (const key of Object.keys(overrides) as BuildCoreEntityTerminologyKey[]) {
    delete overrides[key];
  }
}
