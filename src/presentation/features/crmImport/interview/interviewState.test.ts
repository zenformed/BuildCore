import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyMultiProjectOrganization,
  applyRecommendation,
  applyStructureChoice,
  clearDownstreamAfterHeaderChange,
  clearDownstreamAfterProjectIdentityChange,
  createInitialInterviewState,
  getNextInterviewScreen,
  goInterviewBack,
  goInterviewForward,
  interviewScreenToMilestone,
  jumpInterviewFromReview,
  jumpInterviewTo,
  resolveEffectiveImportMode,
} from '@/presentation/features/crmImport/interview/interviewState';
import { continueInterviewAfterEdit } from '@/presentation/features/crmImport/interview/reviewPresentation';
import { buildImportPayloadFromInterview } from '@/presentation/features/crmImport/interview/buildImportPayloadFromInterview';
import type { CrmImportStructureRecommendation } from '@/domain/crm/spreadsheetImportStructureAnalysis';

describe('interviewState', () => {
  it('branches one project from projects-page launch to sheet selection', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'one_project');
    state = { ...state, screen: 'structure' };
    assert.equal(getNextInterviewScreen(state), 'select_sheets');
    assert.equal(state.multiProjectOrganization, null);
    assert.equal(resolveEffectiveImportMode(state), 'into_existing_parent');
  });

  it('branches multiple projects to multi_project_organization', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = { ...state, screen: 'structure' };
    assert.equal(getNextInterviewScreen(state), 'multi_project_organization');
    assert.equal(resolveEffectiveImportMode(state), 'master_hierarchy');
  });

  it('routes repeating-column organization into header then project_identity', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'repeating_column');
    state = { ...state, screen: 'multi_project_organization' };
    assert.equal(getNextInterviewScreen(state), 'header');
    assert.equal(getNextInterviewScreen({ ...state, screen: 'header' }), 'project_identity');
  });

  it('routes header-rows organization through column headers, Project headers, then resolution', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'header_rows');
    state = { ...state, screen: 'multi_project_organization' };
    assert.equal(getNextInterviewScreen(state), 'header');
    assert.equal(getNextInterviewScreen({ ...state, screen: 'header' }), 'project_header_rows');
    assert.equal(
      getNextInterviewScreen({ ...state, screen: 'project_header_rows' }),
      'header_row_projects'
    );
    assert.equal(
      getNextInterviewScreen({ ...state, screen: 'header_row_projects' }),
      'subproject_identity'
    );
  });

  it('routes worksheet organization to worksheet Projects, headers, then resolution', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');

    state = applyMultiProjectOrganization(state, 'worksheet_per_project');
    state = { ...state, screen: 'multi_project_organization' };
    assert.equal(getNextInterviewScreen(state), 'worksheet_projects');
    assert.equal(getNextInterviewScreen({ ...state, screen: 'worksheet_projects' }), 'worksheet_headers');
    assert.equal(getNextInterviewScreen({ ...state, screen: 'worksheet_headers' }), 'worksheet_resolve_summary');
    assert.equal(
      getNextInterviewScreen({ ...state, screen: 'worksheet_resolve' }),
      'worksheet_resolve_summary'
    );
    assert.equal(
      getNextInterviewScreen({ ...state, screen: 'worksheet_resolve_summary' }),
      'subproject_identity'
    );
  });

  it('routes organization unsure into the recommendation flow', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'unsure');
    state = { ...state, screen: 'multi_project_organization' };
    assert.equal(getNextInterviewScreen(state), 'recommend');
  });

  it('routes fields through duplicate review before final review', () => {
    const multi = {
      ...createInitialInterviewState({ launchMode: 'master_hierarchy' }),
      structureChoice: 'multiple_projects' as const,
      multiProjectOrganization: 'repeating_column' as const,
      screen: 'fields' as const,
    };
    assert.equal(getNextInterviewScreen(multi), 'duplicate_check');
    assert.equal(
      getNextInterviewScreen({ ...multi, screen: 'duplicate_check' }),
      'merge_review'
    );
    assert.equal(
      getNextInterviewScreen({ ...multi, screen: 'merge_review' }),
      'review'
    );
    assert.equal(
      getNextInterviewScreen({ ...multi, screen: 'hierarchy_preview' }),
      'duplicate_check'
    );
    assert.equal(getNextInterviewScreen({ ...multi, screen: 'parent_resolve' }), 'duplicate_check');
    assert.equal(getNextInterviewScreen({ ...multi, screen: 'conflict' }), 'duplicate_check');

    const oneProject = {
      ...createInitialInterviewState({ launchMode: 'master_hierarchy' }),
      structureChoice: 'one_project' as const,
      selectedParentProjectId: 'p1',
      screen: 'fields' as const,
    };
    assert.equal(getNextInterviewScreen(oneProject), 'duplicate_check');
  });

  it('branches unsure to recommend', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'unsure');
    state = { ...state, screen: 'structure' };
    assert.equal(getNextInterviewScreen(state), 'recommend');
  });

  it('launched inside existing project skips structure and parent search', () => {
    const state = createInitialInterviewState({
      launchMode: 'into_existing_parent',
      fixedParentProjectId: 'parent-1',
      fixedParentDisplayName: 'Oak Ridge',
    });
    assert.equal(state.structureChoice, 'one_project');
    assert.equal(state.selectedParentProjectId, 'parent-1');
    assert.equal(getNextInterviewScreen({ ...state, screen: 'header' }), 'subproject_identity');
    assert.equal(resolveEffectiveImportMode(state), 'into_existing_parent');
  });

  it('projects-page one-project flow selects sheets then chooses parent then headers', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'one_project');
    assert.equal(state.multiProjectOrganization, null);
    state = { ...state, screen: 'structure' };
    assert.equal(getNextInterviewScreen(state), 'select_sheets');
    state = { ...state, screen: 'select_sheets' };
    assert.equal(getNextInterviewScreen(state), 'choose_parent');
    state = { ...state, screen: 'choose_parent' };
    assert.equal(getNextInterviewScreen(state), 'header');
    state = { ...state, screen: 'header' };
    assert.equal(getNextInterviewScreen(state), 'subproject_identity');
  });

  it('applies a multi-column recommendation into project composition', () => {
    const recommendation: CrmImportStructureRecommendation = {
      id: 'multi_combo_0_1',
      kind: 'multiple_by_combination',
      title: 'combo',
      reason: 'reason',
      estimatedParentGroups: 4,
      estimatedSubprojects: 20,
      columnIndexes: [0, 1],
      columnHeaders: ['City', 'Property'],
      confidence: 0.7,
    };
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyRecommendation(state, recommendation);
    assert.equal(state.structureChoice, 'multiple_projects');
    assert.equal(state.multiProjectOrganization, 'repeating_column');
    assert.deepEqual(state.projectComposition?.columnIndexes, [0, 1]);
  });

  it('clears organization choice when structure branch changes', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = applyStructureChoice(state, 'multiple_projects');
    state = applyMultiProjectOrganization(state, 'header_rows');
    assert.equal(state.multiProjectOrganization, 'header_rows');
    state = applyStructureChoice(state, 'one_project');
    assert.equal(state.multiProjectOrganization, null);
    state = applyStructureChoice(state, 'multiple_projects');
    assert.equal(state.multiProjectOrganization, null);
  });

  it('clears incompatible downstream state after branch and header changes', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = {
      ...state,
      structureChoice: 'multiple_projects',
      projectComposition: { columnIndexes: [0], separator: ' ' },
      subprojectComposition: { columnIndexes: [1], separator: ' ' },
      groupResolutions: { 'name:a': { type: 'create_new' } },
      remainingFields: [{ sourceIndex: 2, destinationKey: 'ignored', placement: 'ignore' }],
    };
    state = applyStructureChoice(state, 'one_project');
    assert.equal(state.projectComposition, null);
    assert.deepEqual(state.groupResolutions, {});

    state = {
      ...state,
      subprojectComposition: { columnIndexes: [1], separator: ' ' },
      remainingFields: [{ sourceIndex: 2, destinationKey: 'standard:subproject:notes', placement: 'subproject' }],
      groupResolutions: { g: { type: 'ignore' } },
    };
    state = clearDownstreamAfterHeaderChange(state);
    assert.equal(state.subprojectComposition, null);
    assert.deepEqual(state.remainingFields, []);
    assert.deepEqual(state.groupResolutions, {});
  });

  it('rebuilds hierarchy-related resolutions when project identity changes', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = {
      ...state,
      groupResolutions: { g1: { type: 'attach_existing', attachProjectId: 'x' } },
      activeGroupKey: 'g1',
    };
    state = clearDownstreamAfterProjectIdentityChange(state);
    assert.deepEqual(state.groupResolutions, {});
    assert.equal(state.activeGroupKey, null);
  });

  it('supports branch-aware back navigation via history', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = goInterviewForward({ ...state, screen: 'upload' });
    assert.equal(state.screen, 'structure');
    state = goInterviewForward({ ...state, structureChoice: 'one_project' });
    assert.equal(state.screen, 'select_sheets');
    state = goInterviewBack(state);
    assert.equal(state.screen, 'structure');
    state = jumpInterviewTo(state, 'fields');
    assert.equal(state.screen, 'fields');
  });

  it('returns to Review after Edit when downstream answers remain valid', () => {
    let state = createInitialInterviewState({ launchMode: 'master_hierarchy' });
    state = {
      ...state,
      screen: 'review',
      structureChoice: 'one_project',
      selectedParentProjectId: 'p1',
      selectedParentLabel: 'Parent',
      worksheetProjects: [
        {
          worksheetId: 'sheet:0:Sheet1',
          worksheetName: 'Sheet1',
          included: true,
          projectName: 'Parent',
          headerRowIndex: 0,
          dataRowCount: 2,
          columnCount: 3,
        },
      ],
      subprojectComposition: { columnIndexes: [0], separator: ' ' },
      remainingFields: [
        { sourceIndex: 1, destinationKey: 'standard:subproject:notes', placement: 'subproject' },
      ],
    };
    state = jumpInterviewFromReview(state, 'choose_parent');
    assert.equal(state.returnToReview, true);
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'duplicate_check');
    assert.equal(state.returnToReview, true);
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'merge_review');
    assert.equal(state.returnToReview, true);
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'review');
    assert.equal(state.returnToReview, false);
  });

  it('maps interview screens onto progress milestones', () => {
    assert.equal(interviewScreenToMilestone('upload'), 'upload');
    assert.equal(interviewScreenToMilestone('header'), 'upload');
    assert.equal(interviewScreenToMilestone('structure'), 'structure');
    assert.equal(interviewScreenToMilestone('multi_project_organization'), 'structure');
    assert.equal(interviewScreenToMilestone('coming_soon_header_rows'), 'structure');
    assert.equal(interviewScreenToMilestone('subproject_identity'), 'structure');
    assert.equal(interviewScreenToMilestone('fields'), 'fields');
    assert.equal(interviewScreenToMilestone('parent_resolve'), 'fields');
    assert.equal(interviewScreenToMilestone('review'), 'review');
    assert.equal(interviewScreenToMilestone('import'), 'import');
  });
});

describe('buildImportPayloadFromInterview', () => {
  it('builds one-column and multi-column project/subproject identifiers into engine mappings', () => {
    const rows = [
      { sourceRowIndex: 1, cells: { 0: 'Oak', 1: 'A', 2: '101', 3: 'notes' } },
      { sourceRowIndex: 2, cells: { 0: 'Oak', 1: 'A', 2: '102', 3: 'more' } },
    ];
    const headers = ['Complex', 'Building', 'Unit', 'Notes'];
    const state = {
      ...createInitialInterviewState({ launchMode: 'master_hierarchy' }),
      structureChoice: 'multiple_projects' as const,
      projectComposition: { columnIndexes: [0, 1] as const, separator: ' - ' as const },
      subprojectComposition: { columnIndexes: [2] as const, separator: ' ' as const },
      remainingFields: [
        { sourceIndex: 3, destinationKey: 'standard:subproject:notes', placement: 'subproject' as const },
      ],
    };
    const payload = buildImportPayloadFromInterview({ state, headers, rows });
    assert.equal(payload.importMode, 'master_hierarchy');
    assert.ok(
      payload.mappings.some(
        (m) =>
          m.destination.kind === 'standard_field' &&
          m.destination.key === 'parent_name' &&
          m.ownership === 'parent'
      )
    );
    assert.ok(
      payload.mappings.some(
        (m) =>
          m.destination.kind === 'standard_field' &&
          m.destination.key === 'subproject_name'
      )
    );
    assert.equal(payload.rows[0]?.cells[0], 'Oak - A');
    assert.equal(payload.rows[0]?.cells[2], '101');
  });

  it('maps composite First Name + Last Name into contact_name', () => {
    const state = {
      ...createInitialInterviewState({
        launchMode: 'into_existing_parent',
        fixedParentProjectId: 'p1',
      }),
      subprojectComposition: { columnIndexes: [2] as const, separator: ' ' as const },
      contactComposition: { columnIndexes: [0, 1] as const, separator: ' ' as const },
      remainingFields: [],
    };
    const payload = buildImportPayloadFromInterview({
      state,
      headers: ['First Name', 'Last Name', 'Unit'],
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Ann', 1: 'Lee', 2: 'U1' } }],
    });
    assert.equal(payload.importMode, 'into_existing_parent');
    assert.equal(payload.fixedParentProjectId, 'p1');
    assert.equal(payload.rows[0]?.cells[0], 'Ann Lee');
    assert.ok(
      payload.mappings.some(
        (m) =>
          m.destination.kind === 'standard_field' && m.destination.key === 'contact_name'
      )
    );
  });

  it('does not duplicate Last Name when Subproject and Contact both compose First+Last', () => {
    const state = {
      ...createInitialInterviewState({
        launchMode: 'into_existing_parent',
        fixedParentProjectId: 'p1',
      }),
      subprojectComposition: { columnIndexes: [0, 1] as const, separator: ' ' as const },
      contactComposition: { columnIndexes: [0, 1] as const, separator: ' ' as const },
      remainingFields: [],
    };
    const payload = buildImportPayloadFromInterview({
      state,
      headers: ['First Name', 'Last Name', 'City'],
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Antoinette', 1: 'Reese', 2: 'Seattle' } }],
    });
    assert.equal(payload.rows[0]?.cells[0], 'Antoinette Reese');
    assert.equal(
      payload.rows[0]?.cells[0]?.includes('Reese Reese'),
      false,
      'contact/subproject compose must read original cells, not already-injected values'
    );
  });

  it('injects parent_name from worksheet Project decisions', () => {
    const state = {
      ...createInitialInterviewState({ launchMode: 'master_hierarchy' }),
      structureChoice: 'multiple_projects' as const,
      multiProjectOrganization: 'worksheet_per_project' as const,
      worksheetProjects: [
        {
          worksheetId: 'sheet:0:Oak',
          worksheetName: 'Oak',
          included: true,
          projectName: 'Oak Ridge',
          headerRowIndex: 0,
          dataRowCount: 1,
          columnCount: 2,
        },
      ],
      worksheetResolutions: {
        'sheet:0:Oak': {
          kind: 'create_new' as const,
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: true,
        },
      },
      activeWorksheetSetupId: 'sheet:0:Oak',
      subprojectComposition: { columnIndexes: [0] as const, separator: ' ' as const },
      remainingFields: [],
    };
    const payload = buildImportPayloadFromInterview({
      state,
      headers: ['Unit', 'Notes'],
      rows: [{ sourceRowIndex: 1, cells: { 0: '101', 1: 'ok' } }],
    });
    assert.equal(payload.importMode, 'master_hierarchy');
    assert.equal(payload.rows[0]?.cells[2], 'Oak Ridge');
    assert.ok(
      payload.mappings.some(
        (m) =>
          m.destination.kind === 'standard_field' &&
          m.destination.key === 'parent_name' &&
          m.sourceIndex === 2
      )
    );
  });
});
