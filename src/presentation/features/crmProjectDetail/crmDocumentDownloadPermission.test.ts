import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBuildCoreRolePermissionFlags } from '@/domain/buildcore/workflowTaskPermissions';
import { defaultBuildCoreRolePermissionFlagsForDomain } from '@/domain/buildcore/roleAccessPermissions';
import { resolveCrmDocumentDownloadPermissionDomain } from '@/presentation/features/crmProjectDetail/crmDocumentDownloadPermission';

describe('Download permission defaults', () => {
  it('enables Download for admin, coordinator, and member', () => {
    assert.equal(defaultBuildCoreRolePermissionFlags('admin').canDownload, true);
    assert.equal(defaultBuildCoreRolePermissionFlags('coordinator').canDownload, true);
    assert.equal(defaultBuildCoreRolePermissionFlags('member').canDownload, true);
  });

  it('keeps Download independent from Upload and Send Files for member', () => {
    const member = defaultBuildCoreRolePermissionFlags('member');
    assert.equal(member.canUpload, true);
    assert.equal(member.canDownload, true);
    assert.equal(member.canSendFiles, false);
  });

  it('applies member Download default across payment and budget domains', () => {
    for (const domain of ['payments', 'budget'] as const) {
      const member = defaultBuildCoreRolePermissionFlagsForDomain(domain, 'member');
      assert.equal(member.canDownload, true);
    }
  });
});

describe('resolveCrmDocumentDownloadPermissionDomain', () => {
  it('maps budget documents to budget domain', () => {
    assert.equal(
      resolveCrmDocumentDownloadPermissionDomain(
        { workflowTaskId: null, budgetEntryId: 'budget-1' },
        undefined
      ),
      'budget'
    );
  });

  it('maps payment task documents to payments domain', () => {
    assert.equal(
      resolveCrmDocumentDownloadPermissionDomain(
        { workflowTaskId: 'task-1', budgetEntryId: null },
        { amountCents: 1000 }
      ),
      'payments'
    );
  });

  it('maps workflow task documents to workflow_tasks domain', () => {
    assert.equal(
      resolveCrmDocumentDownloadPermissionDomain(
        { workflowTaskId: 'task-1', budgetEntryId: null },
        { amountCents: null }
      ),
      'workflow_tasks'
    );
  });

  it('returns null for project media documents', () => {
    assert.equal(
      resolveCrmDocumentDownloadPermissionDomain(
        { workflowTaskId: null, budgetEntryId: null },
        undefined
      ),
      null
    );
  });
});
