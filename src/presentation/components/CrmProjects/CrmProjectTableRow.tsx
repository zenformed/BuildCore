'use client';

import { useCallback, type KeyboardEvent, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectAddressEnvelope } from '@/presentation/components/crmShared/CrmProjectAddressEnvelope';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
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
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';
export type CrmProjectTableRowDeleteLabels = {
  readonly action: string;
  readonly actionAriaLabel: (name: string) => string;
};

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
  onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  onRequestMarkInactive?: (project: CrmProjectSummary) => void;
  onRequestMarkActive?: (project: CrmProjectSummary) => void | Promise<void>;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  isWorkflowProgressLoading?: boolean;
  bulkSelection?: BulkSelectionBindings;
  onContactCopied?: (message: string) => void;
  showParentProjectColumn?: boolean;
  parentProjectName?: string;
  progressTone?: 'success' | 'progress';
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
  onRequestCompletionChange,
  onRequestMarkInactive,
  onRequestMarkActive,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  bulkSelection,
  onContactCopied,
  showParentProjectColumn = false,
  parentProjectName,
  progressTone = 'success',
}: CrmProjectTableRowProps): ReactElement {
  const tableCopy = content.crm.table;
  const { catalog, industrySubtitle, progress, derivedStageSlug } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading
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
  const formattedAddress = formatCrmProjectAddressLine(project.address);
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
        <span className={styles.projectNameRow}>
          {isInactive ? (
            <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
          ) : isProjectPriorityUrgent(project.priority) ? (
            <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
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
            >
              <span className={styles.projectName}>{project.name}</span>
            </ProjectPreviewNameAnchor>
          </span>
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
        {industrySubtitle ? <span className={styles.projectMeta}>{industrySubtitle}</span> : null}
        {!isMemberRole ? (
          <span className={styles.projectProgressRow}>
            {isInactive ? (
              <CrmProjectInactiveInlineLabel project={project} />
            ) : (
              <>
                {progress != null ? (
                  <ProjectProgressPercent
                    variant="compact"
                    progress={progress}
                    tone={progressTone}
                  />
                ) : null}
                {derivedStageSlug != null ? (
                  <span className={`${shared.stagePill} ${styles.projectMetaStagePill}`}>
                    {formatStageLabel(derivedStageSlug, catalog)}
                  </span>
                ) : null}
              </>
            )}
          </span>
        ) : null}
      </span>
      {showParentProjectColumn ? (
        <span
          className={`${styles.gridCell} ${styles.gridCellParentProject} ${styles.gridCellAlignCenter}`}
          role="cell"
          title={parentProjectName ?? undefined}
        >
          {parentProjectName ?? '—'}
        </span>
      ) : null}
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        {project.contact.name}
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
        />
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={formattedAddress ?? undefined}
      >
        <CrmProjectAddressEnvelope address={project.address} />
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={project.notesPreview ?? undefined}
      >
        <span className={styles.gridCellWrap}>{project.notesPreview ?? '—'}</span>
      </span>
      {!isMemberRole ? (
        <>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={displayValueLabel}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.valueCents)}
          </span>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={valueLabels.collected}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.collectedCents)}
          </span>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={valueLabels.balance}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.balanceCents)}
          </span>
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
            onRequestCompletionChange={onRequestCompletionChange}
            onRequestMarkInactive={onRequestMarkInactive}
            onRequestMarkActive={onRequestMarkActive}
          />
        </span>
      ) : null}
    </div>
  );
}
