import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBuildCoreRolePermissionFlags } from '@/domain/buildcore/workflowTaskPermissions';
import { defaultBuildCoreRolePermissionFlagsForDomain } from '@/domain/buildcore/roleAccessPermissions';
import {
  sendAttachmentEntityPermissionDomain,
} from '@/infrastructure/crm/server/buildCoreSendFilesPermissionService';

describe('Send Files permission defaults', () => {
  it('enables Send Files for admin and coordinator', () => {
    assert.equal(defaultBuildCoreRolePermissionFlags('admin').canSendFiles, true);
    assert.equal(defaultBuildCoreRolePermissionFlags('coordinator').canSendFiles, true);
  });

  it('disables Send Files for member by default', () => {
    assert.equal(defaultBuildCoreRolePermissionFlags('member').canSendFiles, false);
  });

  it('keeps member upload enabled while Send Files stays off', () => {
    const member = defaultBuildCoreRolePermissionFlags('member');
    assert.equal(member.canUpload, true);
    assert.equal(member.canSendFiles, false);
  });

  it('applies member Send Files default across payment and budget domains', () => {
    for (const domain of ['payments', 'budget'] as const) {
      const member = defaultBuildCoreRolePermissionFlagsForDomain(domain, 'member');
      assert.equal(member.canSendFiles, false);
      assert.equal(member.canUpload, true);
    }
  });
});

describe('sendAttachmentEntityPermissionDomain', () => {
  it('maps task/payment/budget entities to permission domains', () => {
    assert.equal(sendAttachmentEntityPermissionDomain('workflow_task'), 'workflow_tasks');
    assert.equal(sendAttachmentEntityPermissionDomain('payment'), 'payments');
    assert.equal(sendAttachmentEntityPermissionDomain('budget_entry'), 'budget');
  });

  it('returns null for CRM project/subproject sends', () => {
    assert.equal(sendAttachmentEntityPermissionDomain('project'), null);
    assert.equal(sendAttachmentEntityPermissionDomain('subproject'), null);
  });
});
