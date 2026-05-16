'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  pickSettingsDrawerClassNames,
  ZenformedSettingsDrawer,
  type ZenformedSettingsDrawerSection,
} from '@zenformed/core/dashboard-shell';
import {
  buildCoreDashboardNavigation as nav,
  buildCoreDashboardSettingsTab,
  type BuildCoreSettingsSectionId,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

const settingsClassNames = pickSettingsDrawerClassNames(styles);

const SETTINGS_SECTIONS: ZenformedSettingsDrawerSection[] = [
  { id: buildCoreDashboardSettingsTab.about.id, label: buildCoreDashboardSettingsTab.about.label },
];

export type BuildCoreSettingsDrawerProps = {
  open: boolean;
  activeSection: BuildCoreSettingsSectionId;
  onSectionChange: (section: BuildCoreSettingsSectionId) => void;
  onClose: () => void;
  aboutSectionContent: ReactNode;
};

export function BuildCoreSettingsDrawer({
  open,
  activeSection,
  onSectionChange,
  onClose,
  aboutSectionContent,
}: BuildCoreSettingsDrawerProps): ReactElement | null {
  return (
    <ZenformedSettingsDrawer
      classNames={settingsClassNames}
      open={open}
      onClose={onClose}
      title={nav.settingsDrawer.title}
      closeAriaLabel={nav.settingsDrawer.closeAriaLabel}
      sections={SETTINGS_SECTIONS}
      activeSectionId={activeSection}
      onSectionChange={(id) => onSectionChange(id as BuildCoreSettingsSectionId)}
      renderSectionContent={(sectionId) =>
        sectionId === buildCoreDashboardSettingsTab.about.id ? aboutSectionContent : null
      }
    />
  );
}
