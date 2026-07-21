import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterCrmMyTasksByAssigneeScope,
  formatCrmMyTaskContextLine,
  groupCrmMyTasksByParentProject,
  isCrmMyTaskAssigneeFilterAvailable,
  parseCrmMyTaskAssigneeScope,
  type CrmMyTaskAssignment,
} from '@/domain/crm/myTaskAssignment';
import {
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import type { CrmWorkflowTask } from '@/domain/crm';
import { emptyCrmProjectAddress } from '@/domain/crm/projectAddress';

const viewerUserId = 'viewer-1';
const otherMemberId = 'member-2';

function memberRef(id: string) {
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
    stageSlug: 'estimate-sent',
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
    stageSlug: 'payments',
  };
}

function assignment(
  overrides: Partial<CrmMyTaskAssignment> & Pick<CrmMyTaskAssignment, 'taskId' | 'title' | 'parentProjectId'>
): CrmMyTaskAssignment {
  return {
    kind: 'workflow',
    notes: null,
    status: 'pending',
    dueAt: null,
    stageSlug: 'estimate-sent',
    documentsRequired: false,
    amountCents: null,
    invoicedAt: null,
    paidAt: null,
    assignedTo: memberRef(viewerUserId),
    parentProjectSlug: 'parent',
    parentProjectName: 'Zenformed LLC',
    subprojectId: null,
    subprojectSlug: null,
    subprojectName: null,
    projectId: overrides.parentProjectId,
    projectSlug: 'parent',
    contact: {
      id: 'c1',
      name: 'Contact',
      email: 'a@b.com',
      phone: '',
      emails: ['a@b.com'],
      phones: [],
      title: null,
    },
    clientName: 'Client',
    address: emptyCrmProjectAddress(),
    latitude: null,
    longitude: null,
    projectInactive: false,
    documents: [],
    ...overrides,
  };
}

describe('myTaskAssignment helpers', () => {
  it('formats parent workflow context as Project - Stage', () => {
    assert.equal(
      formatCrmMyTaskContextLine(
        { kind: 'workflow', subprojectId: null, subprojectName: null },
        {
          projectLabel: 'Project',
          subprojectLabel: 'Subproject',
          paymentLabel: 'Payment',
          stageLabel: 'Estimate Sent',
        }
      ),
      'Project - Estimate Sent'
    );
  });

  it('formats subproject payment context as Subproject - Payment', () => {
    assert.equal(
      formatCrmMyTaskContextLine(
        { kind: 'payment', subprojectId: 'sub-1', subprojectName: 'Unit 1' },
        {
          projectLabel: 'Project',
          subprojectLabel: 'Subproject',
          paymentLabel: 'Payment',
          stageLabel: 'Photo Stage',
        }
      ),
      'Subproject - Payment'
    );
  });

  it('groups by parent and drops empty groups', () => {
    const groups = groupCrmMyTasksByParentProject([
      assignment({
        taskId: 't1',
        title: 'B task',
        parentProjectId: 'p2',
        parentProjectName: 'Beta Co',
      }),
      assignment({
        taskId: 't2',
        title: 'A task',
        parentProjectId: 'p1',
        parentProjectName: 'Alpha Co',
      }),
      assignment({
        taskId: 't3',
        title: 'C task',
        parentProjectId: 'p1',
        parentProjectName: 'Alpha Co',
      }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.parentProjectName, 'Alpha Co');
    assert.equal(groups[0]?.tasks.length, 2);
    assert.equal(groups[1]?.parentProjectName, 'Beta Co');
  });

  it('filters mine / others / everyone', () => {
    const tasks = [
      assignment({
        taskId: 'mine',
        title: 'Mine',
        parentProjectId: 'p1',
        assignedTo: memberRef(viewerUserId),
      }),
      assignment({
        taskId: 'other',
        title: 'Other',
        parentProjectId: 'p1',
        assignedTo: memberRef(otherMemberId),
      }),
    ];
    assert.equal(filterCrmMyTasksByAssigneeScope(tasks, 'mine', viewerUserId).length, 1);
    assert.equal(filterCrmMyTasksByAssigneeScope(tasks, 'others', viewerUserId).length, 1);
    assert.equal(filterCrmMyTasksByAssigneeScope(tasks, 'everyone', viewerUserId).length, 2);
  });

  it('shows assignee filter only when other-member visibility is enabled', () => {
    assert.equal(
      isCrmMyTaskAssigneeFilterAvailable({
        onlyAssignedUserCanView: true,
        onlyAssignedUserCanViewPayments: true,
      }),
      false
    );
    assert.equal(
      isCrmMyTaskAssigneeFilterAvailable({
        onlyAssignedUserCanView: false,
        onlyAssignedUserCanViewPayments: true,
      }),
      true
    );
    assert.equal(
      isCrmMyTaskAssigneeFilterAvailable({
        onlyAssignedUserCanView: true,
        onlyAssignedUserCanViewPayments: false,
      }),
      true
    );
  });

  it('parses assignee scope safely', () => {
    assert.equal(parseCrmMyTaskAssigneeScope('others'), 'others');
    assert.equal(parseCrmMyTaskAssigneeScope('nope'), 'mine');
  });
});

describe('Member my-tasks visibility (workflow + payments)', () => {
  const baseInput = {
    viewerUserId,
    onlyAssignedUserCanView: true,
    onlyAssignedUserCanViewPayments: true,
    memberRoleUserIds: [viewerUserId, otherMemberId],
    includePaymentsAssignedToViewer: true,
  };

  it('includes self-assigned ops and payment tasks when only-assigned is on', () => {
    const visible = filterWorkflowTasksForBuildCoreMember(
      [opsTask(viewerUserId, 'o1'), paymentTask(viewerUserId, 'p1'), opsTask(otherMemberId, 'o2')],
      baseInput
    );
    assert.deepEqual(
      visible.map((t) => t.id).sort(),
      ['o1', 'p1']
    );
  });

  it('includes other members ops when workflow only-assigned is off', () => {
    const visible = filterWorkflowTasksForBuildCoreMember(
      [opsTask(viewerUserId, 'o1'), opsTask(otherMemberId, 'o2'), paymentTask(otherMemberId, 'p1')],
      {
        ...baseInput,
        onlyAssignedUserCanView: false,
        onlyAssignedUserCanViewPayments: true,
      }
    );
    assert.deepEqual(
      visible.map((t) => t.id).sort(),
      ['o1', 'o2']
    );
  });

  it('includes other members payments when payment only-assigned is off and canView payments', () => {
    const visible = filterWorkflowTasksForBuildCoreMember(
      [paymentTask(viewerUserId, 'p1'), paymentTask(otherMemberId, 'p2')],
      {
        ...baseInput,
        onlyAssignedUserCanViewPayments: false,
        includePaymentsAssignedToViewer: true,
      }
    );
    assert.deepEqual(
      visible.map((t) => t.id).sort(),
      ['p1', 'p2']
    );
  });

  it('excludes payments when payment canView is false', () => {
    const visible = filterWorkflowTasksForBuildCoreMember(
      [opsTask(viewerUserId, 'o1'), paymentTask(viewerUserId, 'p1')],
      {
        ...baseInput,
        includePaymentsAssignedToViewer: false,
      }
    );
    assert.deepEqual(
      visible.map((t) => t.id),
      ['o1']
    );
  });

  it('never includes unassigned tasks for members', () => {
    const visible = filterWorkflowTasksForBuildCoreMember(
      [opsTask(null, 'u1'), paymentTask(null, 'u2')],
      {
        ...baseInput,
        onlyAssignedUserCanView: false,
        onlyAssignedUserCanViewPayments: false,
      }
    );
    assert.equal(visible.length, 0);
  });
});
