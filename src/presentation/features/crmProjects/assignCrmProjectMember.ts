import type { CrmProjectSummary } from '@/domain/crm';
import { getCrmProjectDetailBySlug, updateCrmProject } from '@/application/use-cases/crm';
import { crmRepositories } from '@/shared/di/container';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import {
  applySummaryFieldToForm,
  projectDetailToFormState,
  validateProjectDetailForm,
} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';

/** Updates a project's assignee. Returns the updated summary, or null if unchanged / missing. */
export async function assignCrmProjectMember(
  project: CrmProjectSummary,
  assignedMemberId: string
): Promise<CrmProjectSummary | null> {
  const normalized = normalizeAssigneeMemberIdForSave(assignedMemberId) ?? '';
  const current = project.assignedTo?.id ?? '';
  if (normalized === current) {
    return null;
  }

  const detail = await getCrmProjectDetailBySlug(crmRepositories, project.slug);
  if (detail == null) {
    throw new Error('Project not found');
  }

  const form = applySummaryFieldToForm(
    projectDetailToFormState(detail),
    'assignedMemberId',
    normalized
  );
  const validated = validateProjectDetailForm(form, detail);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const updated = await updateCrmProject(crmRepositories, project.slug, validated.input);
  if (updated == null) {
    throw new Error('Could not update project assignee');
  }
  return updated.summary;
}
