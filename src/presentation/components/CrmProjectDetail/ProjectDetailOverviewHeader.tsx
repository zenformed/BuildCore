'use client';

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  LuCircleDollarSign,
  LuClock3,
  LuGitBranch,
  LuMail,
  LuPhone,
  LuStickyNote,
  LuUser,
} from 'react-icons/lu';
import { countCompletedWorkflowStages, resolveWorkflowPipelineGraphState } from '@/domain/buildcore/projectPipelineProgress';
import type { CrmIndustry, CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectInactive, isPaymentWorkflowTask } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatRelativeUpdatedAt,
  formatStageLabel,
  getProjectIndustryDisplayLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { useProjectDetailPaymentFinancials } from '@/presentation/features/crmProjectDetail/useProjectDetailPaymentFinancials';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderIndustry } from './ProjectHeaderIndustry';
import { ProjectNotesInline } from './ProjectNotesInline';
import { ProjectPrimaryPhoto } from './ProjectPrimaryPhoto';
import { ProjectProgressPercent } from './ProjectProgressPercent';
import { SummaryInlineText } from './ProjectSummaryStrip';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

type ProjectDetailOverviewHeaderProps = {
  project: CrmProjectDetail;
  parentProject?: CrmProjectSummary | null;
  isApiSource: boolean;
  isMemberRole: boolean;
  readOnly: boolean;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  patchIndustry: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
  onPrimaryPhotoUpdated?: (summary: CrmProjectSummary) => void;
  onPrimaryPhotoError?: (message: string) => void;
};

function resolveNextOpenTaskTitle(project: CrmProjectDetail): string | null {
  const actionableTask = [...project.workflowTasks]
    .filter((task) => !isPaymentWorkflowTask(task) && task.status !== 'done')
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];

  return actionableTask?.title.trim() || null;
}

export function ProjectDetailOverviewHeader({
  project,
  parentProject = null,
  isApiSource,
  isMemberRole,
  readOnly,
  savingField,
  patchField,
  patchIndustry,
  onPrimaryPhotoUpdated,
  onPrimaryPhotoError,
}: ProjectDetailOverviewHeaderProps): ReactElement {
  const { summary } = project;
  const detailCopy = content.projectDetail;
  const fields = detailCopy.fields;
  const fullDetailsCopy = detailCopy.fullDetails;
  const { childSummaries, setToast, onProjectSaved, guardProjectEdit } = useProjectDetailShell();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: summary.parentProjectId });
  const paymentFinancials = useProjectDetailPaymentFinancials({
    project,
    childSummaries: childSummaries?.allRows ?? null,
  });

  const isSubproject = summary.parentProjectId != null;
  const isInactive = isCrmProjectInactive(summary);
  const entityTypeLabel = isSubproject
    ? detailCopy.subprojects.subprojectSingular
    : detailCopy.pageTitleFallback;
  const valueLabel = isSubproject ? fields.subValue : fields.value;
  const displayEmail = formatContactEmailDisplay(summary.contact.email, { maskForMember: isMemberRole });
  const displayPhone = formatPhoneDisplay(summary.contact.phone);
  const displayIndustry = getProjectIndustryDisplayLabel(summary.industry, summary.customIndustry);
  const customerDisplay = summary.contact.name.trim() || summary.client.name;
  const lastUpdatedDisplay = formatRelativeUpdatedAt(summary.lastUpdatedAt);
  const assignedName = summary.assignedTo?.displayName?.trim() || detailCopy.unassigned;

  const stageCompletion = useMemo(
    () =>
      countCompletedWorkflowStages({
        workflowTasks: project.workflowTasks,
        manualStageCompletions: project.manualStageCompletions,
        stages: stageCatalog,
      }),
    [project.manualStageCompletions, project.workflowTasks, stageCatalog]
  );

  const stageGraph = useMemo(
    () =>
      resolveWorkflowPipelineGraphState({
        workflowTasks: project.workflowTasks,
        manualStageCompletions: project.manualStageCompletions,
        stages: stageCatalog,
      }),
    [project.manualStageCompletions, project.workflowTasks, stageCatalog]
  );

  const stagePosition = useMemo(() => {
    const total = stageCompletion.totalActiveStageCount;
    if (total === 0) return null;
    const activeSlug = stageGraph.derivedCurrentStageSlug;
    if (activeSlug == null) return total;
    const index = stageGraph.stageStatuses.findIndex((stage) => stage.stageSlug === activeSlug);
    return index < 0 ? Math.min(total, stageCompletion.completedStageCount + 1) : index + 1;
  }, [stageCompletion, stageGraph]);

  const stagePositionLabel =
    stagePosition == null
      ? 'Stage —'
      : `Stage ${stagePosition} of ${stageCompletion.totalActiveStageCount}`;
  const currentPipelineStageSlug = stageGraph.derivedCurrentStageSlug ?? summary.currentStageSlug;
  const pipelineProgress = useMemo(() => {
    const totalStageCount = stageCompletion.totalActiveStageCount;
    if (totalStageCount <= 0 || stagePosition == null) {
      return { textPercent: 0, litSegmentCount: 0 };
    }
    const boundedStagePosition = Math.max(1, Math.min(totalStageCount, stagePosition));
    return {
      textPercent: Math.round((boundedStagePosition / totalStageCount) * 100),
      litSegmentCount: boundedStagePosition,
    };
  }, [stageCompletion.totalActiveStageCount, stagePosition]);

  const nextStepDisplay = useMemo(() => {
    if (stageGraph.derivedCurrentStageSlug != null) {
      return formatStageLabel(stageGraph.derivedCurrentStageSlug, stageCatalog);
    }
    return resolveNextOpenTaskTitle(project) ?? '—';
  }, [project, stageCatalog, stageGraph.derivedCurrentStageSlug]);

  const emailValues = nonEmptyContactValues(summary.contact.emails);
  const phoneValues = nonEmptyContactValues(summary.contact.phones);
  const onContactCopied = useCallback(
    (message: string) => setToast({ kind: 'success', message }),
    [setToast]
  );
  const formatEmailPopoverValue = useCallback(
    (email: string) => formatContactEmailDisplay(email, { maskForMember: isMemberRole }),
    [isMemberRole]
  );
  const getEmailCopyValue = useCallback(
    (email: string) =>
      isMemberRole ? formatContactEmailDisplay(email, { maskForMember: true }) : email.trim(),
    [isMemberRole]
  );
  const formatPhonePopoverValue = useCallback((phone: string) => formatPhoneDisplay(phone), []);
  const getPhoneCopyValue = useCallback(
    (phone: string) => formatPhoneDisplay(phone) || phone.trim(),
    []
  );

  return (
    <section className={styles.overviewHeaderCard} aria-label={detailCopy.sections.projectInformation}>
      <div className={styles.overviewHeaderTop}>
        <section className={styles.overviewIdentity}>
          <div className={styles.overviewIdentityMain}>
            <div className={styles.overviewIdentityPhoto}>
              <ProjectPrimaryPhoto
                summary={summary}
                parentSummary={parentProject}
                canEdit={!isMemberRole && !isInactive && summary.parentProjectId == null}
                onPhotoUpdated={(nextSummary) => onPrimaryPhotoUpdated?.(nextSummary)}
                onError={onPrimaryPhotoError}
              />
            </div>
            <div className={styles.overviewIdentityContent}>
              <div className={styles.overviewIdentityTitleRow}>
                <h1 className={styles.title}>{summary.client.name}</h1>
                <span
                  className={
                    isInactive ? styles.overviewStatusBadgeInactive : styles.overviewStatusBadgeActive
                  }
                >
                  {isInactive ? detailCopy.subprojects.markInactive.badge : 'Active'}
                </span>
              </div>
              <div className={styles.overviewIdentityMetaRow}>
                {isMemberRole ? (
                  <span className={styles.overviewIndustryBadge}>{displayIndustry}</span>
                ) : (
                  <div className={styles.overviewIndustryInlineEditor}>
                    <ProjectHeaderIndustry
                      industry={summary.industry}
                      customIndustry={summary.customIndustry}
                      isSaving={savingField === 'industry' || savingField === 'customIndustry'}
                      onIndustryChange={patchIndustry}
                    />
                  </div>
                )}
                <span className={styles.overviewDot} aria-hidden>
                  •
                </span>
                <span className={styles.overviewEntityType}>{entityTypeLabel}</span>
              </div>
              <div className={styles.overviewIdentityContactRow}>
                <div className={styles.overviewContactItem}>
                  <LuMail size={13} aria-hidden className={styles.overviewContactIcon} />
                  <SummaryInlineText
                    fieldKey="email"
                    label={fields.email}
                    value={summary.contact.email}
                    displayValue={displayEmail}
                    savingField={savingField}
                    disabled={readOnly}
                    inputType="email"
                    displayClassName={styles.overviewInlineValue}
                    hideLabel
                    onPatch={patchField}
                    contactPopoverValues={emailValues}
                    contactPopoverKind="email"
                    formatContactPopoverValue={formatEmailPopoverValue}
                    getContactCopyValue={getEmailCopyValue}
                    onContactCopied={onContactCopied}
                  />
                </div>
                <div className={`${styles.overviewContactItem} ${styles.overviewContactItemPhone}`}>
                  <LuPhone size={13} aria-hidden className={styles.overviewContactIcon} />
                  <SummaryInlineText
                    fieldKey="phone"
                    label={fields.phone}
                    value={summary.contact.phone}
                    displayValue={displayPhone}
                    savingField={savingField}
                    disabled={readOnly}
                    inputType="tel"
                    displayClassName={styles.overviewInlineValue}
                    hideLabel
                    onPatch={patchField}
                    contactPopoverValues={phoneValues}
                    contactPopoverKind="phone"
                    formatContactPopoverValue={formatPhonePopoverValue}
                    getContactCopyValue={getPhoneCopyValue}
                    onContactCopied={onContactCopied}
                  />
                </div>
              </div>
              {!isMemberRole ? (
                <div className={styles.overviewIdentityActionsRow}>
                  <button
                    type="button"
                    className={styles.overviewEditButton}
                    onClick={() => {
                      guardProjectEdit(() => {
                        setEditModalOpen(true);
                      });
                    }}
                    aria-label={fullDetailsCopy.viewEdit}
                  >
                    {fullDetailsCopy.viewEdit}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.overviewPipeline}>
          <div className={styles.overviewSectionTitleRow}>
            <span
              className={`${styles.overviewSectionIconBadge} ${styles.overviewSectionIconBadge_pipeline}`}
              aria-hidden
            >
              <LuGitBranch size={14} />
            </span>
            <span className={styles.overviewSectionTitle}>Pipeline</span>
          </div>
          <div className={styles.overviewPipelineCurrent}>
            <span className={styles.overviewMetaLabel}>{detailCopy.currentStage}</span>
            <span className={`${styles.overviewMetaValue} ${styles.overviewPipelineStagePill}`}>
              {formatStageLabel(currentPipelineStageSlug, stageCatalog)}
            </span>
          </div>
          <div className={styles.overviewPipelineProgress}>
            <ProjectProgressPercent
              progress={pipelineProgress}
              tone="progress"
              segmentCount={stageCompletion.totalActiveStageCount}
            />
          </div>
          <span className={styles.overviewPipelineStageCount}>{stagePositionLabel}</span>
        </section>

        <section className={styles.overviewValue}>
          <div className={styles.overviewSectionTitleRow}>
            <span
              className={`${styles.overviewSectionIconBadge} ${styles.overviewSectionIconBadge_value}`}
              aria-hidden
            >
              <LuCircleDollarSign size={14} />
            </span>
            <span className={styles.overviewSectionTitle}>Customer Value</span>
          </div>
          <div className={styles.overviewValueMetrics}>
            <div className={styles.overviewValueMetric}>
              <span className={styles.overviewValueMetricAmount}>
                {formatCentsAsUsd(paymentFinancials.valueCents)}
              </span>
              <span className={styles.overviewMetaLabel}>{valueLabel}</span>
            </div>
            <div className={styles.overviewValueMetric}>
              <span className={styles.overviewValueMetricAmount}>
                {formatCentsAsUsd(paymentFinancials.collectedCents)}
              </span>
              <span className={styles.overviewMetaLabel}>{fields.collected}</span>
            </div>
            <div className={styles.overviewValueMetric}>
              <span className={styles.overviewValueMetricAmount}>
                {formatCentsAsUsd(paymentFinancials.balanceCents)}
              </span>
              <span className={styles.overviewMetaLabel}>{fields.balance}</span>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.overviewMetadataStrip}>
        <div className={styles.overviewMetadataCell}>
          <div className={styles.overviewMetadataItem}>
            <div className={styles.overviewMetadataIcon} aria-hidden>
              <LuUser size={12} />
            </div>
            <div className={styles.overviewMetadataText}>
              <span className={styles.overviewMetaLabel}>{fields.customer}</span>
              <span className={`${styles.overviewMetaValue} ${styles.overviewCustomerBadge}`}>
                {customerDisplay}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.overviewMetadataCell}>
          <div className={styles.overviewMetadataItem}>
            <div className={styles.overviewMetadataIcon}>
              {!isMemberRole ? (
                <ProjectHeaderAssignee
                  assignedTo={summary.assignedTo}
                  isApiSource={isApiSource}
                  isSaving={savingField === 'assignedMemberId'}
                  onAssigneeChange={(id) => patchField('assignedMemberId', id)}
                />
              ) : summary.assignedTo ? (
                <TeamMemberAvatar member={summary.assignedTo} />
              ) : (
                <span className={styles.overviewUnassignedAvatar} aria-hidden>
                  —
                </span>
              )}
            </div>
            <div className={styles.overviewMetadataText}>
              <span className={styles.overviewMetaLabel}>{fields.assigned}</span>
              <span className={styles.overviewMetaValue}>{assignedName}</span>
            </div>
          </div>
        </div>
        <div className={styles.overviewMetadataCell}>
          <div className={styles.overviewMetadataItem}>
            <div className={styles.overviewMetadataIcon} aria-hidden>
              <LuClock3 size={12} />
            </div>
            <div className={styles.overviewMetadataText}>
              <span className={styles.overviewMetaLabel}>{fields.updated}</span>
              <span className={styles.overviewMetaValue}>{lastUpdatedDisplay}</span>
            </div>
          </div>
        </div>
        <div className={styles.overviewMetadataCell}>
          <div className={styles.overviewMetadataItem}>
            <div className={styles.overviewMetadataIcon} aria-hidden>
              <LuGitBranch size={12} />
            </div>
            <div className={styles.overviewMetadataText}>
              <span className={styles.overviewMetaLabel}>Next Step</span>
              <span
                className={`${styles.overviewMetaValue} ${styles.overviewPipelineStagePill}`}
                title={nextStepDisplay}
              >
                {nextStepDisplay}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.overviewMetadataCell}>
          <div className={styles.overviewMetadataItem}>
            <div className={styles.overviewMetadataIcon} aria-hidden>
              <LuStickyNote size={12} />
            </div>
            <div className={styles.overviewMetadataText}>
              <span className={styles.overviewMetaLabel}>{detailCopy.projectNotesLabel}</span>
              <ProjectNotesInline
                label=""
                notes={project.notes}
                readOnly={readOnly}
                savingField={savingField}
                onPatch={patchField}
              />
            </div>
          </div>
        </div>
      </div>

      {!isMemberRole ? (
        <CreateCrmProjectModal
          open={editModalOpen}
          mode="edit"
          project={project}
          onClose={() => setEditModalOpen(false)}
          onUpdated={onProjectSaved}
        />
      ) : null}
    </section>
  );
}
