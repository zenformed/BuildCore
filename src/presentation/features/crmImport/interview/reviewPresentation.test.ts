import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';
import {
  createInitialInterviewState,
  jumpInterviewFromReview,
  type CrmImportInterviewState,
} from '@/presentation/features/crmImport/interview/interviewState';
import {
  buildKeyFieldChips,
  collectReviewClientIssues,
  compositionLabel,
  continueInterviewAfterEdit,
  countMappedAndIgnoredColumns,
  destinationImportingToLabel,
  findEarliestIncompleteInterviewScreen,
  resolveReviewLayoutMode,
  resolveReviewReadiness,
  reviewEditTargetForSection,
  reviewIssueMetricCount,
} from '@/presentation/features/crmImport/interview/reviewPresentation';

function readyOneProjectState(): CrmImportInterviewState {
  return {
    ...createInitialInterviewState({ launchMode: 'master_hierarchy' }),
    screen: 'review',
    structureChoice: 'one_project',
    multiProjectOrganization: null,
    worksheetProjects: [
      {
        worksheetId: 'sheet:0:Sheet1',
        worksheetName: 'Sheet1',
        included: true,
        projectName: 'Test',
        headerRowIndex: 0,
        dataRowCount: 2,
        columnCount: 4,
      },
    ],
    worksheetResolutions: null,
    selectedParentProjectId: 'p1',
    selectedParentLabel: 'Test',
    subprojectComposition: { columnIndexes: [0, 1], separator: ' ' },
    remainingFields: [
      { sourceIndex: 2, destinationKey: 'standard:subproject:emails', placement: 'subproject' },
      { sourceIndex: 3, destinationKey: 'ignored', placement: 'ignore' },
    ],
    returnToReview: true,
  };
}

describe('reviewPresentation', () => {
  it('resolves readiness tones from issue counts', () => {
    assert.equal(resolveReviewReadiness({ blockingCount: 0, warningCount: 0 }), 'ready');
    assert.equal(resolveReviewReadiness({ blockingCount: 0, warningCount: 2 }), 'warning');
    assert.equal(resolveReviewReadiness({ blockingCount: 1, warningCount: 5 }), 'blocking');
  });

  it('counts mapped and ignored columns from remaining fields plus locked columns', () => {
    const counts = countMappedAndIgnoredColumns({
      headersLength: 10,
      lockedColumnCount: 2,
      remainingFields: [
        { sourceIndex: 2, destinationKey: 'standard:subproject:city', placement: 'subproject' },
        { sourceIndex: 3, destinationKey: 'ignored', placement: 'ignore' },
        { sourceIndex: 4, destinationKey: 'standard:subproject:phones', placement: 'subproject' },
      ],
    });
    assert.equal(counts.mappedCount, 4);
    assert.equal(counts.ignoredCount, 1);
  });

  it('builds key-field chips with overflow count', () => {
    const chips = buildKeyFieldChips({
      mappings: [
        {
          sourceIndex: 0,
          originalHeader: 'Contact',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'contact_name' },
        },
        {
          sourceIndex: 1,
          originalHeader: 'Email',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'emails' },
        },
        {
          sourceIndex: 2,
          originalHeader: 'Phone',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'phones' },
        },
        {
          sourceIndex: 3,
          originalHeader: 'Address',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'address_line_1' },
        },
        {
          sourceIndex: 4,
          originalHeader: 'City',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'city' },
        },
        {
          sourceIndex: 5,
          originalHeader: 'State',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'state' },
        },
        {
          sourceIndex: 6,
          originalHeader: 'Notes',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'notes' },
        },
        {
          sourceIndex: 7,
          originalHeader: 'Skip',
          ownership: 'ignored',
          destination: { kind: 'ignored' },
        },
      ],
      standardFieldLabels: {
        contact_name: 'Contact Name',
        emails: 'Email',
        phones: 'Phone',
        address_line_1: 'Address',
        city: 'City',
        state: 'State',
        notes: 'Notes',
      },
      customFieldFallback: (label) => label,
      visibleLimit: 5,
    });
    assert.deepEqual(chips.visible, ['Contact Name', 'Email', 'Phone', 'Address', 'City']);
    assert.equal(chips.remainingCount, 2);
  });

  it('collects blocking and warning issues and totals the metric', () => {
    const result = collectReviewClientIssues({
      mappings: [
        {
          sourceIndex: 0,
          originalHeader: 'Name',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
        },
        {
          sourceIndex: 1,
          originalHeader: 'Email',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'emails' },
        },
      ],
      rows: [
        { sourceRowIndex: 1, cells: { 0: 'Ann', 1: 'not-an-email' } },
        { sourceRowIndex: 2, cells: { 0: '', 1: 'ok@example.com' } },
      ],
      importMode: 'into_existing_parent',
      mappingErrors: [],
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
    });
    assert.ok(result.blockingCount >= 1);
    assert.equal(resolveReviewReadiness(result), 'blocking');
    assert.equal(reviewIssueMetricCount(result), result.blockingCount + result.warningCount);
    assert.equal(result.messages.length, result.blockingCount + result.warningCount);
  });

  it('skips parent-key requirement for worksheet-per-Project imports', () => {
    const result = collectReviewClientIssues({
      mappings: [
        {
          sourceIndex: 0,
          originalHeader: 'Name',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
        },
      ],
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Ann' } }],
      importMode: 'master_hierarchy',
      mappingErrors: [],
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
      requireParentKeyColumn: false,
    });
    assert.equal(
      result.messages.some((message) => /parent name or parent identifier/i.test(message)),
      false
    );
  });

  it('ignores stale parent-key mappingErrors when parent column is not required', () => {
    const result = collectReviewClientIssues({
      mappings: [
        {
          sourceIndex: 0,
          originalHeader: 'Name',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
        },
      ],
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Ann' } }],
      importMode: 'master_hierarchy',
      mappingErrors: [
        'Master hierarchy imports require a parent name or parent identifier column.',
      ],
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
      requireParentKeyColumn: false,
    });
    assert.equal(
      result.messages.some((message) => /parent name or parent identifier/i.test(message)),
      false
    );
  });

  it('treats mapping errors and incomplete fields as blocking', () => {
    const result = collectReviewClientIssues({
      mappings: [],
      rows: [],
      importMode: 'into_existing_parent',
      mappingErrors: ['Invalid mapping'],
      fieldsReady: false,
      hasParent: false,
      hasSubprojectIdentity: false,
    });
    assert.ok(result.blockingCount >= 3);
    assert.equal(resolveReviewReadiness(result), 'blocking');
  });

  it('allows up to 4 phone mappings and blocks a 5th before Start Import', () => {
    const base = {
      ownership: 'subproject' as const,
      destination: {
        kind: 'standard_field' as const,
        entity: 'subproject' as const,
        key: 'phones',
      },
    };
    const fourPhones = [
      {
        sourceIndex: 0,
        originalHeader: 'Name',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'subproject_name',
        },
      },
      { sourceIndex: 1, originalHeader: 'P1', ...base },
      { sourceIndex: 2, originalHeader: 'P2', ...base },
      { sourceIndex: 3, originalHeader: 'P3', ...base },
      { sourceIndex: 4, originalHeader: 'P4', ...base },
    ];
    const ok = collectReviewClientIssues({
      mappings: fourPhones,
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Ann', 1: '1', 2: '2', 3: '3', 4: '4' } }],
      importMode: 'into_existing_parent',
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
    });
    assert.equal(
      ok.messages.some((m) => /phones/i.test(m) && /duplicate|too many/i.test(m)),
      false
    );

    const fivePhones = [
      ...fourPhones,
      { sourceIndex: 5, originalHeader: 'P5', ...base },
    ];
    const blocked = collectReviewClientIssues({
      mappings: fivePhones,
      rows: [
        {
          sourceRowIndex: 1,
          cells: { 0: 'Ann', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' },
        },
      ],
      importMode: 'into_existing_parent',
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
    });
    assert.ok(blocked.messages.some((m) => /Too many columns mapped to phones/i.test(m)));
    assert.ok(blocked.sectionsWithIssues.has('importedFields'));

    const withApiRepeat = collectReviewClientIssues({
      mappings: fivePhones,
      rows: [
        {
          sourceRowIndex: 1,
          cells: { 0: 'Ann', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' },
        },
      ],
      importMode: 'into_existing_parent',
      mappingErrors: [
        'Too many columns mapped to phones (maximum 4).',
        'Too many columns mapped to phones (maximum 4).',
      ],
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
    });
    assert.equal(
      withApiRepeat.messages.filter((m) => /Too many columns mapped to phones/i.test(m)).length,
      1
    );
    assert.equal(withApiRepeat.blockingCount, blocked.blockingCount);
  });

  it('still blocks duplicate single-value standard mappings before Start Import', () => {
    const mappings = [
      {
        sourceIndex: 0,
        originalHeader: 'Name',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'subproject_name',
        },
      },
      {
        sourceIndex: 1,
        originalHeader: 'City A',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'city',
        },
      },
      {
        sourceIndex: 2,
        originalHeader: 'City B',
        ownership: 'subproject' as const,
        destination: {
          kind: 'standard_field' as const,
          entity: 'subproject' as const,
          key: 'city',
        },
      },
    ];
    const beforeStart = collectReviewClientIssues({
      mappings,
      rows: [{ sourceRowIndex: 1, cells: { 0: 'Ann', 1: 'Austin', 2: 'Dallas' } }],
      importMode: 'into_existing_parent',
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
    });
    assert.ok(beforeStart.messages.some((m) => /Duplicate mapping for city/i.test(m)));
  });

  it('aggregates repeated row name issues into one unique message', () => {
    const result = collectReviewClientIssues({
      mappings: [
        {
          sourceIndex: 0,
          originalHeader: 'Name',
          ownership: 'subproject',
          destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
        },
      ],
      rows: [
        { sourceRowIndex: 1, cells: { 0: '' } },
        { sourceRowIndex: 2, cells: { 0: '' } },
        { sourceRowIndex: 3, cells: { 0: '' } },
      ],
      importMode: 'into_existing_parent',
      fieldsReady: true,
      hasParent: true,
      hasSubprojectIdentity: true,
      missingNameMessage: (count) => `${count} rows are missing a Subproject name.`,
    });
    assert.equal(result.messages.filter((m) => /missing a Subproject name/i.test(m)).length, 1);
    assert.match(result.messages.join(' '), /3 rows are missing/);
    assert.equal(result.blockingCount, 1);
  });

  it('uses a compact scrollable issue panel without reserved empty height', () => {
    const css = readFileSync(
      new URL(
        '../../../components/CrmImport/SpreadsheetImportWizard.module.css',
        import.meta.url
      ),
      'utf8'
    );
    assert.match(css, /\.reviewIssueRegion\s*\{[^]*?min-height:\s*0/);
    assert.match(css, /\.reviewIssuePanel\s*\{[^]*?max-height:\s*4\.5rem/);
    assert.match(css, /\.reviewIssuePanel\s*\{[^]*?overflow-y:\s*auto/);
  });

  it('builds spreadsheet composition labels', () => {
    assert.equal(
      compositionLabel(['First Name', 'Last Name'], { columnIndexes: [0, 1], separator: ' ' }),
      'First Name + Last Name'
    );
    assert.equal(compositionLabel(['A'], null), null);
  });

  it('labels destination importing-to using structure', () => {
    assert.equal(
      destinationImportingToLabel('one_project', 'master_hierarchy', {
        oneProject: 'One Project',
        multipleProjects: 'Multiple Projects',
      }),
      'One Project'
    );
    assert.equal(
      destinationImportingToLabel('multiple_projects', 'master_hierarchy', {
        oneProject: 'One Project',
        multipleProjects: 'Multiple Projects',
      }),
      'Multiple Projects'
    );
  });

  it('maps review edit targets to interview screens', () => {
    assert.equal(
      reviewEditTargetForSection('spreadsheet', {
        launchMode: 'master_hierarchy',
        structureChoice: 'one_project',
        effectiveMode: 'into_existing_parent',
      }),
      'upload'
    );
    assert.equal(
      reviewEditTargetForSection('destination', {
        launchMode: 'master_hierarchy',
        structureChoice: 'one_project',
        effectiveMode: 'into_existing_parent',
      }),
      'choose_parent'
    );
    assert.equal(
      reviewEditTargetForSection('destination', {
        launchMode: 'into_existing_parent',
        structureChoice: 'one_project',
        effectiveMode: 'into_existing_parent',
      }),
      null
    );
    assert.equal(
      reviewEditTargetForSection('destination', {
        launchMode: 'master_hierarchy',
        structureChoice: 'multiple_projects',
        effectiveMode: 'master_hierarchy',
        multiProjectOrganization: 'worksheet_per_project',
      }),
      'worksheet_resolve_summary'
    );
    assert.equal(
      reviewEditTargetForSection('subprojectNames', {
        launchMode: 'master_hierarchy',
        structureChoice: 'one_project',
        effectiveMode: 'into_existing_parent',
      }),
      'subproject_identity'
    );
    assert.equal(
      reviewEditTargetForSection('importedFields', {
        launchMode: 'master_hierarchy',
        structureChoice: 'one_project',
        effectiveMode: 'into_existing_parent',
      }),
      'fields'
    );
  });

  it('returns directly to Review after a valid destination edit', () => {
    let state = readyOneProjectState();
    state = jumpInterviewFromReview({ ...state, screen: 'review' }, 'choose_parent');
    assert.equal(state.screen, 'choose_parent');
    assert.equal(state.returnToReview, true);
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'review');
    assert.equal(state.returnToReview, false);
  });

  it('preserves field mappings when returning from destination edit', () => {
    let state = readyOneProjectState();
    const fields = state.remainingFields;
    state = jumpInterviewFromReview({ ...state, screen: 'review' }, 'choose_parent');
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'review');
    assert.deepEqual(state.remainingFields, fields);
  });

  it('keeps compatible mappings when Subproject naming remains valid', () => {
    let state = readyOneProjectState();
    state = jumpInterviewFromReview({ ...state, screen: 'review' }, 'subproject_identity');
    state = {
      ...state,
      subprojectComposition: { columnIndexes: [0], separator: ' ' },
    };
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'review');
    assert.equal(state.remainingFields.length, 2);
  });

  it('routes to Fields when remaining mappings become incomplete', () => {
    let state = readyOneProjectState();
    state = jumpInterviewFromReview({ ...state, screen: 'review' }, 'subproject_identity');
    state = {
      ...state,
      remainingFields: [
        { sourceIndex: 2, destinationKey: 'unset', placement: 'subproject' },
      ],
    };
    assert.equal(findEarliestIncompleteInterviewScreen(state), 'fields');
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'fields');
    assert.equal(state.returnToReview, true);
  });

  it('routes through earliest required screen after header-clear invalidation', () => {
    let state = readyOneProjectState();
    state = jumpInterviewFromReview({ ...state, screen: 'review' }, 'upload');
    state = {
      ...state,
      structureChoice: null,
      selectedParentProjectId: null,
      selectedParentLabel: null,
      subprojectComposition: null,
      remainingFields: [],
    };
    assert.equal(findEarliestIncompleteInterviewScreen(state), 'structure');
    state = continueInterviewAfterEdit(state);
    assert.equal(state.screen, 'structure');
    assert.equal(state.returnToReview, true);
  });

  it('maps responsive breakpoints for stacked layout', () => {
    assert.equal(resolveReviewLayoutMode(1200), 'desktop');
    assert.equal(resolveReviewLayoutMode(800), 'tablet');
    assert.equal(resolveReviewLayoutMode(480), 'mobile');
  });

  it('uses configured Project/Subproject terminology in review copy', () => {
    const copy = createBuildCoreDashboardContent(
      resolveEntityTerminology({
        project: 'Job',
        subproject: 'Unit',
      })
    ).crm.spreadsheetImport.interview.review;

    assert.equal(copy.fileTitle, 'File');
    assert.equal(copy.destinationTitle, 'Destination');
    assert.equal(copy.reviewAction, 'Review');
    assert.match(copy.subprojectNamesTitle, /Unit Names/);
    assert.match(copy.oneProjectLabel, /Job/);
    assert.match(copy.columnsMapped(12), /12 columns mapped/);
    assert.match(copy.fileMetaLine('2201', 1, 29), /Sheet: 2201/);
    assert.match(copy.fileMetaLine('2201', 1, 29), /Header row: 1/);
    assert.match(copy.fileMetaLine('2201', 1, 29), /Rows: 29/);
    assert.equal(copy.reviewFileAria, 'Review file');
    assert.equal(copy.reviewDestinationAria, 'Review destination');
    assert.match(copy.reviewSubprojectNamesAria, /Unit/);
    assert.equal(copy.reviewMappedFieldsAria, 'Review mapped fields');
    assert.match(copy.startImport(29), /29/);
    assert.match(copy.startImport(29), /Units/);
    assert.match(copy.whatNextBody(29, 'Test'), /Units/);
    assert.match(copy.fileRetention, /will not be stored/);
  });

  it('keeps review surfaces on theme tokens instead of hardcoded white panels', () => {
    const css = readFileSync(
      new URL(
        '../../../components/CrmImport/SpreadsheetImportWizard.module.css',
        import.meta.url
      ),
      'utf8'
    );
    const reviewStart = css.indexOf('/* Review screen */');
    const reviewEnd = css.indexOf('.bulkActionsRow', reviewStart);
    assert.ok(reviewStart >= 0);
    assert.ok(reviewEnd > reviewStart);
    const reviewCss = css.slice(reviewStart, reviewEnd);
    assert.match(reviewCss, /var\(--theme-surface-card/);
    assert.match(reviewCss, /var\(--color-primary/);
    assert.match(reviewCss, /\[data-theme='dark'\]/);
    assert.doesNotMatch(reviewCss, /background:\s*#fff\b/);
    assert.doesNotMatch(reviewCss, /background:\s*white\b/i);
    assert.equal(resolveReviewLayoutMode(1200), 'desktop');
    assert.equal(resolveReviewLayoutMode(800), 'tablet');
    assert.equal(resolveReviewLayoutMode(480), 'mobile');
  });
});
