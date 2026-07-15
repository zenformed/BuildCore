import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import {
  createBuildCoreDashboardContent,
  bindBuildCoreDashboardContent,
  getBuildCoreDashboardContent,
} from '@/platform/content/buildCoreDashboardContent';
import {
  createBuildCoreDashboardNavigation,
  bindBuildCoreDashboardNavigation,
  getBuildCoreDashboardNavigation,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  commitEntityHeadingRename,
  entityHeadingRenameKeyAction,
} from '@/presentation/components/BuildCoreWorkflowSettings/entityHeadingRename';
import {
  getMockEntityTerminologyResponse,
  resetMockEntityTerminologyStore,
  setMockEntityTerminology,
} from '@/infrastructure/crm/mock/mockEntityTerminologyStore';

describe('entity terminology content + navigation', () => {
  it('updates headings and breadcrumb parent from resolved terms', () => {
    const terms = resolveEntityTerminology({
      project: 'Bridal Show',
      subproject: 'Lead',
    });
    const content = createBuildCoreDashboardContent(terms);
    assert.equal(content.workflowSettings.stageColumns.projectStages, 'Bridal Show Stages');
    assert.equal(content.workflowSettings.stageColumns.subprojectStages, 'Lead Stages');
    assert.equal(content.projectDetail.breadcrumbProjects, 'Bridal Shows');
    assert.equal(content.crm.panel.title, 'Bridal Shows');
    assert.equal(content.crm.panel.listView.subprojects, 'Leads');

    const nav = createBuildCoreDashboardNavigation(terms);
    assert.equal(nav.sidebar.items[0]?.label, 'Bridal Shows');
    assert.equal(nav.header.search.placeholder, 'Search bridal shows…');
    assert.equal(nav.header.newProject.title, 'New Bridal Show');
  });

  it('binds live content proxies for dashboard consumers', () => {
    bindBuildCoreDashboardContent(resolveEntityTerminology());
    bindBuildCoreDashboardNavigation(resolveEntityTerminology());
    assert.equal(getBuildCoreDashboardContent().crm.panel.title, 'Projects');
    assert.equal(getBuildCoreDashboardNavigation().sidebar.items[0]?.label, 'Projects');

    const custom = resolveEntityTerminology({ project: 'Bridal Show', subproject: 'Lead' });
    bindBuildCoreDashboardContent(custom);
    bindBuildCoreDashboardNavigation(custom);
    assert.equal(getBuildCoreDashboardContent().crm.panel.title, 'Bridal Shows');
    assert.equal(getBuildCoreDashboardNavigation().sidebar.items[0]?.label, 'Bridal Shows');

    bindBuildCoreDashboardContent(resolveEntityTerminology());
    bindBuildCoreDashboardNavigation(resolveEntityTerminology());
  });
});

describe('entity heading rename helpers', () => {
  it('saves on Enter and cancels on Escape', () => {
    assert.equal(entityHeadingRenameKeyAction('Enter'), 'save');
    assert.equal(entityHeadingRenameKeyAction('Escape'), 'cancel');
    assert.equal(entityHeadingRenameKeyAction('a'), null);
  });

  it('commits trimmed rename values and rejects empty', () => {
    const saved = commitEntityHeadingRename('  Bridal Show  ', 'Project');
    assert.equal(saved.ok, true);
    if (saved.ok) assert.equal(saved.value, 'Bridal Show');

    assert.equal(commitEntityHeadingRename('   ', 'Project').ok, false);
    assert.equal(commitEntityHeadingRename('Project', 'Project').ok, false);
  });
});

describe('demo entity terminology mock store', () => {
  it('supports client-side rename without production writes and resets cleanly', () => {
    resetMockEntityTerminologyStore();
    assert.equal(getMockEntityTerminologyResponse(true).terms.project, 'Project');
    assert.equal(setMockEntityTerminology('project', 'Bridal Show'), true);
    assert.equal(getMockEntityTerminologyResponse(true).terms.project, 'Bridal Show');
    assert.equal(getMockEntityTerminologyResponse(true).terms.projects, 'Bridal Shows');
    assert.equal(setMockEntityTerminology('project', '   '), false);
    resetMockEntityTerminologyStore();
    assert.equal(getMockEntityTerminologyResponse(true).terms.project, 'Project');
  });

  it('exposes owner/admin edit capability vs member read-only flag', () => {
    assert.equal(organizationRoleCanManagePipelineStages('owner'), true);
    assert.equal(organizationRoleCanManagePipelineStages('admin'), true);
    assert.equal(organizationRoleCanManagePipelineStages('member'), false);
    assert.equal(getMockEntityTerminologyResponse(false).canEdit, false);
    assert.equal(getMockEntityTerminologyResponse(true).canEdit, true);
  });
});
