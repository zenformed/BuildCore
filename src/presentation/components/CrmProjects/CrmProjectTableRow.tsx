'use client';

import { useCallback, type KeyboardEvent, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import {
  projectPrimaryPhotoCircleColor,
  projectPrimaryPhotoInitials,
} from '@/domain/crm/projectPrimaryPhoto';
import { formatCrmProjectLocationLine } from '@/domain/crm/projectAddress';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectAddressEnvelope } from '@/presentation/components/crmShared/CrmProjectAddressEnvelope';
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
import { useCrmProjectRowPresentation } from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { CrmProjectTableRowActionsMenu } from './CrmProjectTableRowActionsMenu';
import { CrmProjectTableContactCell } from './CrmProjectTableContactCell';
import { ProjectPreviewNameAnchor } from './ProjectPreviewNameAnchor';
import { CrmProjectInactiveIcon, CrmProjectInactiveInlineLabel } from './CrmProjectInactiveBadge';
import { LuMail, LuPhone, LuMapPin, LuUser, LuBuilding2, LuStickyNote, LuTriangleAlert } from 'react-icons/lu';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';
export type CrmProjectTableRowDeleteLabels = {
  readonly action: string;
  readonly actionAriaLabel: (name: string) => string;
};

function buildTelHref(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d+]/g, '');
  if (!normalized) return null;
  return `tel:${normalized}`;
}

function buildMapsHref(addressLine: string | null, latitude?: number | null, longitude?: number | null): string | null {
  if (addressLine != null && addressLine.trim().length > 0) {
    return `https://maps.google.com/?q=${encodeURIComponent(addressLine)}`;
  }
  if (latitude != null && longitude != null) {
    return `https://maps.google.com/?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }
  return null;
}

function truncateTo25(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 25) return trimmed;
  return `${trimmed.slice(0, 25)}...`;
}

export type CrmProjectTableRowProps = {
  project: CrmProjectSummary;
  variant?: 'root' | 'child';
  financials?: ProjectPaymentFinancials;
  valueLabel?: string;
  financialsLoading?: boolean;
  onRowClick: () => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
  deleting?: boolean;
  busy?: boolean;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  isWorkflowProgressLoading?: boolean;
  /** Phase 1B page-scoped progress/stage overrides (skip org-wide progress Maps). */
  presentationOverrides?: {
    readonly progress?: import('@/domain/buildcore/projectPipelineProgress').ProjectProgressDisplay | null;
    readonly derivedStageSlug?: import('@/domain/crm').PipelineStageSlug | null;
  } | null;
  bulkSelection?: BulkSelectionBindings;
  onContactCopied?: (message: string) => void;
  showParentProjectColumn?: boolean;
  parentProjectName?: string;
  subprojectCount?: number;
  progressTone?: 'success' | 'progress';
  showContactIcons?: boolean;
  dashboardCompactLayout?: boolean;
};

export function CrmProjectTableRow({
  project,
  variant = 'root',
  financials,
  valueLabel,
  financialsLoading = false,
  onRowClick,
  isMemberRole = false,
  canDelete = false,
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
  bulkSelection,
  onContactCopied,
  showParentProjectColumn = false,
  parentProjectName,
  subprojectCount = 0,
  progressTone = 'progress',
  showContactIcons = false,
  dashboardCompactLayout = false,
}: CrmProjectTableRowProps): ReactElement {
  const tableCopy = content.crm.table;
  const { catalog, industrySubtitle, progress, derivedStageSlug } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading,
    presentationOverrides
  );
  const isChild = variant === 'child' && !showParentProjectColumn;
  const isInactive = isCrmProjectInactive(project);
  const displayFinancials = financials ?? { valueCents: 0, collectedCents: 0, balanceCents: 0 };
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);
  const valueLabels = tableCopy.columns;
  const displayValueLabel =
    valueLabel ?? (isChild ? valueLabels.subValueLabel : valueLabels.projectValueLabel);
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
  const formattedAddress = formatCrmProjectLocationLine(
    project.address,
    project.latitude,
    project.longitude
  );
  const displayContactName = project.contact.name?.trim() || '—';
  const hasContactValue = displayContactName !== '—';
  const displayProjectName = dashboardCompactLayout ? project.name.trim() : truncateTo25(project.name);
  const displayIndustrySubtitle = industrySubtitle ? truncateTo25(industrySubtitle) : null;
  const displayParentProjectName = parentProjectName ? truncateTo25(parentProjectName) : null;
  // Contact values are stored as arrays; the legacy primary display fields
  // are empty strings when absent (not an em dash).
  const hasEmailValue = contactEmails.length > 0 && displayEmail.trim().length > 0;
  const hasPhoneValue = contactPhones.length > 0 && displayPhone.trim().length > 0;
  const hasAddressValue = typeof formattedAddress === 'string' && formattedAddress.trim().length > 0;
  const hasNotesValue = (project.notesPreview ?? '').trim().length > 0;
  const showSubprojectCount =
    showContactIcons && variant === 'root';
  const subprojectCountLabel =
    subprojectCount === 1 ? '1 Subproject' : `${subprojectCount} Subprojects`;
  const emailHref =
    showContactIcons && !isMemberRole && project.contact.email.trim().length > 0
      ? `mailto:${project.contact.email.trim()}`
      : null;
  const phoneHref =
    showContactIcons && !isMemberRole ? buildTelHref(project.contact.phone) : null;
  const addressHref =
    showContactIcons && !isMemberRole
      ? buildMapsHref(formattedAddress, project.latitude, project.longitude)
      : null;
  const projectPhotoApiPath = buildProjectPrimaryPhotoApiPath(project.slug, project.primaryPhotoPath);
  const projectPhotoUrl = useProjectPrimaryPhotoBlob(showContactIcons ? projectPhotoApiPath : null);
  const projectPhotoInitials = projectPrimaryPhotoInitials({
    parentProjectId: project.parentProjectId,
    projectName: project.name,
    clientName: project.client.name,
  });
  const projectPhotoLabel = project.parentProjectId != null ? project.name : project.client.name;
  const rowAriaLabel = isChild
    ? tableCopy.subprojectRowAriaLabel(project.name)
    : tableCopy.rowAriaLabel(project.name);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick();
    }
  };

  const rowClass = [
    isChild ? `${styles.gridRow} ${styles.gridRowChild}` : styles.gridRow,
    isInactive ? styles.gridRowInactive : '',
    bulkSelection?.mode && bulkSelection.selectedIds.has(project.id) ? styles.gridRowSelected : '',
  ]
    .filter(Boolean)
    .join(' ');
  const projectCellClass = isChild
    ? `${styles.gridCellProject} ${styles.gridCellProject_child}`
    : styles.gridCellProject;

  return (
    <div
      role="row"
      tabIndex={0}
      className={rowClass}
      onClick={onRowClick}
      onKeyDown={handleKeyDown}
      aria-label={rowAriaLabel}
    >
      {bulkSelection?.mode ? (
        <span className={styles.gridCellBulkSelect} role="cell">
          <BulkSelectCheckbox
            checked={bulkSelection.selectedIds.has(project.id)}
            ariaLabel={bulkSelection.selectItemAriaLabel(project.name)}
            onChange={() => bulkSelection.onToggle(project.id)}
          />
        </span>
      ) : null}
      <span className={projectCellClass} role="cell">
        <span className={showContactIcons ? styles.subprojectsProjectCell : undefined}>
          {showContactIcons ? (
            <span className={styles.subprojectsProjectPhoto}>
              {projectPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={projectPhotoUrl} alt="" className={styles.subprojectsProjectPhotoImg} />
              ) : (
                <span
                  className={styles.subprojectsProjectPhotoInitial}
                  style={{ backgroundColor: projectPrimaryPhotoCircleColor(projectPhotoLabel) }}
                  aria-hidden
                >
                  {projectPhotoInitials}
                </span>
              )}
            </span>
          ) : null}
          <span className={showContactIcons ? styles.subprojectsProjectCellBody : undefined}>
            <span className={styles.projectNameRow}>
              {isInactive ? (
                <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
              ) : null}
              {isCrmProjectComplete(project) ? (
                <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
              ) : null}
              <span className={styles.projectNameGroup}>
                <ProjectPreviewNameAnchor
                  project={project}
                  financials={financials ?? null}
                  stageLabel={
                    derivedStageSlug != null ? formatStageLabel(derivedStageSlug, catalog) : null
                  }
                  progressPercent={progress?.textPercent ?? null}
                  className={styles.projectNameAnchor}
                >
                  <span
                    className={
                      showContactIcons
                        ? `${styles.gridCellWithIcon} ${styles.projectNameWithIcon}`
                        : styles.projectNameWithIcon
                    }
                  >
                    {showContactIcons ? <LuBuilding2 className={styles.gridCellInlineIcon} aria-hidden /> : null}
                    <span
                      className={styles.projectName}
                      title={dashboardCompactLayout ? undefined : project.name}
                    >
                      {displayProjectName}
                    </span>
                  </span>
                </ProjectPreviewNameAnchor>
              </span>
              {isProjectPriorityUrgent(project.priority) ? (
                <LuTriangleAlert
                  className={styles.projectNeedsAttentionIcon}
                  aria-label={tableCopy.priorityMarkAriaLabel}
                  title={tableCopy.priorityMarkAriaLabel}
                />
              ) : null}
              {!isChild && hasChildren ? (
                <button
                  type="button"
                  className={styles.expandToggle}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded ? tableCopy.collapseSubprojects : tableCopy.expandSubprojects
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleExpand?.();
                  }}
                >
                  <span className={styles.expandChevronWrap} aria-hidden>
                    <span
                      className={
                        isExpanded ? styles.expandChevron_expanded : styles.expandChevron
                      }
                    />
                  </span>
                </button>
              ) : null}
            </span>
            {showParentProjectColumn && displayParentProjectName ? (
              <span className={styles.projectParentName} title={parentProjectName}>{displayParentProjectName}</span>
            ) : null}
            {(!showContactIcons || dashboardCompactLayout) && displayIndustrySubtitle ? (
              <span className={styles.projectMeta} title={industrySubtitle ?? undefined}>{displayIndustrySubtitle}</span>
            ) : null}
            {dashboardCompactLayout && variant === 'root' ? (
              <span className={styles.subprojectsCountText}>{subprojectCountLabel}</span>
            ) : null}
            {!isMemberRole && !dashboardCompactLayout ? (
              <span className={styles.projectProgressRow}>
                {isInactive ? (
                  <CrmProjectInactiveInlineLabel project={project} />
                ) : (
                  <>
                    {progress != null ? (
                      showContactIcons ? (
                        <span className={styles.subprojectsProgressPercent}>
                          {progress.textPercent}%
                        </span>
                      ) : (
                        <ProjectProgressPercent
                          variant="compact"
                          progress={progress}
                          tone={progressTone}
                        />
                      )
                    ) : null}
                    {derivedStageSlug != null ? (
                      <span className={`${shared.stagePill} ${styles.projectMetaStagePill}`}>
                        {formatStageLabel(derivedStageSlug, catalog)}
                      </span>
                    ) : null}
                    {showSubprojectCount ? (
                      <span className={styles.subprojectsCountText}>{subprojectCountLabel}</span>
                    ) : null}
                  </>
                )}
              </span>
            ) : null}
          </span>
        </span>
      </span>
      {dashboardCompactLayout ? (
        <>
          <span className={`${styles.gridCell} ${styles.dashboardClientCell}`} role="cell">
            <strong
              className={`${styles.dashboardClientLine} ${styles.subprojectsContactBadge}`}
            >
              <LuUser
                className={`${styles.dashboardClientLineIcon} ${styles.gridCellInlineIcon}`}
                aria-hidden
              />
              <span>{displayContactName}</span>
            </strong>
            <span className={styles.dashboardClientContactsRow}>
              {hasEmailValue ? (
                <CrmProjectTableContactCell
                  kind="email"
                  values={contactEmails}
                  displayValue={displayEmail}
                  formatDisplayValue={formatEmailPopoverValue}
                  getCopyValue={getEmailCopyValue}
                  onCopied={onContactCopied}
                  title={displayEmail}
                  href={emailHref}
                  getRowHref={(value) => `mailto:${value.trim()}`}
                  leadingIcon={
                  <LuMail
                    className={`${styles.dashboardClientLineIcon} ${styles.subprojectsContactInfoIcon}`}
                    aria-hidden
                  />
                  }
                />
              ) : null}
              {hasPhoneValue ? (
                <CrmProjectTableContactCell
                  kind="phone"
                  values={contactPhones}
                  displayValue={displayPhone}
                  formatDisplayValue={formatPhonePopoverValue}
                  getCopyValue={getPhoneCopyValue}
                  onCopied={onContactCopied}
                  href={phoneHref}
                  getRowHref={(value) => buildTelHref(value)}
                  leadingIcon={
                  <LuPhone
                    className={`${styles.dashboardClientLineIcon} ${styles.subprojectsContactInfoIcon}`}
                    aria-hidden
                  />
                  }
                />
              ) : null}
            </span>
            {hasAddressValue ? (
              <a
                className={`${styles.dashboardClientLine} ${styles.dashboardClientAddress} ${styles.tableContactCellValueLink}`}
                title={formattedAddress ?? undefined}
                href={addressHref ?? undefined}
                onClick={(event) => event.stopPropagation()}
              >
                <LuMapPin
                  className={`${styles.dashboardClientLineIcon} ${styles.subprojectsContactInfoIcon}`}
                  aria-hidden
                />
                <span>{formattedAddress}</span>
              </a>
            ) : null}
          </span>
          <span className={`${styles.gridCell} ${styles.dashboardStageCell}`} role="cell">
            {derivedStageSlug != null ? (
              <span className={`${shared.stagePill} ${styles.projectMetaStagePill}`}>
                {formatStageLabel(derivedStageSlug, catalog)}
              </span>
            ) : '—'}
          </span>
          <span className={`${styles.gridCell} ${styles.dashboardProgressCell}`} role="cell">
            {progress != null ? (
              <div
                className={styles.dashboardProgress}
                role="progressbar"
                aria-valuenow={progress.textPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Project progress ${progress.textPercent}%`}
              >
                <span className={styles.dashboardProgressTrack} aria-hidden>
                  <span
                    className={styles.dashboardProgressFill}
                    style={{ width: `${Math.min(100, Math.max(0, progress.textPercent))}%` }}
                  />
                </span>
                <span className={styles.dashboardProgressLabel}>{progress.textPercent}%</span>
              </div>
            ) : '—'}
          </span>
        </>
      ) : (
        <>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        <span
          className={[
            showContactIcons ? styles.gridCellWithIcon : '',
            showContactIcons ? styles.subprojectsContactBadge : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showContactIcons && hasContactValue ? (
            <LuUser className={styles.gridCellInlineIcon} aria-hidden />
          ) : null}
          <span>{displayContactName}</span>
        </span>
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        <CrmProjectTableContactCell
          kind="email"
          values={contactEmails}
          displayValue={displayEmail}
          formatDisplayValue={formatEmailPopoverValue}
          getCopyValue={getEmailCopyValue}
          onCopied={onContactCopied}
          title={displayEmail}
          href={emailHref}
          getRowHref={
            showContactIcons && !isMemberRole
              ? (value) => `mailto:${value.trim()}`
              : undefined
          }
          leadingIcon={
            showContactIcons && hasEmailValue ? (
              <LuMail
                className={`${styles.gridCellInlineIcon} ${styles.subprojectsContactInfoIcon}`}
                aria-hidden
              />
            ) : null
          }
        />
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        <CrmProjectTableContactCell
          kind="phone"
          values={contactPhones}
          displayValue={displayPhone}
          formatDisplayValue={formatPhonePopoverValue}
          getCopyValue={getPhoneCopyValue}
          onCopied={onContactCopied}
          href={phoneHref}
          getRowHref={
            showContactIcons && !isMemberRole
              ? (value) => buildTelHref(value)
              : undefined
          }
          leadingIcon={
            showContactIcons && hasPhoneValue ? (
              <LuPhone
                className={`${styles.gridCellInlineIcon} ${styles.subprojectsContactInfoIcon}`}
                aria-hidden
              />
            ) : null
          }
        />
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={formattedAddress ?? undefined}
      >
        <span className={showContactIcons ? styles.gridCellWithIcon : undefined}>
          {showContactIcons && hasAddressValue ? (
            <LuMapPin
              className={`${styles.gridCellInlineIcon} ${styles.subprojectsContactInfoIcon}`}
              aria-hidden
            />
          ) : null}
          {addressHref != null ? (
            <a
              href={addressHref}
              className={styles.tableContactCellValueLink}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <CrmProjectAddressEnvelope
                address={project.address}
                latitude={project.latitude}
                longitude={project.longitude}
              />
            </a>
          ) : (
            <CrmProjectAddressEnvelope
              address={project.address}
              latitude={project.latitude}
              longitude={project.longitude}
            />
          )}
        </span>
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={project.notesPreview ?? undefined}
      >
        <span className={showContactIcons ? styles.gridCellWithIcon : undefined}>
          {showContactIcons && hasNotesValue ? (
            <LuStickyNote
              className={`${styles.gridCellInlineIcon} ${styles.subprojectsContactInfoIcon}`}
              aria-hidden
            />
          ) : null}
          <span className={styles.gridCellWrap}>{project.notesPreview ?? '—'}</span>
        </span>
      </span>
        </>
      )}
      {!isMemberRole ? (
        <>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter} ${dashboardCompactLayout ? styles.dashboardValueCell : ''}`}
            role="cell"
            title={displayValueLabel}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.valueCents)}
          </span>
          {dashboardCompactLayout ? (
            <span
              className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.dashboardBalanceCell}`}
              role="cell"
              title={valueLabels.balance}
              aria-busy={financialsLoading || undefined}
            >
              <strong>{financialDisplay(displayFinancials.balanceCents)}</strong>
              <small>{financialDisplay(displayFinancials.collectedCents)} collected</small>
            </span>
          ) : (
            <>
              <span className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`} role="cell" title={valueLabels.collected} aria-busy={financialsLoading || undefined}>
                {financialDisplay(displayFinancials.collectedCents)}
              </span>
              <span className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`} role="cell" title={valueLabels.balance} aria-busy={financialsLoading || undefined}>
                {financialDisplay(displayFinancials.balanceCents)}
              </span>
            </>
          )}
        </>
      ) : null}
      <span className={styles.gridCellAssignee} role="cell">
        {project.assignedTo ? (
          <TeamMemberAvatar member={project.assignedTo} />
        ) : (
          <span className={`${shared.avatar} ${shared.avatarUnassigned}`} title={tableCopy.unassigned}>
            —
          </span>
        )}
      </span>
      {!isMemberRole && showActions ? (
        <span className={styles.gridCellActions} role="cell">
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
  );
}
