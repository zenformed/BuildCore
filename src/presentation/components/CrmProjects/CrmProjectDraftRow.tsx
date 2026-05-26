'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_PIPELINE_STAGES, type CrmPriority, type CrmTradeType } from '@/domain/crm';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import {
  createProjectTemplateDraftFromTemplate,
  createProjectTemplateDraftSummary,
  hasCreateProjectTemplateDraftContent,
  type CreateProjectTemplateDraft,
} from '@/domain/crm/projectTemplateDraft';
import { createCrmProject } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { listBuildCoreProjectTemplates } from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { CRM_TRADE_TYPE_OPTIONS } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { crmRepositories } from '@/shared/di/container';
import detailStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmProjects.module.css';

const draftFieldCell = `${styles.gridCell} ${styles.draftFieldCell}`;

export type CrmProjectDraftRowProps = {
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  onTemplateToast?: (toast: { kind: 'success' | 'error'; message: string }) => void;
};

export function CrmProjectDraftRow({
  onSaved,
  onCancel,
  onTemplateToast,
}: CrmProjectDraftRowProps): ReactElement {
  const router = useRouter();
  const dash = useBuildCoreDashboardContext();
  const { organizationMembershipContext } = useSaaSProfile();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const create = content.crm.create;
  const templateCopy = content.projectDetail.loadTemplate;
  const isApiSource = getCrmDataSource() === 'api';
  const canManageTemplates = useMemo(
    () => canManageBuildCoreProjectTemplates(organizationMembershipContext?.role),
    [organizationMembershipContext?.role]
  );

  const [form, setForm] = useState<CreateCrmProjectFormState>(defaultCreateCrmProjectFormState);
  const [templateDraft, setTemplateDraft] = useState<CreateProjectTemplateDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const assigneeRef = useRef<HTMLSpanElement>(null);
  const defaultAppliedRef = useRef(false);

  const notifyTemplate = useCallback(
    (kind: 'success' | 'error', message: string) => {
      onTemplateToast?.({ kind, message });
    },
    [onTemplateToast]
  );

  const templateManager = useProjectTemplateManager({
    applyTarget: {
      mode: 'draft',
      onApplyDraft: (blueprints) => setTemplateDraft(blueprints),
    },
    onSuccess: (message) => notifyTemplate('success', message),
    onError: (message) => notifyTemplate('error', message),
  });

  useEffect(() => {
    if (!isApiSource || !canManageTemplates || defaultAppliedRef.current) return;
    defaultAppliedRef.current = true;

    void (async () => {
      try {
        const templates = await listBuildCoreProjectTemplates();
        const defaultTemplate = templates.find((item) => item.isDefault);
        if (defaultTemplate != null) {
          setTemplateDraft(createProjectTemplateDraftFromTemplate(defaultTemplate));
        }
      } catch {
        /* Draft still works without auto-default */
      }
    })();
  }, [canManageTemplates, isApiSource]);

  const assigneeOptions = getCrmProjectAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    dash.user?.id
  );
  const selectedAssignee = assigneeOptions.find((option) => option.id === form.assignedMemberId);

  const draftSummary = createProjectTemplateDraftSummary(templateDraft);

  const updateField = useCallback(
    <K extends keyof CreateCrmProjectFormState>(key: K, value: CreateCrmProjectFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setError(null);
    if (!isApiSource) {
      setError(create.mockDisabledMessage);
      return;
    }

    const validated = validateCreateCrmProjectForm(form);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }

    setSaving(true);
    try {
      const created = await createCrmProject(crmRepositories, {
        ...validated.input,
        initialTemplateBlueprints: hasCreateProjectTemplateDraftContent(templateDraft)
          ? templateDraft
          : null,
      });
      setTemplateDraft(null);
      await onSaved();
      router.push(nav.routes.projectDetail(created.slug));
    } catch (err) {
      if (err instanceof CrmCreateNotAvailableError) {
        setError(create.mockDisabledMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(create.submitFailed);
      }
    } finally {
      setSaving(false);
    }
  }, [
    create.mockDisabledMessage,
    create.submitFailed,
    form,
    isApiSource,
    onSaved,
    router,
    templateDraft,
  ]);

  return (
    <div className={styles.draftRowBlock}>
      <div
        className={`${styles.projectsGrid} ${styles.gridRow} ${styles.gridRowDraft}`}
        role="row"
        aria-busy={saving}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.gridCellProject} role="cell">
          <input
            className={styles.draftInput}
            value={form.name}
            disabled={saving}
            placeholder={create.fields.name}
            onChange={(e) => updateField('name', e.target.value)}
            autoFocus
          />
          <select
            className={`${styles.draftSelect} ${styles.draftSelectTrade}`}
            value={form.tradeType}
            disabled={saving}
            aria-label={create.fields.tradeType}
            onChange={(e) => updateField('tradeType', e.target.value as CrmTradeType)}
          >
            {CRM_TRADE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </span>
        <span className={draftFieldCell} role="cell">
          <input
            className={styles.draftInput}
            value={form.contactName}
            disabled={saving}
            placeholder={create.fields.contactName}
            onChange={(e) => updateField('contactName', e.target.value)}
          />
        </span>
        <span className={draftFieldCell} role="cell">
          <input
            className={styles.draftInput}
            type="email"
            value={form.email}
            disabled={saving}
            placeholder={create.fields.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </span>
        <span className={draftFieldCell} role="cell">
          <input
            className={styles.draftInput}
            type="tel"
            value={form.phone}
            disabled={saving}
            placeholder={create.fields.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </span>
        <span className={draftFieldCell} role="cell">
          <select
            className={styles.draftSelect}
            value={form.priority}
            disabled={saving}
            aria-label={create.fields.priority}
            onChange={(e) => updateField('priority', e.target.value as CrmPriority)}
          >
            {(['low', 'normal', 'high', 'urgent'] as const).map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </span>
        <span className={draftFieldCell} role="cell">
          <select
            className={styles.draftSelect}
            value={form.currentStageSlug}
            disabled={saving}
            aria-label={create.fields.stage}
            onChange={(e) =>
              updateField('currentStageSlug', e.target.value as CreateCrmProjectFormState['currentStageSlug'])
            }
          >
            {DEFAULT_PIPELINE_STAGES.map((stage) => (
              <option key={stage.slug} value={stage.slug}>
                {stage.label}
              </option>
            ))}
          </select>
        </span>
        <span className={draftFieldCell} role="cell">
          <input
            className={styles.draftInput}
            value={form.waitingOn}
            disabled={saving}
            placeholder={create.fields.waitingOn}
            onChange={(e) => updateField('waitingOn', e.target.value)}
          />
        </span>
        <span className={`${draftFieldCell} ${styles.draftFieldCellWrap}`} role="cell">
          <input
            className={styles.draftInput}
            value={form.notes}
            disabled={saving}
            placeholder={create.fields.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </span>
        <span className={draftFieldCell} role="cell">
          <input
            className={styles.draftInput}
            inputMode="decimal"
            value={form.dealValueUsd}
            disabled={saving}
            placeholder="0"
            onChange={(e) => updateField('dealValueUsd', e.target.value)}
          />
        </span>
        <span className={`${styles.gridCellAssignee} ${styles.draftFieldCell}`} role="cell" ref={assigneeRef}>
          <button
            type="button"
            className={styles.draftAssigneeBtn}
            disabled={saving}
            aria-expanded={assigneeMenuOpen}
            onClick={() => setAssigneeMenuOpen((open) => !open)}
          >
            {selectedAssignee?.member ? (
              <TeamMemberAvatar member={selectedAssignee.member} />
            ) : (
              <span className={`${shared.avatar} ${shared.avatarUnassigned}`} title={create.assigneeUnassigned}>
                —
              </span>
            )}
          </button>
          <WorkflowInlineMenu
            open={assigneeMenuOpen}
            onClose={() => setAssigneeMenuOpen(false)}
            anchorRef={assigneeRef}
            align="end"
          >
            {assigneeOptions.map((option) => (
              <button
                key={option.id || 'unassigned'}
                type="button"
                className={`${styles.draftMenuAction} ${shared.assigneeMenuAction}`}
                disabled={saving || option.disabled === true}
                onClick={() => {
                  if (option.disabled) return;
                  updateField('assignedMemberId', option.id);
                  setAssigneeMenuOpen(false);
                }}
              >
                <AssigneeMenuOptionLabel option={option} />
              </button>
            ))}
          </WorkflowInlineMenu>
        </span>
        <span className={`${styles.gridCellActions} ${styles.draftFieldCell}`} role="cell">
          <button
            type="button"
            className={detailStyles.paymentDraftActionBtn}
            disabled={saving}
            title={create.saveProject}
            aria-label={create.saveProject}
            onClick={() => void handleSave()}
          >
            <span className={detailStyles.taskDoneIcon} aria-hidden>
              ✓
            </span>
          </button>
          {canManageTemplates && isApiSource ? (
            <button
              type="button"
              className={detailStyles.paymentDraftActionBtn}
              disabled={saving || templateManager.busy}
              title={templateCopy.loadAction}
              aria-label={templateCopy.loadTemplateDraftAriaLabel}
              onClick={templateManager.openList}
            >
              <span className={detailStyles.draftTemplateLoadIcon} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className={detailStyles.paymentDraftActionBtn}
            disabled={saving}
            title={create.cancelProject}
            aria-label={create.cancelProject}
            onClick={() => {
              setTemplateDraft(null);
              onCancel();
            }}
          >
            <span className={detailStyles.taskOpenIcon} aria-hidden />
          </button>
        </span>
      </div>
      {hasCreateProjectTemplateDraftContent(templateDraft) ? (
        <p className={styles.draftTemplateHint}>
          {templateCopy.draftTemplateApplied(draftSummary.workflowCount, draftSummary.paymentCount)}
        </p>
      ) : null}
      {error ? <p className={styles.draftError}>{error}</p> : null}
      {canManageTemplates && isApiSource ? (
        <LoadProjectTemplateDialogs controller={templateManager} />
      ) : null}
    </div>
  );
}
