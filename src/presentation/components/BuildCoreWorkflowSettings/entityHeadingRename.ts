import {
  BUILDCORE_ENTITY_TERMINOLOGY_MAX_LENGTH,
  validateEntityTerminologyDisplayName,
} from '@/domain/buildcore/entityTerminology';

export const WORKFLOW_STAGES_ENTITY_HEADING_SUFFIX = 'Stages';

export type EntityHeadingRenameCommitResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: 'empty' | 'unchanged' | 'invalid' };

export function commitEntityHeadingRename(
  draft: string,
  current: string
): EntityHeadingRenameCommitResult {
  const validated = validateEntityTerminologyDisplayName(draft);
  if (!validated.ok) {
    return { ok: false, reason: draft.trim() ? 'invalid' : 'empty' };
  }
  if (validated.value === current.trim()) {
    return { ok: false, reason: 'unchanged' };
  }
  return { ok: true, value: validated.value };
}

export function entityHeadingRenameInputMaxLength(): number {
  return BUILDCORE_ENTITY_TERMINOLOGY_MAX_LENGTH;
}

export type EntityHeadingRenameKeyAction = 'save' | 'cancel' | null;

export function entityHeadingRenameKeyAction(
  key: string
): EntityHeadingRenameKeyAction {
  if (key === 'Enter') return 'save';
  if (key === 'Escape') return 'cancel';
  return null;
}
