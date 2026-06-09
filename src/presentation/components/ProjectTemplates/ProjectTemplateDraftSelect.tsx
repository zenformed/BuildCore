'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import {
  createProjectTemplateDraftFromTemplate,
  type CreateProjectTemplateDraft,
} from '@/domain/crm/projectTemplateDraft';
import { listBuildCoreProjectTemplates } from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type ProjectTemplateDraftSelectProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly disabled?: boolean;
  readonly selectedTemplateId: string;
  readonly onDraftChange: (draft: CreateProjectTemplateDraft | null, templateId: string) => void;
};

export function ProjectTemplateDraftSelect({
  templateScope,
  disabled = false,
  selectedTemplateId,
  onDraftChange,
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
        const defaultTemplate = list.find((item) => item.isDefault);
        if (defaultTemplate != null && selectedTemplateId === '') {
          applyTemplateSelection(defaultTemplate.id, list);
        }
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [applyTemplateSelection, disabled, selectedTemplateId, templateScope]);

  return (
    <div className={formStyles.field}>
      <label className={formStyles.label} htmlFor={`crm-create-template-${templateScope}`}>
        {copy.createSelectLabel}
      </label>
      <select
        id={`crm-create-template-${templateScope}`}
        className={formStyles.select}
        value={selectedTemplateId}
        disabled={disabled || loading}
        onChange={(event) => applyTemplateSelection(event.target.value, templates)}
      >
        <option value="">{copy.createSelectPlaceholder}</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.isDefault ? ' (Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
