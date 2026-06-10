'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import {
  createProjectTemplateDraftFromTemplate,
  type CreateProjectTemplateDraft,
} from '@/domain/crm/projectTemplateDraft';
import { listBuildCoreProjectTemplates } from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { CreateFormSelectPicker } from '@/presentation/components/crmShared/CreateFormSelectPicker';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type ProjectTemplateDraftSelectProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly disabled?: boolean;
  readonly selectedTemplateId: string;
  readonly templatesRefreshKey?: number;
  readonly onDraftChange: (draft: CreateProjectTemplateDraft | null, templateId: string) => void;
  readonly onManageClick?: () => void;
};

export function ProjectTemplateDraftSelect({
  templateScope,
  disabled = false,
  selectedTemplateId,
  templatesRefreshKey = 0,
  onDraftChange,
  onManageClick,
}: ProjectTemplateDraftSelectProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(templateScope);
  const [templates, setTemplates] = useState<readonly BuildCoreProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const defaultAppliedRef = useRef(false);

  const applyTemplateSelection = useCallback(
    (templateId: string, list: readonly BuildCoreProjectTemplate[]) => {
      if (templateId === '') {
        onDraftChange(null, '');
        return;
      }
      const template = list.find((item) => item.id === templateId);
      if (template == null) {
        onDraftChange(null, '');
        return;
      }
      onDraftChange(createProjectTemplateDraftFromTemplate(template), templateId);
    },
    [onDraftChange]
  );

  const syncSelectionWithList = useCallback(
    (list: readonly BuildCoreProjectTemplate[], preferredTemplateId: string) => {
      if (preferredTemplateId !== '' && list.some((item) => item.id === preferredTemplateId)) {
        applyTemplateSelection(preferredTemplateId, list);
        return;
      }
      applyTemplateSelection('', list);
    },
    [applyTemplateSelection]
  );

  useEffect(() => {
    defaultAppliedRef.current = false;
    setTemplates([]);
  }, [templateScope]);

  useEffect(() => {
    if (disabled || defaultAppliedRef.current) return;
    defaultAppliedRef.current = true;

    void (async () => {
      setLoading(true);
      try {
        const list = await listBuildCoreProjectTemplates({ templateScope });
        setTemplates(list);
        if (selectedTemplateId === '') {
          syncSelectionWithList(list, '');
        } else {
          syncSelectionWithList(list, selectedTemplateId);
        }
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [disabled, selectedTemplateId, syncSelectionWithList, templateScope]);

  useEffect(() => {
    if (templatesRefreshKey === 0) return;

    void (async () => {
      setLoading(true);
      try {
        const list = await listBuildCoreProjectTemplates({ templateScope });
        setTemplates(list);
        syncSelectionWithList(list, selectedTemplateId);
      } catch {
        setTemplates([]);
        onDraftChange(null, '');
      } finally {
        setLoading(false);
      }
    })();
  }, [onDraftChange, selectedTemplateId, syncSelectionWithList, templateScope, templatesRefreshKey]);

  const options = useMemo(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: `${template.name}${template.isDefault ? ' (Default)' : ''}`,
      })),
    [templates]
  );

  return (
    <div className={formStyles.field}>
      <label className={formStyles.label} htmlFor={`crm-create-template-${templateScope}`}>
        {copy.createSelectLabel}
      </label>
      <div className={formStyles.templateFieldRow}>
        <CreateFormSelectPicker
          id={`crm-create-template-${templateScope}`}
          value={selectedTemplateId}
          options={options}
          placeholder={copy.createSelectPlaceholder}
          disabled={disabled || loading}
          ariaLabel={copy.createSelectLabel}
          onChange={(templateId) => applyTemplateSelection(templateId, templates)}
        />
        {onManageClick != null ? (
          <button
            type="button"
            className={formStyles.manageTemplatesBtn}
            disabled={disabled || loading}
            onClick={onManageClick}
          >
            {copy.manageTemplatesAction}
          </button>
        ) : null}
      </div>
    </div>
  );
}
