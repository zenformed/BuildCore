import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import type { CrmProjectSummary } from '@/domain/crm/project';
import { emptyCrmProjectAddress } from '@/domain/crm/projectAddress';
import {
  chooseParentRowClassName,
  chooseParentVisibleColumns,
  filterChooseParentCandidates,
  isChooseParentSelectionReady,
  nextChooseParentVisibleLimit,
  pageChooseParentCandidates,
  resolveChooseParentEmptyKind,
  resolveChooseParentLayoutMode,
  resolveCreatedChooseParentCandidate,
} from '@/presentation/features/crmImport/interview/chooseParentPresentation';
import { createBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';

function candidate(
  overrides: Partial<CrmImportParentCandidate> & Pick<CrmImportParentCandidate, 'id' | 'name'>
): CrmImportParentCandidate {
  return {
    slug: overrides.slug ?? overrides.id,
    clientName: overrides.clientName ?? 'Acme',
    addressLabel: overrides.addressLabel ?? '100 Main St, Austin, TX',
    locationLabel: overrides.locationLabel ?? 'Austin, TX',
    subprojectCount: overrides.subprojectCount ?? 0,
    lastUpdatedAt: overrides.lastUpdatedAt ?? '2026-01-01T00:00:00.000Z',
    searchHaystack:
      overrides.searchHaystack ??
      `${overrides.name} ${overrides.clientName ?? 'Acme'} ${overrides.addressLabel ?? '100 Main St, Austin, TX'}`.toLowerCase(),
    ...overrides,
  };
}

describe('chooseParentPresentation', () => {
  const list = [
    candidate({
      id: 'a',
      name: 'Oak Ridge Apartments',
      clientName: 'ACME Properties',
      addressLabel: '12 Oak Ave, Murfreesboro, TN',
      locationLabel: 'Murfreesboro, TN',
      searchHaystack: 'oak ridge apartments acme properties 12 oak ave murfreesboro tn',
    }),
    candidate({
      id: 'b',
      name: 'Pine Court',
      clientName: 'Zeta Co',
      addressLabel: '9 Pine St, Austin, TX',
      locationLabel: 'Austin, TX',
      searchHaystack: 'pine court zeta co 9 pine st austin tx',
    }),
  ];

  it('shows eligible Projects before typing (empty query keeps full list)', () => {
    const filtered = filterChooseParentCandidates(list, '');
    assert.equal(filtered.length, 2);
    assert.deepEqual(
      filtered.map((c) => c.id),
      ['a', 'b']
    );
  });

  it('filters by Project name, customer, and address', () => {
    assert.equal(filterChooseParentCandidates(list, 'oak ridge')[0]?.id, 'a');
    assert.equal(filterChooseParentCandidates(list, 'zeta')[0]?.id, 'b');
    assert.equal(filterChooseParentCandidates(list, '12 oak')[0]?.id, 'a');
  });

  it('pages the initial list and reports remaining count', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      candidate({ id: `p-${index}`, name: `Project ${index}` })
    );
    const page = pageChooseParentCandidates(many, 8);
    assert.equal(page.visible.length, 8);
    assert.equal(page.remainingCount, 4);
    assert.equal(nextChooseParentVisibleLimit(8), 16);
  });

  it('resolves empty states for no eligible and no search results', () => {
    assert.equal(
      resolveChooseParentEmptyKind({ totalEligible: 0, filteredCount: 0, query: '' }),
      'no_eligible'
    );
    assert.equal(
      resolveChooseParentEmptyKind({ totalEligible: 2, filteredCount: 0, query: 'zzz' }),
      'no_search_results'
    );
    assert.equal(
      resolveChooseParentEmptyKind({ totalEligible: 2, filteredCount: 2, query: '' }),
      'none'
    );
  });

  it('marks only the selected row with the selected class (single selection)', () => {
    assert.equal(
      chooseParentRowClassName({
        selected: true,
        styles: { row: 'row', selected: 'selected' },
      }),
      'row selected'
    );
    assert.equal(
      chooseParentRowClassName({
        selected: false,
        styles: { row: 'row', selected: 'selected' },
      }),
      'row'
    );
  });

  it('enables Continue only when a Project is selected', () => {
    assert.equal(isChooseParentSelectionReady(null), false);
    assert.equal(isChooseParentSelectionReady(''), false);
    assert.equal(isChooseParentSelectionReady('parent-1'), true);
  });

  it('auto-selects the newly created Project from the refreshed list', () => {
    const refreshed = [
      candidate({ id: 'new-1', name: 'Brand New', subprojectCount: 0 }),
      ...list,
    ];
    const summary = {
      id: 'new-1',
      name: 'Brand New',
    } as CrmProjectSummary;
    const matched = resolveCreatedChooseParentCandidate(refreshed, {
      id: 'new-1',
      summary,
    });
    assert.equal(matched.id, 'new-1');
    assert.equal(matched.name, 'Brand New');
  });

  it('falls back to the created summary when refresh has not yet included it', () => {
    const summary = {
      id: 'orphan',
      slug: 'orphan',
      name: 'Orphan Root',
      parentProjectId: null,
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
      client: { id: 'client-1', name: 'Client', segment: null },
      address: {
        ...emptyCrmProjectAddress(),
        city: 'Austin',
        state: 'TX',
      },
      priority: 'normal',
      currentStageSlug: 'lead',
      notesPreview: null,
      dealValueCents: 0,
      balanceRemainingCents: 0,
      assignedTo: null,
      lastUpdatedAt: '2026-06-01T00:00:00.000Z',
      completedAt: null,
      completedBy: null,
      primaryPhotoPath: null,
      latitude: null,
      longitude: null,
      leadToken: 'token',
      status: 'active',
      lossReason: null,
      lossReasonOther: null,
      statusChangedAt: null,
      statusChangedBy: null,
      customFields: {},
    } satisfies CrmProjectSummary;

    const matched = resolveCreatedChooseParentCandidate([], {
      id: 'orphan',
      summary,
    });
    assert.equal(matched.id, 'orphan');
    assert.equal(matched.locationLabel, 'Austin, TX');
  });

  it('uses configured Project/Subproject terminology in chooseParent copy', () => {
    const copy = createBuildCoreDashboardContent(
      resolveEntityTerminology({
        project: 'Job',
        subproject: 'Unit',
      })
    ).crm.spreadsheetImport.interview.chooseParent;

    assert.match(copy.heading, /Job/);
    assert.match(copy.subheading, /Unit/);
    assert.match(copy.createButton, /Job/);
    assert.match(copy.columnSubprojects, /Units/);
    assert.match(copy.noEligibleTitle, /Jobs/);
  });

  it('maps responsive breakpoints to expected visible columns', () => {
    assert.equal(resolveChooseParentLayoutMode(1200), 'desktop');
    assert.equal(resolveChooseParentLayoutMode(900), 'tablet');
    assert.equal(resolveChooseParentLayoutMode(480), 'mobile');
    assert.deepEqual(chooseParentVisibleColumns('desktop'), [
      'project',
      'customer',
      'location',
      'subprojects',
      'updated',
      'selection',
    ]);
    assert.deepEqual(chooseParentVisibleColumns('tablet'), [
      'project',
      'customer',
      'location',
      'selection',
    ]);
    assert.deepEqual(chooseParentVisibleColumns('mobile'), [
      'project',
      'customer',
      'location',
      'subprojects',
      'selection',
    ]);
  });

  it('nested create auto-select preserves a separate interview snapshot (no reset)', () => {
    const interviewBefore = {
      screen: 'choose_parent' as const,
      structureChoice: 'one_project' as const,
      selectedParentProjectId: null as string | null,
      selectedParentLabel: null as string | null,
      headerRowIndex: 0,
    };
    const refreshed = [candidate({ id: 'new-1', name: 'Brand New' })];
    const matched = resolveCreatedChooseParentCandidate(refreshed, {
      id: 'new-1',
      summary: { id: 'new-1', name: 'Brand New' } as CrmProjectSummary,
    });
    const interviewAfter = {
      ...interviewBefore,
      selectedParentProjectId: matched.id,
      selectedParentLabel: matched.name,
    };
    assert.equal(interviewAfter.screen, 'choose_parent');
    assert.equal(interviewAfter.structureChoice, 'one_project');
    assert.equal(interviewAfter.headerRowIndex, 0);
    assert.equal(interviewAfter.selectedParentProjectId, 'new-1');
    assert.equal(isChooseParentSelectionReady(interviewAfter.selectedParentProjectId), true);
  });
});
