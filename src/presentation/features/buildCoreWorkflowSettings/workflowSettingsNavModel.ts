import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type WorkflowSettingsDesktopNavId = 'workflowStages' | 'alerts';

export type WorkflowSettingsDesktopNavDef = {
  readonly id: WorkflowSettingsDesktopNavId;
  readonly label: string;
};

export function buildWorkflowSettingsDesktopNav(): readonly WorkflowSettingsDesktopNavDef[] {
  const navCopy = content.workflowSettings.desktopNav;
  return [
    { id: 'workflowStages', label: navCopy.workflowStages },
    { id: 'alerts', label: navCopy.alerts },
  ];
}
