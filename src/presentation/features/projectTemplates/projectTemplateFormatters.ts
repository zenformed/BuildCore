import { formatBuildCoreDisplayDate } from '@/platform/formatting/buildCoreDisplayDate';

export function formatProjectTemplateCreatedDate(iso: string): string {
  return formatBuildCoreDisplayDate(iso);
}
