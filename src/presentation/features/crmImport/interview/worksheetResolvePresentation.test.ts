import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  WorksheetProjectConfig,
  WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  allIncludedWorksheetsConfirmed,
  analyzeWorksheetHeaderCompatibility,
  buildDefaultWorksheetResolutions,
  buildWorksheetGroupResolutions,
  buildWorksheetProgressItems,
  canContinueWorksheetResolve,
  collectBlockingDuplicateCreateNames,
  confirmWorksheetResolution,
  firstIncludedWorksheetId,
  isCurrentWorksheetResolutionSavable,
  mergeWorksheetResolutions,
  nextScreenAfterWorksheetResolve,
  nextUnresolvedWorksheetId,
  previousIncludedWorksheetId,
  summarizeWorksheetImportReview,
  summarizeWorksheetResolveSelection,
  updateWorksheetResolutionAttach,
  updateWorksheetResolutionKind,
  validateCurrentWorksheetResolution,
  worksheetIndexAmongIncluded,
  worksheetParentDisplayName,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

function config(
  partial: Partial<WorksheetProjectConfig> & Pick<WorksheetProjectConfig, 'worksheetId' | 'worksheetName'>
): WorksheetProjectConfig {
  return {
    included: true,
    projectName: partial.worksheetName,
    headerRowIndex: 0,
    dataRowCount: 10,
    columnCount: 4,
    ...partial,
  };
}

function confirmAll(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): Readonly<Record<string, WorksheetResolutionDraft>> {
  let next = resolutions;
  for (const item of configs.filter((c) => c.included)) {
    next = confirmWorksheetResolution(next, item.worksheetId);
  }
  return next;
}

describe('worksheetResolvePresentation', () => {
  it('defaults included worksheets to create_new and unconfirmed', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak Ridge' }),
      config({ worksheetId: 'b', worksheetName: 'Maple', included: false }),
    ];
    const resolutions = buildDefaultWorksheetResolutions(configs);
    assert.equal(resolutions.a?.kind, 'create_new');
    assert.equal(resolutions.a?.confirmed, false);
    assert.equal(resolutions.b, undefined);
  });

  it('preserves prior attach selections and confirmed when merging', () => {
    const configs = [config({ worksheetId: 'a', worksheetName: 'Oak Ridge' })];
    const previous: Record<string, WorksheetResolutionDraft> = {
      a: {
        kind: 'attach_existing',
        existingProjectId: 'p1',
        existingProjectLabel: 'Existing Oak',
        confirmed: true,
      },
    };
    const merged = mergeWorksheetResolutions(previous, configs);
    assert.equal(merged.a?.kind, 'attach_existing');
    assert.equal(merged.a?.existingProjectId, 'p1');
    assert.equal(merged.a?.confirmed, true);
  });

  it('tracks one worksheet at a time with progress strip kinds', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak Ridge', dataRowCount: 29 }),
      config({ worksheetId: 'b', worksheetName: 'Maple Grove', dataRowCount: 29 }),
    ];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    assert.equal(firstIncludedWorksheetId(configs), 'a');
    assert.equal(worksheetIndexAmongIncluded(configs, 'a'), 0);
    assert.equal(previousIncludedWorksheetId(configs, 'a'), null);
    assert.equal(previousIncludedWorksheetId(configs, 'b'), 'a');

    let progress = buildWorksheetProgressItems({ configs, resolutions });
    assert.deepEqual(
      progress.map((item) => item.kind),
      ['needs_review', 'needs_review']
    );

    resolutions = confirmWorksheetResolution(resolutions, 'a');
    progress = buildWorksheetProgressItems({ configs, resolutions });
    assert.equal(progress[0]?.kind, 'complete');
    assert.equal(progress[1]?.kind, 'needs_review');
    assert.equal(nextUnresolvedWorksheetId(configs, resolutions, 'a'), 'b');

    resolutions = updateWorksheetResolutionKind(resolutions, 'b', 'skip');
    resolutions = confirmWorksheetResolution(resolutions, 'b');
    progress = buildWorksheetProgressItems({ configs, resolutions });
    assert.equal(progress[1]?.kind, 'skipped');
    assert.equal(nextUnresolvedWorksheetId(configs, resolutions, 'b'), null);
    assert.equal(allIncludedWorksheetsConfirmed(configs, resolutions), true);
  });

  it('validates create, attach, skip, and duplicate names for the current worksheet', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak', projectName: 'Oak' }),
      config({ worksheetId: 'b', worksheetName: 'Maple', projectName: 'Oak' }),
    ];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    assert.equal(
      validateCurrentWorksheetResolution({
        config: configs[0]!,
        resolution: resolutions.a,
        configs,
        resolutions,
      }),
      'duplicate_name'
    );
    assert.ok(collectBlockingDuplicateCreateNames(configs, resolutions).has('oak'));

    const blank = [config({ worksheetId: 'a', worksheetName: 'Oak', projectName: '   ' })];
    resolutions = buildDefaultWorksheetResolutions(blank);
    assert.equal(
      validateCurrentWorksheetResolution({
        config: blank[0]!,
        resolution: resolutions.a,
        configs: blank,
        resolutions,
      }),
      'missing_name'
    );
    assert.equal(
      isCurrentWorksheetResolutionSavable({
        config: blank[0]!,
        resolution: resolutions.a,
        configs: blank,
        resolutions,
      }),
      false
    );

    const attachConfigs = [config({ worksheetId: 'a', worksheetName: 'Oak' })];
    resolutions = buildDefaultWorksheetResolutions(attachConfigs);
    resolutions = updateWorksheetResolutionKind(resolutions, 'a', 'attach_existing');
    assert.equal(
      validateCurrentWorksheetResolution({
        config: attachConfigs[0]!,
        resolution: resolutions.a,
        configs: attachConfigs,
        resolutions,
      }),
      'needs_project'
    );
    resolutions = updateWorksheetResolutionAttach(resolutions, 'a', 'p1', 'Parent');
    assert.equal(
      validateCurrentWorksheetResolution({
        config: attachConfigs[0]!,
        resolution: resolutions.a,
        configs: attachConfigs,
        resolutions,
      }),
      'ok'
    );

    resolutions = updateWorksheetResolutionKind(resolutions, 'a', 'skip');
    assert.equal(
      validateCurrentWorksheetResolution({
        config: attachConfigs[0]!,
        resolution: resolutions.a,
        configs: attachConfigs,
        resolutions,
      }),
      'ok'
    );
  });

  it('blocks Continue until every worksheet is confirmed and at least one imports', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak', dataRowCount: 142 }),
      config({ worksheetId: 'b', worksheetName: 'Maple', dataRowCount: 87 }),
    ];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    assert.equal(canContinueWorksheetResolve(configs, resolutions), false);

    resolutions = updateWorksheetResolutionAttach(resolutions, 'a', 'p1', 'Parent');
    resolutions = updateWorksheetResolutionKind(resolutions, 'b', 'skip');
    assert.equal(canContinueWorksheetResolve(configs, resolutions), false);

    resolutions = confirmAll(configs, resolutions);
    assert.equal(canContinueWorksheetResolve(configs, resolutions), true);

    const summary = summarizeWorksheetResolveSelection({ configs, resolutions });
    assert.equal(summary.importingCount, 1);
    assert.equal(summary.totalRows, 142);
    assert.equal(summary.projectCount, 1);
  });

  it('aggregates Review totals across worksheets', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: '2201', dataRowCount: 29, projectName: 'Test' }),
      config({
        worksheetId: 'b',
        worksheetName: '2202',
        dataRowCount: 29,
        projectName: 'Zenformed LLC',
      }),
    ];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = updateWorksheetResolutionAttach(resolutions, 'a', 'p1', 'Test');
    resolutions = updateWorksheetResolutionAttach(resolutions, 'b', 'p2', 'Zenformed LLC');
    resolutions = confirmAll(configs, resolutions);

    const review = summarizeWorksheetImportReview({ configs, resolutions });
    assert.equal(review.sheetsCount, 2);
    assert.equal(review.rowsCount, 58);
    assert.equal(review.groupsSummary.created, 58);
    assert.equal(review.groupsSummary.attached, 0);
    assert.equal(review.groupsSummary.ignored, 0);
    assert.equal(review.destinationLabel, 'Test · Zenformed LLC');
  });

  it('disables Continue when every worksheet is skipped', () => {
    const configs = [config({ worksheetId: 'a', worksheetName: 'Oak' })];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = updateWorksheetResolutionKind(resolutions, 'a', 'skip');
    resolutions = confirmWorksheetResolution(resolutions, 'a');
    assert.equal(canContinueWorksheetResolve(configs, resolutions), false);
  });

  it('changing resolution kind clears confirmed', () => {
    const configs = [config({ worksheetId: 'a', worksheetName: 'Oak' })];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = confirmWorksheetResolution(resolutions, 'a');
    assert.equal(resolutions.a?.confirmed, true);
    resolutions = updateWorksheetResolutionKind(resolutions, 'a', 'skip');
    assert.equal(resolutions.a?.confirmed, false);
    assert.equal(resolutions.a?.kind, 'skip');
  });

  it('detects identical vs mismatched headers for next-step branching', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak', headerRowIndex: 0 }),
      config({ worksheetId: 'b', worksheetName: 'Maple', headerRowIndex: 0 }),
    ];
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = confirmAll(configs, resolutions);
    const identicalSheets = new Map<string, WorksheetSheetInput>([
      [
        'a',
        {
          worksheetId: 'a',
          worksheetName: 'Oak',
          matrix: [
            ['Unit', 'Status'],
            ['1', 'Open'],
          ],
        },
      ],
      [
        'b',
        {
          worksheetId: 'b',
          worksheetName: 'Maple',
          matrix: [
            ['Unit', 'Status'],
            ['2', 'Sold'],
          ],
        },
      ],
    ]);
    const identical = analyzeWorksheetHeaderCompatibility({
      configs,
      resolutions,
      sheetsById: identicalSheets,
    });
    assert.equal(identical.kind, 'identical');
    assert.equal(nextScreenAfterWorksheetResolve(identical), 'subproject_identity');

    const mismatchedSheets = new Map<string, WorksheetSheetInput>([
      [
        'a',
        {
          worksheetId: 'a',
          worksheetName: 'Oak',
          matrix: [
            ['Unit', 'Status'],
            ['1', 'Open'],
          ],
        },
      ],
      [
        'b',
        {
          worksheetId: 'b',
          worksheetName: 'Maple',
          matrix: [
            ['Lot', 'Buyer'],
            ['2', 'Amy'],
          ],
        },
      ],
    ]);
    const mismatched = analyzeWorksheetHeaderCompatibility({
      configs,
      resolutions,
      sheetsById: mismatchedSheets,
    });
    assert.equal(mismatched.kind, 'mismatched');
    assert.equal(nextScreenAfterWorksheetResolve(mismatched), 'worksheet_subproject_setup');
  });

  it('maps worksheet attach/create decisions onto hierarchy group resolutions', () => {
    const configs = [
      config({ worksheetId: 'a', worksheetName: 'Oak', projectName: 'Oak Ridge' }),
      config({ worksheetId: 'b', worksheetName: 'Maple', projectName: 'Maple Grove' }),
    ];
    const resolutions: Record<string, WorksheetResolutionDraft> = {
      a: {
        kind: 'attach_existing',
        existingProjectId: 'proj-1',
        existingProjectLabel: 'Oak Ridge',
        confirmed: true,
      },
      b: {
        kind: 'create_new',
        existingProjectId: null,
        existingProjectLabel: null,
        confirmed: true,
      },
    };
    assert.equal(worksheetParentDisplayName(configs[0]!, resolutions.a), 'Oak Ridge');
    const groups = buildWorksheetGroupResolutions(configs, resolutions);
    assert.deepEqual(groups['name:oak ridge'], {
      type: 'attach_existing',
      attachProjectId: 'proj-1',
      attachLabel: 'Oak Ridge',
    });
    assert.deepEqual(groups['name:maple grove'], { type: 'create_new' });
  });
});
