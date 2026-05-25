'use client';

import type { ReactElement } from 'react';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import shared from '@/presentation/components/crmShared/crmShared.module.css';

export type AssigneeMenuOptionLabelProps = {
  readonly option: AssigneeOption;
};

export function AssigneeMenuOptionLabel({ option }: AssigneeMenuOptionLabelProps): ReactElement {
  if (option.member == null) {
    return <span className={shared.assigneeMenuLabel}>{option.label}</span>;
  }

  return (
    <span className={shared.assigneeMenuRow}>
      <span className={shared.assigneeMenuAvatar}>
        <TeamMemberAvatar member={option.member} />
      </span>
      <span className={shared.assigneeMenuLabel}>{option.label}</span>
    </span>
  );
}
