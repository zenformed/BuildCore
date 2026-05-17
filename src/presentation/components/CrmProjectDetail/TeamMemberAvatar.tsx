'use client';

import type { ReactElement } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import shared from '@/presentation/components/crmShared/crmShared.module.css';

export type TeamMemberAvatarProps = {
  member: CrmTeamMemberRef;
  title?: string;
};

export function TeamMemberAvatar({ member, title }: TeamMemberAvatarProps): ReactElement {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt=""
        className={shared.avatar}
        title={title ?? member.displayName}
        width={24}
        height={24}
      />
    );
  }
  return (
    <span className={shared.avatar} title={title ?? member.displayName} aria-hidden>
      {member.initials}
    </span>
  );
}
