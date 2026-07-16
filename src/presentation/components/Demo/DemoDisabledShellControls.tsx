'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  getUserInitials,
  userCircleColor,
  type ZenformedDashboardHeaderClassNames,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ZenformedAppsLauncherClassNames } from '@zenformed/core/dashboard-shell';
import appsStyles from '@/presentation/components/DashboardShell/buildCorePlatformApps.module.css';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

type DemoDisabledAppsLauncherProps = {
  readonly classNames: ZenformedAppsLauncherClassNames;
  readonly appsIcon: ReactNode;
  readonly renderTrigger?: (state: {
    readonly open: boolean;
    readonly onClick: () => void;
    readonly ariaLabel: string;
  }) => ReactNode;
};

export function DemoDisabledAppsLauncher({
  classNames,
  appsIcon,
  renderTrigger,
}: DemoDisabledAppsLauncherProps): ReactElement {
  const title = content.demo.shell.appLauncherDisabledTitle;

  return (
    <div className={classNames.appsLauncherWrap}>
      {renderTrigger ? (
        <span title={title} aria-label={title} aria-disabled="true" style={{ opacity: 0.55 }}>
          {renderTrigger({
            open: false,
            onClick: () => undefined,
            ariaLabel: title,
          })}
        </span>
      ) : (
        <button
          type="button"
          className={`${classNames.appsLauncherTrigger} ${appsStyles.appsLauncherTriggerDisabled}`}
          disabled
          title={title}
          aria-label={title}
        >
          <span className={classNames.appsLauncherIcon} aria-hidden>
            {appsIcon}
          </span>
        </button>
      )}
    </div>
  );
}

type DemoDecorativeAccountAvatarProps = {
  readonly classNames: ZenformedDashboardHeaderClassNames;
  readonly user: {
    readonly email: string;
    readonly displayName?: string | null;
    readonly firstName?: string | null;
    readonly lastName?: string | null;
  };
};

export function DemoDecorativeAccountAvatar({
  classNames,
  user,
}: DemoDecorativeAccountAvatarProps): ReactElement {
  const title = content.demo.shell.accountMenuDisabledTitle;
  const displayName =
    user.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email;

  return (
    <div className={classNames.accountMenuWrap}>
      <span
        className={`${classNames.accountMenuTrigger} ${shellStyles.accountMenuTriggerDecorative}`}
        title={title}
        aria-label={title}
        role="img"
      >
        <div
          className={classNames.accountMenuTriggerAvatar}
          style={{ backgroundColor: userCircleColor(user.email) }}
          aria-hidden
        >
          {getUserInitials(user, displayName)}
        </div>
      </span>
    </div>
  );
}
