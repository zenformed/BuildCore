import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterEligibleImportParentProjects,
  searchImportParentCandidates,
} from './spreadsheetImportParentSearch';
import type { CrmProjectSummary } from './project';
import { emptyCrmProjectAddress } from './projectAddress';

function makeProject(
  overrides: Partial<CrmProjectSummary> & Pick<CrmProjectSummary, 'id' | 'name'>
): CrmProjectSummary {
  return {
    slug: overrides.slug ?? overrides.id,
    parentProjectId: overrides.parentProjectId ?? null,
    industry: 'hvac',
    customIndustry: null,
    contact: {
      id: 'c1',
      name: 'Contact',
      email: '',
      phone: '',
      emails: [],
      phones: [],
      title: null,
    },
    client: {
      id: 'client-1',
      name: overrides.client?.name ?? 'Acme Client',
      segment: null,
    },
    address: overrides.address ?? {
      ...emptyCrmProjectAddress(),
      addressLine1: '100 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
    },
    priority: 'normal',
    currentStageSlug: 'lead',
    notesPreview: null,
    dealValueCents: 0,
    balanceRemainingCents: 0,
    assignedTo: null,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    completedBy: null,
    primaryPhotoPath: null,
    latitude: null,
    longitude: null,
    leadToken: 'token',
    status: overrides.status ?? 'active',
    lossReason: null,
    lossReasonOther: null,
    statusChangedAt: null,
    statusChangedBy: null,
    customFields: {},
    ...overrides,
  };
}

describe('spreadsheetImportParentSearch', () => {
  it('excludes subprojects and inactive projects from eligible candidates', () => {
    const root = makeProject({ id: 'root-1', name: 'Root A' });
    const inactive = makeProject({
      id: 'root-2',
      name: 'Inactive Root',
      status: 'lost',
    });
    const child = makeProject({
      id: 'child-1',
      name: 'Child',
      parentProjectId: 'root-1',
    });

    const eligible = filterEligibleImportParentProjects([root, inactive, child]);
    assert.deepEqual(
      eligible.map((c) => c.id),
      ['root-1']
    );
  });

  it('searches by project name, address, and customer/client name', () => {
    const candidates = filterEligibleImportParentProjects([
      makeProject({
        id: 'a',
        name: 'Oak Ridge',
        client: { id: 'c', name: 'HOA North', segment: null },
        address: {
          ...emptyCrmProjectAddress(),
          addressLine1: '1200 Oak Ave',
          city: 'Dallas',
          state: 'TX',
          postalCode: '75001',
        },
      }),
      makeProject({
        id: 'b',
        name: 'Pine Court',
        client: { id: 'c2', name: 'Other Client', segment: null },
        address: {
          ...emptyCrmProjectAddress(),
          addressLine1: '9 Pine St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
        },
      }),
    ]);

    assert.equal(searchImportParentCandidates(candidates, 'oak ridge').length, 1);
    assert.equal(searchImportParentCandidates(candidates, 'hoa north')[0]?.id, 'a');
    assert.equal(searchImportParentCandidates(candidates, '1200 oak')[0]?.id, 'a');
    assert.equal(searchImportParentCandidates(candidates, 'pine court')[0]?.id, 'b');
  });

  it('allows selecting a non-suggested eligible root from the candidate list', () => {
    const candidates = filterEligibleImportParentProjects([
      makeProject({ id: 'suggested', name: 'Exact Match Name' }),
      makeProject({ id: 'other', name: 'Different Project', client: { id: 'x', name: 'Zeta Co', segment: null } }),
    ]);
    const suggestedIds = new Set(['suggested']);
    const selected = searchImportParentCandidates(candidates, 'zeta')[0];
    assert.ok(selected);
    assert.equal(selected.id, 'other');
    assert.equal(suggestedIds.has(selected.id), false);
  });

  it('does not invent cross-org projects — only filters the provided org-scoped list', () => {
    const orgA = filterEligibleImportParentProjects([
      makeProject({ id: 'org-a-root', name: 'Shared Name' }),
    ]);
    const orgBOnly = filterEligibleImportParentProjects([
      makeProject({ id: 'org-b-root', name: 'Shared Name' }),
    ]);
    assert.equal(orgA.some((c) => c.id === 'org-b-root'), false);
    assert.equal(orgBOnly.some((c) => c.id === 'org-a-root'), false);
  });

  it('builds location labels, Subproject counts, and newest-updated ordering', () => {
    const older = makeProject({
      id: 'older',
      name: 'Older Root',
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      address: {
        ...emptyCrmProjectAddress(),
        city: 'Dallas',
        state: 'TX',
      },
    });
    const newer = makeProject({
      id: 'newer',
      name: 'Newer Root',
      lastUpdatedAt: '2026-06-01T00:00:00.000Z',
      address: {
        ...emptyCrmProjectAddress(),
        city: 'Austin',
        state: 'TX',
      },
    });
    const childA = makeProject({
      id: 'child-a',
      name: 'Child A',
      parentProjectId: 'newer',
    });
    const childB = makeProject({
      id: 'child-b',
      name: 'Child B',
      parentProjectId: 'newer',
    });

    const eligible = filterEligibleImportParentProjects([older, newer, childA, childB]);
    assert.deepEqual(
      eligible.map((c) => c.id),
      ['newer', 'older']
    );
    assert.equal(eligible[0]?.locationLabel, 'Austin, TX');
    assert.equal(eligible[0]?.subprojectCount, 2);
    assert.equal(eligible[1]?.subprojectCount, 0);
  });

  it('returns the full candidate list when search query is empty', () => {
    const candidates = filterEligibleImportParentProjects([
      makeProject({ id: 'a', name: 'Alpha' }),
      makeProject({ id: 'b', name: 'Beta' }),
    ]);
    assert.equal(searchImportParentCandidates(candidates, '').length, 2);
    assert.equal(searchImportParentCandidates(candidates, '   ').length, 2);
  });
});
