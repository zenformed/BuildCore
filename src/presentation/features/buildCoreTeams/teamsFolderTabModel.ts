import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type TeamsFolderTabId =
  | 'members'
  | 'taskPermissions'
  | 'paymentPermissions'
  | 'budgetPermissions';

export type TeamsDesktopNavId = 'members' | 'permissions';

export type TeamsFolderTabDef = {
  readonly id: TeamsFolderTabId;
  readonly label: string;
};

export type TeamsDesktopNavDef = {
  readonly id: TeamsDesktopNavId;
  readonly label: string;
};

export function buildTeamsDesktopNav(): readonly TeamsDesktopNavDef[] {
  const navCopy = content.teams.desktopNav;
  return [
    { id: 'members', label: navCopy.members },
    { id: 'permissions', label: navCopy.permissions },
  ];
}

export function buildTeamsFolderTabs(): readonly TeamsFolderTabDef[] {
  const tabCopy = content.teams.folderTabs;
  return [
    { id: 'members', label: tabCopy.members },
    { id: 'taskPermissions', label: tabCopy.taskPermissions },
    { id: 'paymentPermissions', label: tabCopy.paymentPermissions },
    { id: 'budgetPermissions', label: tabCopy.budgetPermissions },
  ];
}
