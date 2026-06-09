'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import { ProjectTemplateListItem } from './ProjectTemplateListItem';
import styles from './ProjectTemplates.module.css';

export type ProjectTemplateListModalProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
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
};

export function ProjectTemplateListModal({
  templateScope,
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
}: ProjectTemplateListModalProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(templateScope).load;

  let body: ReactElement;
  if (loading) {
    body = <p className={styles.loading}>{copy.loading}</p>;
  } else if (loadError != null) {
    body = <p className={styles.error}>{loadError}</p>;
  } else if (templates.length === 0) {
    body = <p className={styles.empty}>{copy.empty}</p>;
  } else {
    body = (
      <ul className={styles.list}>
        {templates.map((template) => (
          <ProjectTemplateListItem
            key={template.id}
            templateScope={templateScope}
            template={template}
            busy={busy}
            defaultBusy={settingDefaultId === template.id}
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
      title={copy.title}
      body={body}
      cancelLabel={copy.close}
      onClose={onClose}
      cancelDisabled={busy}
      closeAriaLabel={copy.closeAriaLabel}
      panelClassName={styles.widePanel}
    />
  );
}
