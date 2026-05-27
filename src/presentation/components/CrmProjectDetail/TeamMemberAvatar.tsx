'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import { resolveTeamMemberAvatarUrl } from '@/presentation/features/crm/resolveTeamMemberAvatarUrl';
import { useResolvedTeamMemberRef } from '@/presentation/hooks/useResolvedTeamMemberRef';
import { useAuthenticatedAvatarBlob } from '@/presentation/hooks/useAuthenticatedAvatarBlob';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useCurrentUserAvatar } from '@/presentation/providers/CurrentUserAvatarContext';
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
  const dash = useBuildCoreDashboardContext();
  const resolvedMember = useResolvedTeamMemberRef(member) ?? member;
  const currentUser = useCurrentUserAvatar();
  const resolvedUrl = resolveTeamMemberAvatarUrl(resolvedMember, currentUser);
  const isApiAvatarPath =
    resolvedUrl != null &&
    !resolvedUrl.startsWith('blob:') &&
    (resolvedUrl.startsWith('/api/auth/user-avatar') || resolvedUrl.startsWith('/api/auth/avatar'));
  const authenticatedBlobUrl = useAuthenticatedAvatarBlob(
    isApiAvatarPath ? resolvedUrl : null,
    dash.getAccessToken
  );
  const displayUrl =
    resolvedUrl?.startsWith('blob:') === true ? resolvedUrl : authenticatedBlobUrl;
  const [imageFailed, setImageFailed] = useState(false);
  const tooltip = memberTooltip(resolvedMember, title);

  if (displayUrl && !imageFailed) {
    return (
      <img
        src={displayUrl}
        alt=""
        className={`${shared.avatar} ${shared.avatarPhoto}`}
        title={tooltip}
        width={24}
        height={24}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${shared.avatar} ${shared.avatarInitials}`}
      title={tooltip}
      aria-label={resolvedMember.displayName}
    >
      {resolvedMember.initials}
    </span>
  );
}
