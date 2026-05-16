/** Lightweight assignee / actor reference for mock CRM (not platform auth User). */
export type CrmTeamMemberRef = {
  readonly id: string;
  readonly displayName: string;
  readonly initials: string;
  readonly avatarUrl: string | null;
};
