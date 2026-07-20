'use client';

import type { ReactElement } from 'react';
import type { ZenformedSidebarNavItem, ZenformedSidebarSection } from '@zenformed/core/dashboard-shell';
import {
  HomeIcon,
  ReportsIcon,
  SettingsIcon,
  TeamsIcon,
  WorkflowStagesIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BuildCoreSidebarNavId } from './BuildCoreSidebar';
import {
  filterBuildCoreSidebarNavItems,
  type BuildCoreSidebarNavAccess,
} from './buildCoreSidebarNavModel';
import styles from './BuildCoreCollapsibleSidebar.module.css';

function IconWithCog({ children }: { children: ReactElement }): ReactElement {
  return (
    <span className={styles.iconWithCog}>
      {children}
      <span className={styles.cogOverlay} aria-hidden>
        <SettingsIcon className={styles.cogOverlayIcon} />
      </span>
    </span>
  );
}

const MANAGEMENT_LABELS: Record<
  Exclude<BuildCoreSidebarNavId, 'notifications'>,
  { label: string; title: string }
> = {
  projects: { label: 'Dashboard', title: 'Dashboard' },
  reports: { label: 'CRM Reports', title: 'CRM Reports' },
  teams: { label: 'Team Settings', title: 'Team Settings' },
  workflowStages: { label: 'Workflow Settings', title: 'Workflow Settings' },
};

const ICONS: Record<Exclude<BuildCoreSidebarNavId, 'notifications'>, () => ReactElement> = {
  projects: () => <HomeIcon />,
  reports: () => <ReportsIcon />,
  teams: () => (
    <IconWithCog>
      <TeamsIcon />
    </IconWithCog>
  ),
  workflowStages: () => (
    <IconWithCog>
      <WorkflowStagesIcon />
    </IconWithCog>
  ),
};

export type BuildBuildCoreSidebarSectionsInput = BuildCoreSidebarNavAccess & {
  readonly activeId: BuildCoreSidebarNavId;
  readonly onSelect: (id: BuildCoreSidebarNavId) => void;
  readonly canViewTeamSection: boolean;
  /** Stable team body — keep the same element across expand/collapse to avoid remount refetch. */
  readonly teamContent?: ReactElement | null;
};

export function buildBuildCoreSidebarSections(
  input: BuildBuildCoreSidebarSectionsInput
): readonly ZenformedSidebarSection[] {
  const isMemberExperience = input.isMemberExperience === true;
  const visible = filterBuildCoreSidebarNavItems({
    canAccessTeams: input.canAccessTeams,
    canAccessReports: input.canAccessReports,
    canAccessWorkflowStages: input.canAccessWorkflowStages,
  });

  const menuIds: BuildCoreSidebarNavId[] = isMemberExperience
    ? ['projects']
    : ['projects', 'reports'];
  const toolsIds: BuildCoreSidebarNavId[] = isMemberExperience
    ? []
    : ['teams', 'workflowStages'];

  const toItem = (id: BuildCoreSidebarNavId): ZenformedSidebarNavItem | null => {
    if (id === 'notifications') return null;
    if (!visible.some((v) => v.id === id)) return null;
    const meta = isMemberExperience && id === 'projects'
      ? {
          label: content.crm.myTasks.sidebarLabel,
          title: content.crm.myTasks.sidebarTitle,
        }
      : MANAGEMENT_LABELS[id];
    const Icon = ICONS[id];
    return {
      id,
      label: meta.label,
      title: meta.title,
      icon: <Icon />,
      active: input.activeId === id,
      onSelect: () => input.onSelect(id),
    };
  };

  const menuItems = menuIds.map(toItem).filter(Boolean) as ZenformedSidebarNavItem[];
  const toolsItems = toolsIds.map(toItem).filter(Boolean) as ZenformedSidebarNavItem[];

  const sections: ZenformedSidebarSection[] = [];
  if (menuItems.length > 0) {
    sections.push({
      kind: 'nav',
      id: 'menu',
      label: 'Menu',
      collapsedLabel: 'MENU',
      items: menuItems,
    });
  }
  if (toolsItems.length > 0) {
    sections.push({
      kind: 'nav',
      id: 'tools',
      label: 'Tools',
      collapsedLabel: 'TOOLS',
      items: toolsItems,
    });
  }
  if (input.canViewTeamSection && input.teamContent != null) {
    sections.push({
      kind: 'custom',
      id: 'team',
      label: 'Team',
      collapsedLabel: 'TEAM',
      collapsible: true,
      defaultOpen: true,
      content: input.teamContent,
    });
  }
  return sections;
}
