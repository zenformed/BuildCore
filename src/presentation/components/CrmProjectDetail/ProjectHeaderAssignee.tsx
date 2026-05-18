'use client';

import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { useAuth } from '@/presentation/hooks/useAuth';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type ProjectHeaderAssigneeProps = {
  assignedTo: CrmTeamMemberRef | null;
  isApiSource: boolean;
  isSaving: boolean;
  onAssigneeChange: (assignedMemberId: string) => Promise<boolean>;
};

export function ProjectHeaderAssignee({
  assignedTo,
  isApiSource,
  isSaving,
  onAssigneeChange,
}: ProjectHeaderAssigneeProps): ReactElement {
  const fields = content.projectDetail.fields;
  const wf = content.projectDetail.workflow;
  const { user } = useAuth();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const assigneeOptions = getWorkflowTaskAssigneeOptions(isApiSource, user?.id, user?.email);

  const saveAssignee = useCallback(
    async (assignedMemberId: string) => {
      setMenuOpen(false);
      const current = assignedTo?.id ?? '';
      if (assignedMemberId === current) return;
      await onAssigneeChange(assignedMemberId);
    },
    [assignedTo?.id, onAssigneeChange]
  );

  return (
    <div
      className={`${styles.headerAssigneeWrap}${isSaving ? ` ${styles.headerAssignee_saving}` : ''}`}
      ref={anchorRef}
    >
      <button
        type="button"
        className={styles.headerAssigneeBtn}
        disabled={isSaving}
        aria-expanded={menuOpen}
        aria-label={fields.assigned}
        title={assignedTo?.displayName ?? wf.unassigned}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {assignedTo ? (
          <TeamMemberAvatar member={assignedTo} />
        ) : (
          <span
            className={`${shared.avatar} ${shared.avatarUnassigned}`}
            aria-label={wf.unassigned}
          >
            —
          </span>
        )}
      </button>
      <WorkflowInlineMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="end"
        portalClassName={styles.summaryInlineMenu}
      >
        {assigneeOptions.map((option) => (
          <button
            key={option.id || 'unassigned'}
            type="button"
            className={styles.inlineMenuAction}
            disabled={isSaving}
            onClick={() => void saveAssignee(option.id)}
          >
            {option.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}

