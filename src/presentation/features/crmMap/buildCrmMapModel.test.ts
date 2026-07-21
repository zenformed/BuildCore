import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmProjectSummary } from '@/domain/crm';
import { emptyCrmProjectAddress } from '@/domain/crm/projectAddress';
import {
  buildCrmMapModel,
  filterCrmMapSearchableProjects,
} from './buildCrmMapModel';
import { hasValidProjectCoordinates } from './crmMapTypes';

function summary(partial: Partial<CrmProjectSummary> & Pick<CrmProjectSummary, 'id' | 'slug' | 'name'>): CrmProjectSummary {
  return {
    parentProjectId: null,
    industry: 'hvac',
    customIndustry: null,
    contact: {
      id: 'c1',
      name: 'Pat Contact',
      email: 'pat@example.com',
      phone: '5125550100',
      emails: ['pat@example.com'],
      phones: ['5125550100'],
      title: null,
    },
    client: { id: 'client-1', name: 'Acme Client', segment: null },
    address: {
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
    subprojectStatus: 'normal',
    inactiveReason: null,
    inactiveReasonCustom: null,
    inactiveAt: null,
    inactiveBy: null,
    customFields: {},
    ...partial,
  };
}

describe('hasValidProjectCoordinates', () => {
  it('accepts finite in-range coordinate pairs', () => {
    assert.equal(hasValidProjectCoordinates({ latitude: 30.2, longitude: -97.7 }), true);
  });

  it('rejects missing, non-finite, or out-of-range values', () => {
    assert.equal(hasValidProjectCoordinates({ latitude: null, longitude: -97.7 }), false);
    assert.equal(hasValidProjectCoordinates({ latitude: 30.2, longitude: null }), false);
    assert.equal(hasValidProjectCoordinates({ latitude: Number.NaN, longitude: -97.7 }), false);
    assert.equal(hasValidProjectCoordinates({ latitude: 91, longitude: -97.7 }), false);
    assert.equal(hasValidProjectCoordinates({ latitude: 30.2, longitude: -181 }), false);
  });
});

describe('buildCrmMapModel', () => {
  it('builds one marker per parent with coordinates and excludes projects without coordinates', () => {
    const parent = summary({
      id: 'p1',
      slug: 'parent-one',
      name: 'Parent One',
      latitude: 30.2,
      longitude: -97.7,
    });
    const parentNoCoords = summary({
      id: 'p2',
      slug: 'parent-two',
      name: 'Parent Two',
    });
    const child = summary({
      id: 'c1',
      slug: 'child-one',
      name: 'Child One',
      parentProjectId: 'p1',
      client: { id: 'client-2', name: 'Child Client', segment: null },
    });
    const orphanChild = summary({
      id: 'c2',
      slug: 'orphan-child',
      name: 'Orphan Child',
      parentProjectId: 'missing',
    });

    const model = buildCrmMapModel([parent, parentNoCoords, child, orphanChild]);

    assert.equal(model.markers.length, 1);
    assert.equal(model.markers[0]?.parentProjectId, 'p1');
    assert.deepEqual(
      model.searchable.map((item) => item.projectId).sort(),
      ['c1', 'p1']
    );
  });

  it('maps searchable subprojects to the parent marker while keeping subproject identity', () => {
    const parent = summary({
      id: 'p1',
      slug: 'parent-one',
      name: 'Parent One',
      latitude: 29.7,
      longitude: -95.4,
    });
    const child = summary({
      id: 'c1',
      slug: 'child-one',
      name: 'Roofing Sub',
      parentProjectId: 'p1',
      latitude: 1,
      longitude: 1,
    });

    const model = buildCrmMapModel([parent, child]);
    const childEntry = model.searchable.find((item) => item.projectId === 'c1');

    assert.ok(childEntry);
    assert.equal(childEntry?.isSubproject, true);
    assert.equal(childEntry?.marker.parentProjectId, 'p1');
    assert.equal(childEntry?.marker.latitude, 29.7);
    assert.equal(childEntry?.marker.longitude, -95.4);
    assert.equal(childEntry?.projectName, 'Roofing Sub');
  });
});

describe('filterCrmMapSearchableProjects', () => {
  it('matches parent/subproject names, customer, and address haystacks', () => {
    const parent = summary({
      id: 'p1',
      slug: 'oak-ridge',
      name: 'Oak Ridge Retrofit',
      latitude: 30.2,
      longitude: -97.7,
      client: { id: 'client-1', name: 'Oak Ridge HOA', segment: null },
      address: {
        ...emptyCrmProjectAddress(),
        addressLine1: '1200 Oak Ridge Blvd',
        city: 'Austin',
        state: 'TX',
        postalCode: '78741',
      },
    });
    const child = summary({
      id: 'c1',
      slug: 'unit-b',
      name: 'Unit B Chiller',
      parentProjectId: 'p1',
    });
    const other = summary({
      id: 'p2',
      slug: 'other',
      name: 'Other Job',
      latitude: 32.7,
      longitude: -96.8,
      client: { id: 'client-2', name: 'Other Co', segment: null },
    });

    const { searchable } = buildCrmMapModel([parent, child, other]);

    assert.equal(filterCrmMapSearchableProjects(searchable, 'oak ridge hoa').length, 2);
    assert.equal(filterCrmMapSearchableProjects(searchable, 'oak ridge').length, 2);
    assert.equal(filterCrmMapSearchableProjects(searchable, 'unit b').length, 1);
    assert.equal(filterCrmMapSearchableProjects(searchable, '1200 oak').length, 2);
    assert.equal(filterCrmMapSearchableProjects(searchable, 'dallas').length, 0);
  });
});
