'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import type { CrmMyTaskAssigneeScope, CrmMyTaskAssignment } from '@/domain/crm/myTaskAssignment';
import { groupCrmMyTasksByParentProject } from '@/domain/crm/myTaskAssignment';
import type { WorkflowTaskStatus } from '@/domain/crm';
import {
  buildCrmProjectMapsSearchUrl,
  formatCrmProjectAddressLine,
} from '@/domain/crm/projectAddress';
import { extractUsPhoneDigits } from '@/domain/crm/phoneFormat';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { formatShortDate } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  formatContactEmailDisplay,
  formatPhoneDisplay,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { fetchCrmMyTasks } from '@/presentation/features/memberTasks/fetchCrmMyTasks';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { WorkflowTableStatusRefresh } from '@/presentation/components/CrmProjectDetail/WorkflowTableStatusRefresh';
import { useCellHoverPreview } from '@/presentation/components/CrmProjectDetail/useCellHoverPreview';
import { PreviewMetaColumn } from '@/presentation/components/CrmProjects/projectDetailsPreviewShared';
import panelStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import previewStyles from '@/presentation/components/CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import styles from './MemberMyTasks.module.css';

function notesDisplay(notes: string | null): string {
  const trimmed = notes?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : '-';
}

function taskMatchesSearch(task: CrmMyTaskAssignment, query: string): boolean {
  if (!query) return true;
  const haystacks = [task.title, task.notes ?? '', task.parentProjectName];
  return haystacks.some((value) => value.toLowerCase().includes(query));
}

function taskMatchesStatusFilters(
  task: CrmMyTaskAssignment,
  statuses: readonly WorkflowTaskStatus[]
): boolean {
  if (statuses.length === 0) return true;
  return statuses.includes(task.status);
}

function displayOrDash(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

function stopPreviewLinkClick(event: MouseEvent<HTMLAnchorElement>): void {
  event.stopPropagation();
}

function PreviewContactLink({
  href,
  children,
  external = false,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly external?: boolean;
}): ReactElement {
  return (
    <a
      href={href}
      className={styles.taskProjectPreviewLink}
      onClick={stopPreviewLinkClick}
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {children}
    </a>
  );
}

function MemberMyTaskProjectPreviewIcon({
  projectName,
  task,
}: {
  readonly projectName: string;
  readonly task: CrmMyTaskAssignment;
}): ReactElement {
  const copy = content.crm.myTasks;
  const resolvedProjectName = displayOrDash(projectName);
  const contactName = displayOrDash(task.contact.name.trim() || task.clientName);

  const rawEmail = task.contact.email.trim();
  const emailDisplay = displayOrDash(formatContactEmailDisplay(rawEmail));
  const emailHref = rawEmail.length > 0 ? `mailto:${encodeURIComponent(rawEmail)}` : null;

  const rawPhone = task.contact.phone.trim();
  const phoneDisplay = displayOrDash(formatPhoneDisplay(rawPhone));
  const phoneDigits = extractUsPhoneDigits(rawPhone);
  const phoneHref = phoneDigits.length > 0 ? `tel:+1${phoneDigits}` : null;

  const addressDisplay = displayOrDash(formatCrmProjectAddressLine(task.address) ?? '');
  const addressHref = buildCrmProjectMapsSearchUrl(task.address);

  const preview = useCellHoverPreview({
    ariaLabel: copy.projectPreviewAriaLabel(resolvedProjectName),
    panelClassName: styles.taskProjectPreviewPanel,
    portalClassName: `${detailStyles.inlineMenu_portal} ${detailStyles.cellHoverPreview_portal} ${styles.taskProjectPreviewPortal}`,
    children: (
      <div className={styles.taskProjectPreview}>
        <PreviewMetaColumn
          label={copy.projectNameLabel}
          labelPosition="above"
          align="start"
          value={resolvedProjectName}
        />
        <div className={styles.taskProjectPreviewMetaRow}>
          <PreviewMetaColumn
            label={copy.contactLabel}
            labelPosition="above"
            align="start"
            value={contactName}
          />
          <PreviewMetaColumn
            label={copy.addressLabel}
            labelPosition="above"
            align="end"
            value={
              addressHref != null ? (
                <PreviewContactLink href={addressHref} external>
                  {addressDisplay}
                </PreviewContactLink>
              ) : (
                addressDisplay
              )
            }
          />
        </div>
        <div className={styles.taskProjectPreviewMetaRow}>
          <PreviewMetaColumn
            label={copy.phoneLabel}
            labelPosition="above"
            align="start"
            value={
              phoneHref != null ? (
                <PreviewContactLink href={phoneHref}>{phoneDisplay}</PreviewContactLink>
              ) : (
                phoneDisplay
              )
            }
          />
          <PreviewMetaColumn
            label={copy.emailLabel}
            labelPosition="above"
            align="end"
            value={
              emailHref != null ? (
                <PreviewContactLink href={emailHref}>{emailDisplay}</PreviewContactLink>
              ) : (
                emailDisplay
              )
            }
          />
        </div>
      </div>
    ),
  });

  return (
    <>
      <span
        ref={preview.anchorRef as RefObject<HTMLSpanElement>}
        className={styles.projectPreviewTrigger}
        tabIndex={0}
        aria-label={copy.projectPreviewAriaLabel(resolvedProjectName)}
        {...preview.anchorHandlers}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <span className={previewStyles.previewCardIcon} aria-hidden />
      </span>
      {preview.menu}
    </>
  );
}

function MemberMyTaskSimpleRow({
  task,
  onOpen,
}: {
  readonly task: CrmMyTaskAssignment;
  readonly onOpen: () => void;
}): ReactElement {
  const copy = content.crm.myTasks;
  const dueDisplay = task.dueAt ? formatShortDate(task.dueAt) : '—';

  return (
    <button
      type="button"
      className={styles.taskRow}
      aria-label={copy.openTaskAriaLabel(task.title)}
      onClick={onOpen}
    >
      <div className={styles.taskRowTop}>
        <span className={styles.taskTitle}>{task.title}</span>
        <span className={styles.taskDue}>{dueDisplay}</span>
      </div>
      <p className={styles.taskNotes}>{notesDisplay(task.notes)}</p>
    </button>
  );
}

function MemberMyTasksProjectGroup({
  parentProjectId,
  parentProjectName,
  parentProjectSlug,
  tasks,
  expanded,
  onToggle,
  onOpenProject,
}: {
  readonly parentProjectId: string;
  readonly parentProjectName: string;
  readonly parentProjectSlug: string;
  readonly tasks: readonly CrmMyTaskAssignment[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onOpenProject: (slug: string) => void;
}): ReactElement {
  const copy = content.crm.myTasks;
  const panelId = useId();
  const contactSource = tasks.find((task) => task.subprojectId == null) ?? tasks[0];

  const onHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <section className={styles.projectGroup} aria-labelledby={`my-tasks-group-${parentProjectId}`}>
      <div
        className={styles.projectGroupToggle}
        id={`my-tasks-group-${parentProjectId}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={
          expanded
            ? copy.collapseProjectTasks(parentProjectName)
            : copy.expandProjectTasks(parentProjectName)
        }
        onClick={onToggle}
        onKeyDown={onHeaderKeyDown}
      >
        <span className={styles.projectGroupLead}>
          {contactSource ? (
            <MemberMyTaskProjectPreviewIcon projectName={parentProjectName} task={contactSource} />
          ) : null}
          <span className={styles.projectGroupName}>{parentProjectName}</span>
          <span className={styles.projectGroupChevronWrap} aria-hidden>
            <span
              className={expanded ? styles.projectGroupChevron_expanded : styles.projectGroupChevron}
            />
          </span>
        </span>
        <span className={styles.projectGroupCount}>{copy.taskCountLabel(tasks.length)}</span>
      </div>
      {expanded ? (
        <div id={panelId} className={styles.taskList}>
          {tasks.map((task) => (
            <MemberMyTaskSimpleRow
              key={task.taskId}
              task={task}
              onOpen={() => onOpenProject(task.parentProjectSlug || parentProjectSlug)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MemberMyTasksDashboard(): ReactElement {
  const copy = content.crm.myTasks;
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const [assigneeScope, setAssigneeScope] = useState<CrmMyTaskAssigneeScope>('mine');
  const [tasks, setTasks] = useState<readonly CrmMyTaskAssignment[]>([]);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const load = useCallback(
    async (scope: CrmMyTaskAssigneeScope, options?: { readonly silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      setError(null);
      try {
        const response = await fetchCrmMyTasks(scope);
        setTasks(response.tasks);
        setFilterAvailable(response.assigneeFilter.available);
        if (!response.assigneeFilter.available && scope !== 'mine') {
          setAssigneeScope('mine');
        }
      } catch {
        setError(copy.loadFailed);
        if (!options?.silent) setTasks([]);
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [copy.loadFailed]
  );

  useEffect(() => {
    void load(assigneeScope);
  }, [assigneeScope, load]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter(
      (task) =>
        taskMatchesSearch(task, query) &&
        taskMatchesStatusFilters(task, filters.workflowTaskStatuses)
    );
  }, [filters.workflowTaskStatuses, searchQuery, tasks]);

  const groups = useMemo(() => groupCrmMyTasksByParentProject(filteredTasks), [filteredTasks]);

  const openParentProject = (parentProjectSlug: string) => {
    router.push(nav.routes.projectDetail(parentProjectSlug));
  };

  const toggleProject = (parentProjectId: string) => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentProjectId)) {
        next.delete(parentProjectId);
      } else {
        next.add(parentProjectId);
      }
      return next;
    });
  };

  const refreshTasks = useCallback(
    () => load(assigneeScope, { silent: true }),
    [assigneeScope, load]
  );

  const assigneeScopeOptions = useMemo(
    () =>
      filterAvailable
        ? ([
            { value: 'mine', label: copy.assigneeScopeMine },
            { value: 'others', label: copy.assigneeScopeOthers },
            { value: 'everyone', label: copy.assigneeScopeEveryone },
          ] as const)
        : [],
    [copy.assigneeScopeEveryone, copy.assigneeScopeMine, copy.assigneeScopeOthers, filterAvailable]
  );

  return (
    <section
      className={panelStyles.projectsPanel}
      aria-labelledby="member-my-tasks-title"
      data-member-my-tasks-dashboard
    >
      <div className={panelStyles.projectsPanelHeader}>
        <div className={`${panelStyles.projectsPanelTitleRow} ${styles.headerTitleRow}`}>
          <h1 id="member-my-tasks-title" className={panelStyles.projectsPanelTitle}>
            {copy.title}
          </h1>
          <div className={styles.headerLeadControls}>
            <CrmProjectsFilterMenu
              filters={filters}
              onChange={setFilters}
              sections={['status']}
              triggerVariant="caret"
              menuAlign="start"
              assigneeScope={filterAvailable ? assigneeScope : null}
              onAssigneeScopeChange={
                filterAvailable
                  ? (scope) => setAssigneeScope(scope as CrmMyTaskAssigneeScope)
                  : undefined
              }
              assigneeScopeOptions={assigneeScopeOptions}
              assigneeScopeLabel={copy.assigneeFilterAriaLabel}
              assigneeScopeDefault="mine"
            />
            <WorkflowTableStatusRefresh
              onRefresh={refreshTasks}
              onError={(message) => setError(message)}
            />
          </div>
        </div>
        <div className={panelStyles.projectsPanelHeaderTools}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAriaLabel}
            className={panelStyles.projectsSearch}
          />
        </div>
      </div>

      <div className={panelStyles.projectsPanelBody}>
        {loading ? <p className={detailStyles.subtitle}>{copy.loading}</p> : null}
        {error ? <p className={detailStyles.subtitle}>{error}</p> : null}

        {!loading && !error && groups.length === 0 ? (
          <p className={detailStyles.subtitle}>
            {searchQuery.trim() || filters.workflowTaskStatuses.length > 0
              ? copy.emptySearch
              : filterAvailable && assigneeScope !== 'mine'
                ? copy.emptyFiltered
                : copy.empty}
          </p>
        ) : null}

        {!loading && !error && groups.length > 0 ? (
          <div className={styles.myTasksGroups}>
            {groups.map((group) => (
              <MemberMyTasksProjectGroup
                key={group.parentProjectId}
                parentProjectId={group.parentProjectId}
                parentProjectName={group.parentProjectName}
                parentProjectSlug={group.parentProjectSlug}
                tasks={group.tasks}
                expanded={!collapsedProjectIds.has(group.parentProjectId)}
                onToggle={() => toggleProject(group.parentProjectId)}
                onOpenProject={openParentProject}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
