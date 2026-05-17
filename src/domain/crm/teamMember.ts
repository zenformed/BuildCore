/** Lightweight assignee / actor reference for mock CRM (not platform auth User). */
export type CrmTeamMemberRef = {
  readonly id: string;
  readonly displayName: string;
  readonly initials: string;
  readonly avatarUrl: string | null;
  /** Profile email when loaded from Supabase; used for assignee tooltips. */
  readonly email: string | null;
};
