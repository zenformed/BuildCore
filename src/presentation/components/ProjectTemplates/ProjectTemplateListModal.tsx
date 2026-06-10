'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import { ProjectTemplateListItem } from './ProjectTemplateListItem';
import styles from './ProjectTemplates.module.css';

export type ProjectTemplateListModalMode = 'load' | 'manage';

export type ProjectTemplateListModalProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly mode?: ProjectTemplateListModalMode;
  readonly isOpen: boolean;
  readonly templates: readonly BuildCoreProjectTemplate[];
  readonly loading: boolean;
  readonly loadError: string | null;
  readonly busy: boolean;
  readonly settingDefaultId: string | null;
  readonly onClose: () => void;
  readonly onLoad: (template: BuildCoreProjectTemplate) => void;
  readonly onDelete: (template: BuildCoreProjectTemplate) => void;
  readonly onToggleDefault: (template: BuildCoreProjectTemplate) => void;
  readonly onClearDefault?: () => void;
  readonly overlayClassName?: string;
};

export function ProjectTemplateListModal({
  templateScope,
  mode = 'load',
  isOpen,
  templates,
  loading,
  loadError,
  busy,
  settingDefaultId,
  onClose,
  onLoad,
  onDelete,
  onToggleDefault,
  onClearDefault,
  overlayClassName,
}: ProjectTemplateListModalProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(templateScope).load;
  const isManageMode = mode === 'manage';
  const hasDefaultTemplate = templates.some((template) => template.isDefault);

  const noneDefaultOption =
    isManageMode && onClearDefault != null ? (
      <li className={styles.item}>
        <button
          type="button"
          className={`${styles.noneDefaultOption}${!hasDefaultTemplate ? ` ${styles.noneDefaultOption_active}` : ''}`}
          disabled={busy || settingDefaultId != null}
          aria-pressed={!hasDefaultTemplate}
          onClick={() => void onClearDefault()}
        >
          <span className={styles.noneDefaultOptionLabel}>{copy.manageNoneOption}</span>
          <span className={styles.noneDefaultOptionDescription}>{copy.manageNoneDescription}</span>
        </button>
      </li>
    ) : null;

  let body: ReactElement;
  if (loading) {
    body = <p className={styles.loading}>{copy.loading}</p>;
  } else if (loadError != null) {
    body = <p className={styles.error}>{loadError}</p>;
  } else if (templates.length === 0 && !isManageMode) {
    body = <p className={styles.empty}>{copy.empty}</p>;
  } else {
    body = (
      <ul className={styles.list}>
        {noneDefaultOption}
        {templates.map((template) => (
          <ProjectTemplateListItem
            key={template.id}
            templateScope={templateScope}
            template={template}
            busy={busy}
            defaultBusy={settingDefaultId === template.id}
            showLoad={!isManageMode}
            onLoad={onLoad}
            onDelete={onDelete}
            onToggleDefault={onToggleDefault}
          />
        ))}
      </ul>
    );
  }

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={isManageMode ? copy.manageTitle : copy.title}
      body={body}
      cancelLabel={isManageMode ? copy.back : copy.close}
      onClose={onClose}
      cancelDisabled={busy}
      closeAriaLabel={isManageMode ? copy.backAriaLabel : copy.closeAriaLabel}
      panelClassName={styles.widePanel}
      overlayClassName={
        isManageMode
          ? [styles.stackedOverlay, overlayClassName].filter(Boolean).join(' ')
          : overlayClassName
      }
    />
  );
}
