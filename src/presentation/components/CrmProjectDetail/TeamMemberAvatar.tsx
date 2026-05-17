'use client';

import type { ReactElement } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import shared from '@/presentation/components/crmShared/crmShared.module.css';

export type TeamMemberAvatarProps = {
  member: CrmTeamMemberRef;
  title?: string;
};

function memberTooltip(member: CrmTeamMemberRef, title?: string): string {
  if (title) return title;
  if (member.email) return `${member.displayName} (${member.email})`;
  return member.displayName;
}

export function TeamMemberAvatar({ member, title }: TeamMemberAvatarProps): ReactElement {
  const tooltip = memberTooltip(member, title);

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt=""
        className={shared.avatar}
        title={tooltip}
        width={24}
        height={24}
      />
    );
  }
  return (
    <span className={shared.avatar} title={tooltip} aria-label={member.displayName}>
      {member.initials}
    </span>
  );
}
