'use client';

import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import { initialsFromPersonName } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import projectDetailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CommunicationRecipientPicker.module.css';

export type CommunicationRecipientPickerProps = {
  readonly recipientOptions: readonly CommunicationRecipientOption[];
  readonly selectedRecipient: CommunicationRecipientOption | null;
  readonly disabled?: boolean;
  readonly onRecipientChange: (recipientId: string) => void;
};

function recipientOptionToTeamMemberRef(
  option: CommunicationRecipientOption
): CrmTeamMemberRef {
  return {
    id: option.memberId ?? option.contactId ?? option.id,
    displayName: option.name,
    initials: initialsFromPersonName(option.name),
    avatarUrl: option.avatarUrl ?? null,
    email: option.email,
  };
}

export function CommunicationRecipientPicker({
  recipientOptions,
  selectedRecipient,
  disabled = false,
  onRecipientChange,
}: CommunicationRecipientPickerProps): ReactElement {
  const copy = content.projectDetail.communications.sendAttachment;
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const groupedOptions = useMemo(() => {
    const customer = recipientOptions.filter((option) => option.type === 'customer');
    const members = recipientOptions.filter((option) => option.type === 'member');
    return { customer, members };
  }, [recipientOptions]);

  const canOpen = !disabled && recipientOptions.length > 0;
  const memberRef =
    selectedRecipient != null ? recipientOptionToTeamMemberRef(selectedRecipient) : null;

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div ref={anchorRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        disabled={!canOpen}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label={copy.recipientPickerAriaLabel}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!canOpen) return;
          setMenuOpen((open) => !open);
        }}
      >
        {memberRef != null ? (
          <span className={styles.triggerAvatar}>
            <TeamMemberAvatar member={memberRef} />
          </span>
        ) : null}
        <span className={styles.triggerText}>
          {selectedRecipient != null ? (
            <>
              <span className={styles.triggerName}>{selectedRecipient.name}</span>
              <span className={styles.triggerEmail}> ({selectedRecipient.email})</span>
            </>
          ) : (
            <span className={styles.triggerPlaceholder}>{copy.recipientPickerPlaceholder}</span>
          )}
        </span>
        {recipientOptions.length > 0 ? (
          <span className={styles.triggerChevron} aria-hidden>
            ▼
          </span>
        ) : null}
      </button>

      <WorkflowInlineMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="start"
        sizeToContent
        portalClassName={styles.menuPortal}
      >
        <div className={styles.menu} role="listbox" aria-label={copy.recipientPickerAriaLabel}>
          {groupedOptions.customer.length > 0 ? (
            <div className={styles.group} role="group" aria-label={copy.recipientGroupCustomer}>
              <div className={styles.groupLabel}>{copy.recipientGroupCustomer}</div>
              {groupedOptions.customer.map((option) => (
                <RecipientMenuOption
                  key={option.id}
                  option={option}
                  selected={selectedRecipient?.id === option.id}
                  onSelect={() => {
                    onRecipientChange(option.id);
                    setMenuOpen(false);
                  }}
                />
              ))}
            </div>
          ) : null}
          {groupedOptions.members.length > 0 ? (
            <div className={styles.group} role="group" aria-label={copy.recipientGroupMembers}>
              <div className={styles.groupLabel}>{copy.recipientGroupMembers}</div>
              {groupedOptions.members.map((option) => (
                <RecipientMenuOption
                  key={option.id}
                  option={option}
                  selected={selectedRecipient?.id === option.id}
                  onSelect={() => {
                    onRecipientChange(option.id);
                    setMenuOpen(false);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}

type RecipientMenuOptionProps = {
  readonly option: CommunicationRecipientOption;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

function RecipientMenuOption({
  option,
  selected,
  onSelect,
}: RecipientMenuOptionProps): ReactElement {
  const memberRef = recipientOptionToTeamMemberRef(option);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={[
        projectDetailStyles.inlineMenuAction,
        shared.assigneeMenuAction,
        styles.menuOption,
        selected ? styles.menuOption_selected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
    >
      <span className={shared.assigneeMenuRow}>
        <span className={shared.assigneeMenuAvatar}>
          <TeamMemberAvatar member={memberRef} />
        </span>
        <span className={styles.menuOptionText}>
          <span className={styles.menuOptionName}>{option.name}</span>
          <span className={styles.menuOptionEmail}>{option.email}</span>
        </span>
      </span>
    </button>
  );
}
