import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail } from '@/domain/crm';

export function getCrmProjectDetailBySlug(
  repositories: CrmRepositories,
  slug: string
): CrmProjectDetail | null {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return repositories.projectDetail.getBySlug(trimmed);
}
