'use client';

import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import type { UseProjectTemplateManagerArgs } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';

/** @deprecated Use useProjectTemplateManager — kept for project detail shell wiring. */
export type UseLoadProjectTemplateArgs = {
  readonly projectSlug: string;
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly onRefresh: () => Promise<void>;
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function useLoadProjectTemplate(args: UseLoadProjectTemplateArgs) {
  const managerArgs: UseProjectTemplateManagerArgs = {
    templateScope: args.templateScope,
    applyTarget: {
      mode: 'project',
      projectSlug: args.projectSlug,
      onRefresh: args.onRefresh,
    },
    onSuccess: args.onSuccess,
    onError: args.onError,
  };
  return useProjectTemplateManager(managerArgs);
}
