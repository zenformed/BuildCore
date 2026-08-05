import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareCrmProjectsForListSort } from '../projectPriorityToggle';
import { emptyCrmProjectAddress } from '../projectAddress';
import { computeCrmProjectListSortBucket } from './listSortBucket';
import type { CrmProjectSummary } from '../project';

function row(
  id: string,
  lastUpdatedAt: string,
  bucketFields: {
    subprojectStatus: CrmProjectSummary['subprojectStatus'];
    priority: CrmProjectSummary['priority'];
    completedAt: string | null;
  }
): CrmProjectSummary {
  return {
    id,
    slug: id,
    parentProjectId: null,
    name: id,
    industry: 'general-contractor',
    customIndustry: null,
    contact: {
      id: 'c',
      name: 'n',
      email: '',
      phone: '',
      emails: [],
      phones: [],
      title: null,
    },
    client: { id: 'cl', name: 'cl', segment: null },
    address: emptyCrmProjectAddress(),
    priority: bucketFields.priority,
    currentStageSlug: 'lead',
    notesPreview: null,
    dealValueCents: 0,
    balanceRemainingCents: 0,
    assignedTo: null,
    lastUpdatedAt,
    completedAt: bucketFields.completedAt,
    completedBy: null,
    primaryPhotoPath: null,
    latitude: null,
    longitude: null,
    leadToken: 'token',
    subprojectStatus: bucketFields.subprojectStatus,
    inactiveReason: null,
    inactiveReasonCustom: null,
    inactiveAt: null,
    inactiveBy: null,
    customFields: {},
  };
}

describe('operational sort tie-break', () => {
  it('orders same-bucket rows by lastUpdatedAt DESC; v2 adds id DESC', () => {
    const newer = row('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2024-02-01T00:00:00.000Z', {
      subprojectStatus: 'normal',
      priority: 'normal',
      completedAt: null,
    });
    const older = row('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2024-01-01T00:00:00.000Z', {
      subprojectStatus: 'normal',
      priority: 'normal',
      completedAt: null,
    });
    assert.equal(computeCrmProjectListSortBucket(newer), computeCrmProjectListSortBucket(older));
    assert.ok(compareCrmProjectsForListSort(newer, older) < 0);

    const sameTsA = row('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2024-01-01T00:00:00.000Z', {
      subprojectStatus: 'normal',
      priority: 'normal',
      completedAt: null,
    });
    const sameTsB = row('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2024-01-01T00:00:00.000Z', {
      subprojectStatus: 'normal',
      priority: 'normal',
      completedAt: null,
    });
    // Legacy client comparator does not tie-break by id (returns 0).
    assert.equal(compareCrmProjectsForListSort(sameTsA, sameTsB), 0);
    const v2Order = [sameTsA, sameTsB].sort((a, b) => {
      const bucketDiff =
        computeCrmProjectListSortBucket(a) - computeCrmProjectListSortBucket(b);
      if (bucketDiff !== 0) return bucketDiff;
      const t = Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt);
      if (t !== 0) return t;
      return b.id.localeCompare(a.id);
    });
    assert.equal(v2Order[0]?.id, sameTsB.id);
  });

  it('documents null activity as a SQL NULLS LAST concern', () => {
    const withActivity = row('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2024-01-01T00:00:00.000Z', {
      subprojectStatus: 'normal',
      priority: 'normal',
      completedAt: null,
    });
    assert.equal(computeCrmProjectListSortBucket(withActivity), 1);
    assert.ok(Number.isFinite(Date.parse(withActivity.lastUpdatedAt)));
  });
});
