export type BuildCoreMemberAssigneeVisibilityInput = {
  readonly assigneeMemberId: string | null | undefined;
  readonly viewerUserId: string;
  readonly onlyAssignedUserCanView: boolean;
  readonly memberRoleUserIds: readonly string[];
};

/** Whether a member-role assignee's task/milestone is visible to the signed-in member viewer. */
export function isBuildCoreMemberAssigneeVisibleToViewer(
  input: BuildCoreMemberAssigneeVisibilityInput
): boolean {
  const assigneeId = input.assigneeMemberId?.trim();
  if (!assigneeId) return false;

  if (input.onlyAssignedUserCanView) {
    return assigneeId === input.viewerUserId;
  }

  return input.memberRoleUserIds.includes(assigneeId);
}

/** Hide empty pipeline stage sections when the viewer lacks View All Stages. */
export function shouldHideEmptyStageGroups(input: {
  readonly canViewAllStages: boolean;
}): boolean {
  return !input.canViewAllStages;
}
