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
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildProjectPrimaryPhotoApiPath,
  useProjectPrimaryPhotoBlob,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { truncateDisplayText } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  useCrmProjectRowPresentation,
  type CrmProjectRowPresentationOverrides,
} from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { CrmProjectInactiveIcon, CrmProjectInactiveInlineLabel } from '@/presentation/components/CrmProjects/CrmProjectInactiveBadge';
import { CrmProjectTableRowActionsMenu } from '@/presentation/components/CrmProjects/CrmProjectTableRowActionsMenu';
import { SubprojectMobileContactValue } from '@/presentation/components/CrmProjectDetail/SubprojectMobileContactValue';
import { ProjectPreviewNameAnchor } from '@/presentation/components/CrmProjects/ProjectPreviewNameAnchor';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

export type SubprojectMobileCardProps = {
  readonly project: CrmProjectSummary;
  readonly financials: ProjectPaymentFinancials;
  readonly financialsLoading?: boolean;
  readonly onRowClick: () => void;
  readonly isMemberRole?: boolean;
  readonly canDelete?: boolean;
  readonly showActions?: boolean;
  readonly deleting?: boolean;
  readonly busy?: boolean;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly isWorkflowProgressLoading?: boolean;
  /** Phase 2B: page-scoped progress/stage overrides (skips org-wide rollup Maps). */
  readonly presentationOverrides?: CrmProjectRowPresentationOverrides | null;
  readonly bulkSelection?: BulkSelectionBindings;
  readonly onContactCopied?: (message: string) => void;
};

export function SubprojectMobileCard({
  project,
  financials,
  financialsLoading = false,
  onRowClick,
  isMemberRole = false,
  canDelete = false,
  showActions = true,
  deleting = false,
  busy = false,
  onRequestDelete,
  onTogglePriority,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  presentationOverrides = null,
  bulkSelection,
  onContactCopied,
}: SubprojectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const fields = content.projectDetail.fields;
  const { industrySubtitle, derivedStageSlug, progress, catalog } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading,
    presentationOverrides
  );
  const isInactive = isCrmProjectInactive(project);
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
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);
  const isSelected = bulkSelection?.selectedIds.has(project.id) ?? false;
  const selectionModeActive = (bulkSelection?.selectedIds.size ?? 0) > 0;
  const projectPhotoApiPath = buildProjectPrimaryPhotoApiPath(project.slug, project.primaryPhotoPath);
  const projectPhotoUrl = useProjectPrimaryPhotoBlob(projectPhotoApiPath);
  const photoInitials = projectPrimaryPhotoInitials({
    parentProjectId: project.parentProjectId,
    projectName: project.name,
    clientName: project.client.name,
  });
  const photoLabel = project.parentProjectId != null ? project.name : project.client.name;
  const photoInitialStyle = {
    '--project-photo-bg': projectPrimaryPhotoCardColor(photoLabel),
  } as CSSProperties;
  const mobileCardProjectName = truncateDisplayText(project.name, 15);
  const stageMetaContent =
    derivedStageSlug != null ? (
      <span className={styles.subprojectMobileCardStageRow}>
        <span
          className={`${shared.stagePill} ${styles.subprojectMobileCardStagePill}`}
          title={formatStageLabel(derivedStageSlug, catalog)}
        >
          {formatStageLabel(derivedStageSlug, catalog)}
        </span>
        {!isMemberRole && progress != null ? (
          <span
            className={styles.subprojectMobileCardProgressPercent}
            aria-label={`Project progress ${progress.textPercent}%`}
          >
            {progress.textPercent}%
          </span>
        ) : null}
      </span>
    ) : (
      <span className={styles.subprojectMobileCardMeta}>—</span>
    );
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

  return (
    <article
      className={[
        styles.card,
        styles.subprojectMobileCard,
        isInactive ? styles.subprojectMobileCard_inactive : '',
        selectionModeActive ? styles.subprojectMobileCard_selectionMode : '',
        isSelected ? styles.subprojectMobileCard_selected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={tableCopy.subprojectRowAriaLabel(project.name)}
      aria-busy={busy || deleting || undefined}
    >
      <div className={styles.subprojectMobileCardContent}>
        <div
          role="button"
          tabIndex={0}
          className={styles.subprojectMobileCardBody}
          onClick={handleCardActivate}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={clearLongPressTimer}
          onTouchCancel={clearLongPressTimer}
        >
          <div className={styles.subprojectMobileCardSplit}>
            <div className={styles.subprojectMobileCardPhotoWrap}>
              {bulkSelection != null ? (
                <button
                  type="button"
                  className={[
                    styles.subprojectMobileCardSelectToggle,
                    selectionModeActive ? styles.subprojectMobileCardSelectToggle_visible : '',
                    isSelected ? styles.subprojectMobileCardSelectToggle_checked : '',
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
                  <span className={styles.subprojectMobileCardSelectToggleMark} aria-hidden />
                </button>
              ) : null}
              {projectPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={projectPhotoUrl} alt="" className={styles.subprojectMobileCardPhotoImg} />
              ) : (
                <span
                  className={styles.subprojectMobileCardPhotoInitial}
                  style={photoInitialStyle}
                  aria-hidden
                >
                  {photoInitials}
                </span>
              )}
            </div>
            <div className={styles.subprojectMobileCardDetailsStack}>
              <div className={styles.subprojectMobileCardTopRow}>
                <span className={styles.subprojectMobileCardNameRow}>
                  {isInactive ? (
                    <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
                  ) : isProjectPriorityUrgent(project.priority) ? (
                    <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
                  ) : null}
                  {isCrmProjectComplete(project) ? (
                    <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
                  ) : null}
                  <span className={styles.subprojectMobileCardNameGroup}>
                    <ProjectPreviewNameAnchor
                      project={project}
                      financials={financials}
                      stageLabel={
                        derivedStageSlug != null ? formatStageLabel(derivedStageSlug, catalog) : null
                      }
                      progressPercent={progress?.textPercent ?? null}
                    >
                      <span className={styles.subprojectMobileCardName} title={project.name}>
                        {mobileCardProjectName}
                      </span>
                    </ProjectPreviewNameAnchor>
                    {isInactive ? <CrmProjectInactiveInlineLabel project={project} /> : null}
                  </span>
                </span>
                <div className={styles.subprojectMobileCardHeaderEnd}>
                  <span className={styles.subprojectMobileCardAssignee}>
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
                      className={styles.subprojectMobileCardActions}
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
              <div className={styles.subprojectMobileCardInfoRow}>
                <span className={styles.subprojectMobileCardInfoIcon} aria-hidden>
                  <LuUser />
                </span>
                <span
                  className={`${styles.subprojectMobileCardContactName} ${styles.subprojectMobileCardContactBadge}`}
                >
                  {project.contact.name || '—'}
                </span>
              </div>
              <div className={styles.subprojectMobileCardInfoRow}>
                <span className={styles.subprojectMobileCardInfoIcon} aria-hidden>
                  <LuMail />
                </span>
                <SubprojectMobileContactValue
                  kind="email"
                  values={contactEmails}
                  displayValue={displayEmail}
                  formatDisplayValue={formatEmailPopoverValue}
                  getCopyValue={getEmailCopyValue}
                  onCopied={onContactCopied}
                  isMemberRole={isMemberRole}
                />
              </div>
              <div className={styles.subprojectMobileCardInfoRow}>
                <span className={styles.subprojectMobileCardInfoIcon} aria-hidden>
                  <LuPhone />
                </span>
                <SubprojectMobileContactValue
                  kind="phone"
                  values={contactPhones}
                  displayValue={displayPhone}
                  formatDisplayValue={formatPhonePopoverValue}
                  getCopyValue={getPhoneCopyValue}
                  onCopied={onContactCopied}
                  isMemberRole={isMemberRole}
                />
              </div>
              <div className={styles.subprojectMobileCardStageRow}>
                {stageMetaContent}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isMemberRole ? null : (
        <div className={styles.subprojectMobileCardFinancials} aria-label={content.projectDetail.sections.financials}>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.subValue}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.value}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.valueCents)}
            </span>
          </span>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.collected}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.collected}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.collectedCents)}
            </span>
          </span>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.balance}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.balance}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.balanceCents)}
            </span>
          </span>
        </div>
      )}
    </article>
  );
}
