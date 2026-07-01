'use client';

import { useCallback, useState } from 'react';
import { updateCrmProject } from '@/application/use-cases/crm';
import type { CrmIndustry, CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import {
  applySummaryFieldToForm,
  isSummaryFieldUnchanged,
  projectDetailToFormState,
  type SummaryEditableField,
  validateProjectDetailForm,
} from './projectDetailFormModel';

export function useProjectSummaryPatch(
  project: CrmProjectDetail,
  onSaved: (project: CrmProjectDetail) => void,
  onError: (message: string) => void
): {
  savingField: SummaryEditableField | null;
  customFieldSavingKey: string | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  patchIndustry: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
  patchCustomFieldValue: (fieldKey: string, value: string) => Promise<boolean>;
} {
  const [savingField, setSavingField] = useState<SummaryEditableField | null>(null);
  const [customFieldSavingKey, setCustomFieldSavingKey] = useState<string | null>(null);
  const edit = content.projectDetail.edit;

  const saveForm = useCallback(
    async (form: ReturnType<typeof projectDetailToFormState>, saving: SummaryEditableField) => {
      const validated = validateProjectDetailForm(form, project);
      if (!validated.ok) {
        onError(validated.message);
        return false;
      }

      setSavingField(saving);
      try {
        const updated = await updateCrmProject(crmRepositories, project.summary.slug, validated.input);
        if (updated == null) {
          onError(edit.notFound);
          return false;
        }
        onSaved(updated);
        return true;
      } catch (err) {
        onError(err instanceof Error ? err.message : edit.submitFailed);
        return false;
      } finally {
        setSavingField(null);
      }
    },
    [edit.notFound, edit.submitFailed, onError, onSaved, project]
  );

  const patchField = useCallback(
    async (field: SummaryEditableField, value: string): Promise<boolean> => {
      if (isSummaryFieldUnchanged(project, field, value)) {
        return true;
      }

      const form = applySummaryFieldToForm(projectDetailToFormState(project), field, value);
      return saveForm(form, field);
    },
    [project, saveForm]
  );

  const patchIndustry = useCallback(
    async (industry: CrmIndustry, customIndustry: string): Promise<boolean> => {
      const normalizedCustom = industry === 'other' ? customIndustry.trim() : '';
      const unchanged =
        industry === project.summary.industry &&
        normalizedCustom === (project.summary.customIndustry ?? '').trim();
      if (unchanged) {
        return true;
      }

      const form = {
        ...projectDetailToFormState(project),
        industry,
        customIndustry: normalizedCustom,
      };
      return saveForm(form, 'industry');
    },
    [project, saveForm]
  );

  const patchCustomFieldValue = useCallback(
    async (fieldKey: string, value: string): Promise<boolean> => {
      const trimmed = value.trim();
      const current = (project.summary.customFields?.[fieldKey] ?? '').trim();
      if (trimmed === current) {
        return true;
      }

      setCustomFieldSavingKey(fieldKey);
      try {
        const form = projectDetailToFormState(project);
        const validated = validateProjectDetailForm(form, project);
        if (!validated.ok) {
          onError(validated.message);
          return false;
        }
        const updated = await updateCrmProject(crmRepositories, project.summary.slug, {
          ...validated.input,
          customFieldValues: { [fieldKey]: trimmed || null },
        });
        if (updated == null) {
          onError(edit.notFound);
          return false;
        }
        onSaved(updated);
        return true;
      } catch (err) {
        onError(err instanceof Error ? err.message : edit.submitFailed);
        return false;
      } finally {
        setCustomFieldSavingKey(null);
      }
    },
    [edit.notFound, edit.submitFailed, onError, onSaved, project.summary.customFields, project.summary.slug]
  );

  return { savingField, customFieldSavingKey, patchField, patchIndustry, patchCustomFieldValue };
}
