'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { LuMail, LuPhone, LuUser } from 'react-icons/lu';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import {
  projectPrimaryPhotoCardColor,
  projectPrimaryPhotoInitials,
} from '@/domain/crm/projectPrimaryPhoto';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { SubprojectMobileContactValue } from '@/presentation/components/CrmProjectDetail/SubprojectMobileContactValue';
import {
  buildProjectPrimaryPhotoApiPath,
  useProjectPrimaryPhotoBlob,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { truncateDisplayText } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useCrmProjectRowPresentation } from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { CrmProjectTableRowActionsMenu } from './CrmProjectTableRowActionsMenu';
import { ProjectPreviewNameAnchor } from './ProjectPreviewNameAnchor';
import { CrmProjectInactiveIcon, CrmProjectInactiveInlineLabel } from './CrmProjectInactiveBadge';
import projectStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectMobileCardProps = {
  readonly project: CrmProjectSummary;
  readonly variant?: 'root' | 'child';
  readonly financials?: ProjectPaymentFinancials;
  readonly valueLabel?: string;
  readonly financialsLoading?: boolean;
  readonly onRowClick: () => void;
  readonly isMemberRole?: boolean;
  readonly canDelete?: boolean;
  readonly bulkSelection?: BulkSelectionBindings;
  readonly showActions?: boolean;
  readonly deleting?: boolean;
  readonly busy?: boolean;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly hasChildren?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: () => void;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly isWorkflowProgressLoading?: boolean;
  readonly presentationOverrides?: {
    readonly progress?: import('@/domain/buildcore/projectPipelineProgress').ProjectProgressDisplay | null;
    readonly derivedStageSlug?: import('@/domain/crm').PipelineStageSlug | null;
  } | null;
  readonly parentProjectName?: string;
  readonly showContactInfo?: boolean;
};

export function CrmProjectMobileCard({
  project,
  variant = 'root',
  financials,
  valueLabel,
  financialsLoading = false,
  onRowClick,
  isMemberRole = false,
  canDelete = false,
  bulkSelection,
  showActions = true,
  deleting = false,
  busy = false,
  onRequestDelete,
  onTogglePriority,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  presentationOverrides = null,
  parentProjectName,
  showContactInfo = false,
}: CrmProjectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const isChild = variant === 'child' && parentProjectName == null;
  const isInactive = isCrmProjectInactive(project);
  const { catalog, industrySubtitle, progress, derivedStageSlug } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading,
    presentationOverrides
  );
  const displayFinancials = financials ?? { valueCents: 0, collectedCents: 0, balanceCents: 0 };
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);
  const displayValueLabel =
    valueLabel ?? (isChild ? valueLabels.subValueLabel : valueLabels.projectValueLabel);
  const rowAriaLabel = isChild
    ? tableCopy.subprojectRowAriaLabel(project.name)
    : tableCopy.rowAriaLabel(project.name);
  const isSelected = bulkSelection?.selectedIds.has(project.id) ?? false;
  const selectionModeActive = (bulkSelection?.selectedIds.size ?? 0) > 0;
  const displayEmail = formatContactEmailDisplay(project.contact.email, { maskForMember: isMemberRole });
  const displayPhone = formatPhoneDisplay(project.contact.phone);
  const contactEmails = nonEmptyContactValues(project.contact.emails);
  const contactPhones = nonEmptyContactValues(project.contact.phones);
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

  const stageMetaContent =
    !isMemberRole && (isInactive || derivedStageSlug != null || progress != null) ? (
      isInactive ? (
        <CrmProjectInactiveInlineLabel project={project} />
      ) : (
        <span className={projectStyles.subprojectMobileCardStageRow}>
          {isProjectPriorityUrgent(project.priority) ? (
            <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
          ) : null}
          {derivedStageSlug != null ? (
            <span
              className={`${shared.stagePill} ${styles.projectMetaStagePill}`}
              title={formatStageLabel(derivedStageSlug, catalog)}
            >
              {formatStageLabel(derivedStageSlug, catalog)}
            </span>
          ) : null}
          {progress != null ? (
            <span
              className={projectStyles.subprojectMobileCardProgressPercent}
              aria-label={`Project progress ${progress.textPercent}%`}
            >
              {progress.textPercent}%
            </span>
          ) : null}
        </span>
      )
    ) : null;
  const projectPhotoApiPath = buildProjectPrimaryPhotoApiPath(project.slug, project.primaryPhotoPath);
  const projectPhotoUrl = useProjectPrimaryPhotoBlob(showContactInfo ? projectPhotoApiPath : null);
  const projectPhotoInitials = projectPrimaryPhotoInitials({
    parentProjectId: project.parentProjectId,
    projectName: project.name,
    clientName: project.client.name,
  });
  const projectPhotoLabel = project.parentProjectId != null ? project.name : project.client.name;
  const projectPhotoInitialStyle = {
    '--project-photo-bg': projectPrimaryPhotoCardColor(projectPhotoLabel),
  } as CSSProperties;
  const mobileCardProjectName = truncateDisplayText(project.name, 15);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(
    () => () => {
      if (longPressTimerRef.current != null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const isPreviewModalOpen = useCallback((): boolean => {
    if (typeof document === 'undefined') return false;
    return document.body?.dataset.projectPreviewOpen === 'true';
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isPreviewModalOpen()) return;
    if (bulkSelection == null || selectionModeActive) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      bulkSelection.onToggle(project.id);
      longPressTriggeredRef.current = true;
    }, 420);
  }, [bulkSelection, clearLongPressTimer, isPreviewModalOpen, project.id, selectionModeActive]);

  const handleCardActivate = useCallback(() => {
    if (isPreviewModalOpen()) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionModeActive && bulkSelection != null) {
      bulkSelection.onToggle(project.id);
      return;
    }
    onRowClick();
  }, [bulkSelection, isPreviewModalOpen, onRowClick, project.id, selectionModeActive]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (isPreviewModalOpen()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selectionModeActive && bulkSelection != null) {
        bulkSelection.onToggle(project.id);
        return;
      }
      onRowClick();
    }
  };

  const cardClass = [
    projectStyles.card,
    styles.mobileCard,
    isChild ? styles.mobileCardChild : '',
    isInactive ? styles.mobileCardInactive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClass}
      aria-label={rowAriaLabel}
      aria-busy={busy || deleting || undefined}
      role="button"
      tabIndex={0}
      onClick={handleCardActivate}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
    >
      <div
        className={[
          styles.mobileCardBody,
          showContactInfo ? styles.mobileCardBody_withPhotoLayout : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showContactInfo ? (
          <div className={styles.mobileCardSplit}>
            <div className={styles.mobileCardPhotoWrap}>
              {bulkSelection != null ? (
                <button
                  type="button"
                  className={[
                    styles.mobileCardSelectToggle,
                    selectionModeActive ? styles.mobileCardSelectToggle_visible : '',
                    isSelected ? styles.mobileCardSelectToggle_checked : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={isSelected}
                  aria-label={bulkSelection.selectItemAriaLabel(project.name)}
                  onClick={(event) => {
                    event.stopPropagation();
                    bulkSelection.onToggle(project.id);
                  }}
                >
                  <span className={styles.mobileCardSelectToggleMark} aria-hidden />
                </button>
              ) : null}
              {projectPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={projectPhotoUrl} alt="" className={styles.mobileCardPhotoImg} />
              ) : (
                <span
                  className={styles.mobileCardPhotoInitial}
                  style={projectPhotoInitialStyle}
                  aria-hidden
                >
                  {projectPhotoInitials}
                </span>
              )}
            </div>
            <div className={styles.mobileCardDetailsStack}>
              <div className={styles.mobileCardTopRow}>
                <div className={styles.mobileCardInfoRow}>
                  <ProjectPreviewNameAnchor
                    project={project}
                    financials={financials ?? null}
                    stageLabel={
                      derivedStageSlug != null ? formatStageLabel(derivedStageSlug, catalog) : null
                    }
                    progressPercent={progress?.textPercent ?? null}
                    className={styles.mobileCardPreviewAnchor}
                  >
                    <span className={styles.mobileCardTitle}>{mobileCardProjectName}</span>
                  </ProjectPreviewNameAnchor>
                </div>
                <div className={styles.mobileCardHeaderEnd}>
                  <span className={styles.mobileCardAssignee}>
                    {project.assignedTo ? (
                      <TeamMemberAvatar member={project.assignedTo} />
                    ) : (
                      <span
                        className={`${shared.avatar} ${shared.avatarUnassigned}`}
                        title={tableCopy.unassigned}
                      >
                        —
                      </span>
                    )}
                  </span>
                  {!isMemberRole && showActions ? (
                    <span
                      className={styles.mobileCardActions}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <CrmProjectTableRowActionsMenu
                        project={project}
                        busy={busy || deleting}
                        canDelete={canDelete}
                        onRequestDelete={onRequestDelete}
                        onTogglePriority={onTogglePriority}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={styles.mobileCardInfoRow}>
                <span className={styles.mobileCardInfoIcon} aria-hidden>
                  <LuUser />
                </span>
                <span className={`${styles.mobileCardContactValue} ${styles.mobileCardContactBadge}`}>
                  {project.contact.name || '—'}
                </span>
              </div>
              <div className={styles.mobileCardInfoRow}>
                <span className={styles.mobileCardInfoIcon} aria-hidden>
                  <LuMail />
                </span>
                <SubprojectMobileContactValue
                  kind="email"
                  values={contactEmails}
                  displayValue={displayEmail}
                  formatDisplayValue={formatEmailPopoverValue}
                  getCopyValue={getEmailCopyValue}
                  isMemberRole={isMemberRole}
                  valueClassName={styles.mobileCardContactValue}
                />
              </div>
              <div className={styles.mobileCardInfoRow}>
                <span className={styles.mobileCardInfoIcon} aria-hidden>
                  <LuPhone />
                </span>
                <SubprojectMobileContactValue
                  kind="phone"
                  values={contactPhones}
                  displayValue={displayPhone}
                  formatDisplayValue={formatPhonePopoverValue}
                  getCopyValue={getPhoneCopyValue}
                  isMemberRole={isMemberRole}
                  valueClassName={styles.mobileCardContactValue}
                />
              </div>
              {stageMetaContent != null ? (
                <div className={styles.mobileCardStageRow}>{stageMetaContent}</div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.mobileCardHeader}>
              <div className={styles.mobileCardTitleBlock}>
                <span
                  className={[
                    styles.mobileCardTitleRow,
                    showContactInfo ? styles.mobileCardTitleRow_withContact : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isInactive ? (
                    <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
                  ) : null}
                  {isCrmProjectComplete(project) ? (
                    <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
                  ) : null}
                  <ProjectPreviewNameAnchor
                    project={project}
                    financials={financials ?? null}
                    stageLabel={
                      derivedStageSlug != null ? formatStageLabel(derivedStageSlug, catalog) : null
                    }
                    progressPercent={progress?.textPercent ?? null}
                    className={showContactInfo ? styles.mobileCardPreviewAnchor : undefined}
                  >
                    <span className={styles.mobileCardTitle}>{mobileCardProjectName}</span>
                  </ProjectPreviewNameAnchor>
                </span>
                {!showContactInfo && parentProjectName ? (
                  <span className={styles.mobileCardParentProject}>{parentProjectName}</span>
                ) : null}
                {!showContactInfo && industrySubtitle ? (
                  <span className={styles.mobileCardIndustry}>{industrySubtitle}</span>
                ) : null}
              </div>
              <div className={styles.mobileCardHeaderEnd}>
                <span className={styles.mobileCardAssignee}>
                  {project.assignedTo ? (
                    <TeamMemberAvatar member={project.assignedTo} />
                  ) : (
                    <span
                      className={`${shared.avatar} ${shared.avatarUnassigned}`}
                      title={tableCopy.unassigned}
                    >
                      —
                    </span>
                  )}
                </span>
                {!isMemberRole && showActions ? (
                  <span
                    className={styles.mobileCardActions}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <CrmProjectTableRowActionsMenu
                      project={project}
                      busy={busy || deleting}
                      canDelete={canDelete}
                      onRequestDelete={onRequestDelete}
                      onTogglePriority={onTogglePriority}
                    />
                  </span>
                ) : null}
              </div>
            </div>
            {!isMemberRole && (isInactive || derivedStageSlug != null || progress != null) ? (
              <div className={styles.mobileCardMetaRow}>{stageMetaContent}</div>
            ) : null}
          </>
        )}
      </div>

      {!isMemberRole ? (
        <div
          className={projectStyles.subprojectMobileCardFinancials}
          aria-label={content.projectDetail.sections.financials}
          aria-busy={financialsLoading || undefined}
        >
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={displayValueLabel}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.value}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.valueCents)}
            </span>
          </span>
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={valueLabels.collected}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.collected}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.collectedCents)}
            </span>
          </span>
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={valueLabels.balance}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.balance}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.balanceCents)}
            </span>
          </span>
        </div>
      ) : null}

      {!isChild && hasChildren ? (
        <button
          type="button"
          className={styles.mobileCardExpandBtn}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? tableCopy.collapseSubprojects : tableCopy.expandSubprojects}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand?.();
          }}
        >
          <span className={styles.expandChevronWrap} aria-hidden>
            <span
              className={isExpanded ? styles.expandChevron_expanded : styles.expandChevron}
            />
          </span>
        </button>
      ) : null}
    </article>
  );
}
