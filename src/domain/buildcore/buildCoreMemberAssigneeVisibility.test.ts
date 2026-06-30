import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isBuildCoreMemberAssigneeVisibleToViewer,
  shouldHideEmptyStageGroups,
} from '@/domain/buildcore/buildCoreMemberAssigneeVisibility';
import { defaultBuildCoreRolePermissionFlags } from '@/domain/buildcore/workflowTaskPermissions';
import {
  filterWorkflowTasksForBuildCoreMember,
  isOpsWorkflowTaskVisibleToBuildCoreMember,
  isPaymentWorkflowTaskVisibleToBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import type { CrmWorkflowTask } from '@/domain/crm';

const viewerUserId = 'viewer-1';
const otherMemberId = 'member-2';

function memberRef(id: string): CrmWorkflowTask['assignedTo'] {
  return {
    id,
    displayName: 'Assignee',
    initials: 'A',
    avatarUrl: null,
    email: null,
  };
}

function opsTask(assigneeId: string | null, id = 'task-1'): CrmWorkflowTask {
  return {
    id,
    title: 'Ops task',
    stageSlug: 'new_lead',
    status: 'pending',
    sortOrder: 0,
    documentsRequired: false,
    assignedTo: assigneeId != null ? memberRef(assigneeId) : null,
    completedBy: null,
    amountCents: null,
    dueAt: null,
    notes: null,
    paidAt: null,
    invoicedAt: null,
    completedAt: null,
    customFields: {},
  };
}

function paymentTask(assigneeId: string | null, id = 'payment-1'): CrmWorkflowTask {
  return {
    ...opsTask(assigneeId, id),
    title: 'Deposit',
    amountCents: 10000,
  };
}

describe('isBuildCoreMemberAssigneeVisibleToViewer', () => {
  it('shows only self-assigned tasks when onlyAssignedUserCanView is enabled', () => {
    const input = {
      assigneeMemberId: viewerUserId,
      viewerUserId,
      onlyAssignedUserCanView: true,
      memberRoleUserIds: [viewerUserId, otherMemberId],
    };
    assert.equal(isBuildCoreMemberAssigneeVisibleToViewer(input), true);
    assert.equal(
      isBuildCoreMemberAssigneeVisibleToViewer({ ...input, assigneeMemberId: otherMemberId }),
      false
    );
  });

  it('shows any member-role assignee when onlyAssignedUserCanView is disabled', () => {
    const input = {
      assigneeMemberId: otherMemberId,
      viewerUserId,
      onlyAssignedUserCanView: false,
      memberRoleUserIds: [viewerUserId, otherMemberId],
    };
    assert.equal(isBuildCoreMemberAssigneeVisibleToViewer(input), true);
    assert.equal(
      isBuildCoreMemberAssigneeVisibleToViewer({ ...input, assigneeMemberId: 'admin-1' }),
      false
    );
  });
});

describe('View All Stages defaults', () => {
  it('defaults member to off and admin/coordinator to on', () => {
    assert.equal(defaultBuildCoreRolePermissionFlags('member').canViewAllStages, false);
    assert.equal(defaultBuildCoreRolePermissionFlags('admin').canViewAllStages, true);
    assert.equal(defaultBuildCoreRolePermissionFlags('coordinator').canViewAllStages, true);
  });
});

describe('shouldHideEmptyStageGroups', () => {
  it('hides empty stages when View All Stages is off', () => {
    assert.equal(shouldHideEmptyStageGroups({ canViewAllStages: false }), true);
    assert.equal(shouldHideEmptyStageGroups({ canViewAllStages: true }), false);
  });
});

describe('workflow and payment member visibility filters', () => {
  const memberRoleUserIds = [viewerUserId, otherMemberId];

  it('filters ops tasks using workflow visibility setting', () => {
    const task = opsTask(otherMemberId);
    assert.equal(
      isOpsWorkflowTaskVisibleToBuildCoreMember(task, {
        viewerUserId,
        onlyAssignedUserCanView: true,
        memberRoleUserIds,
      }),
      false
    );
    assert.equal(
      isOpsWorkflowTaskVisibleToBuildCoreMember(task, {
        viewerUserId,
        onlyAssignedUserCanView: false,
        memberRoleUserIds,
      }),
      true
    );
  });

  it('filters payment milestones using payment visibility setting', () => {
    const task = paymentTask(otherMemberId);
    assert.equal(
      isPaymentWorkflowTaskVisibleToBuildCoreMember(task, {
        viewerUserId,
        onlyAssignedUserCanView: true,
        onlyAssignedUserCanViewPayments: true,
        memberRoleUserIds,
      }),
      false
    );
    assert.equal(
      isPaymentWorkflowTaskVisibleToBuildCoreMember(task, {
        viewerUserId,
        onlyAssignedUserCanView: false,
        onlyAssignedUserCanViewPayments: false,
        memberRoleUserIds,
      }),
      true
    );
  });

  it('uses independent workflow and payment visibility flags in filterWorkflowTasksForBuildCoreMember', () => {
    const tasks = [
      opsTask(otherMemberId, 'ops-other'),
      paymentTask(otherMemberId, 'payment-other'),
      paymentTask(viewerUserId, 'payment-self'),
    ];
    const visible = filterWorkflowTasksForBuildCoreMember(tasks, {
      viewerUserId,
      onlyAssignedUserCanView: true,
      onlyAssignedUserCanViewPayments: false,
      memberRoleUserIds,
      includePaymentsAssignedToViewer: true,
    });
    assert.deepEqual(
      visible.map((task) => task.id),
      ['payment-other', 'payment-self']
    );
  });
});
