import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';
import { createBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import {
  assignWorksheetExistingProject,
  buildInitialWorksheetProjectConfigs,
  buildWorksheetProjectRowViews,
  canContinueWorksheetProjects,
  computeWorksheetStatsForHeader,
  deriveWorksheetProjectStatus,
  includeWorksheetForAssignment,
  mergeWorksheetProjectConfigs,
  skipWorksheetAssignment,
  summarizeWorksheetProjectSelection,
  syncWorksheetResolutionsForContinue,
  toUserFacingSpreadsheetRowNumber,
  updateWorksheetProjectHeaderRow,
  updateWorksheetProjectName,
  type WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  buildDefaultWorksheetResolutions,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

function sheet(
  id: string,
  name: string,
  matrix: readonly (readonly string[])[]
): WorksheetSheetInput {
  return { worksheetId: id, worksheetName: name, matrix };
}

const OAK: WorksheetSheetInput = sheet('oak', 'Oak Ridge', [
  ['Unit', 'Status'],
  ['101', 'Open'],
  ['102', 'Sold'],
]);

const MAPLE: WorksheetSheetInput = sheet('maple', 'Maple Grove', [
  ['Lot', 'Buyer'],
  ['1', 'Amy'],
]);

const EMPTY: WorksheetSheetInput = sheet('sunset', 'Sunset Villas', [['', ''], ['', '']]);

describe('worksheetProjectsPresentation', () => {
  it('defaults non-empty worksheets included and empty worksheets unchecked', () => {
    const configs = buildInitialWorksheetProjectConfigs([OAK, MAPLE, EMPTY]);
    assert.equal(configs.length, 3);
    assert.equal(configs[0]?.included, true);
    assert.equal(configs[0]?.projectName, 'Oak Ridge');
    assert.equal(configs[1]?.included, true);
    assert.equal(configs[2]?.included, false);
    assert.equal(configs[2]?.dataRowCount, 0);
  });

  it('excludes the header row from importable row counts', () => {
    const stats = computeWorksheetStatsForHeader(OAK.matrix, 0);
    assert.equal(stats.dataRowCount, 2);
    assert.equal(stats.columnCount, 2);
  });

  it('uses one-based header row numbering helpers', () => {
    assert.equal(toUserFacingSpreadsheetRowNumber(0), 1);
  });

  it('updates row and column counts when the header row changes', () => {
    const configs = buildInitialWorksheetProjectConfigs([OAK]);
    const next = updateWorksheetProjectHeaderRow(configs, 'oak', 1, OAK.matrix);
    assert.equal(next[0]?.headerRowIndex, 1);
    assert.equal(next[0]?.dataRowCount, 1);
  });

  it('preserves edited project names when merging configs', () => {
    const initial = buildInitialWorksheetProjectConfigs([OAK, MAPLE]);
    const edited = updateWorksheetProjectName(initial, 'oak', 'Oak Ridge Renamed');
    const merged = mergeWorksheetProjectConfigs(edited, [OAK, MAPLE, EMPTY]);
    assert.equal(merged.find((c) => c.worksheetId === 'oak')?.projectName, 'Oak Ridge Renamed');
    assert.equal(merged.find((c) => c.worksheetId === 'sunset')?.included, false);
  });

  it('marks Needs review until a Project is assigned, then Ready', () => {
    const configs = buildInitialWorksheetProjectConfigs([OAK]);
    let resolutions = buildDefaultWorksheetResolutions(configs);
    assert.equal(
      deriveWorksheetProjectStatus({
        config: configs[0]!,
        resolution: resolutions.oak,
        importable: true,
      }),
      'needs_review'
    );
    assert.equal(
      canContinueWorksheetProjects(configs, resolutions, new Map([['oak', OAK]])),
      false
    );

    resolutions = assignWorksheetExistingProject({
      resolutions,
      worksheetId: 'oak',
      projectId: 'p1',
      projectLabel: 'Oak Apartments',
    });
    assert.equal(
      deriveWorksheetProjectStatus({
        config: configs[0]!,
        resolution: resolutions.oak,
        importable: true,
      }),
      'ready'
    );
    assert.equal(
      canContinueWorksheetProjects(configs, resolutions, new Map([['oak', OAK]])),
      true
    );
  });

  it('Skip removes the worksheet from selection and marks skipped', () => {
    let configs = buildInitialWorksheetProjectConfigs([OAK, MAPLE]);
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = assignWorksheetExistingProject({
      resolutions,
      worksheetId: 'oak',
      projectId: 'p1',
      projectLabel: 'Oak',
    });
    const skipped = skipWorksheetAssignment({
      configs,
      resolutions,
      worksheetId: 'maple',
    });
    configs = skipped.configs;
    resolutions = skipped.resolutions;
    assert.equal(configs.find((c) => c.worksheetId === 'maple')?.included, false);
    assert.equal(resolutions.maple?.kind, 'skip');
    assert.equal(resolutions.maple?.confirmed, true);
    assert.equal(
      deriveWorksheetProjectStatus({
        config: configs.find((c) => c.worksheetId === 'maple')!,
        resolution: resolutions.maple,
        importable: true,
      }),
      'skipped'
    );
    assert.equal(
      canContinueWorksheetProjects(
        configs,
        resolutions,
        new Map([
          ['oak', OAK],
          ['maple', MAPLE],
        ])
      ),
      true
    );
    const summary = summarizeWorksheetProjectSelection(configs);
    assert.equal(summary.selectedCount, 1);
    assert.equal(summary.totalRows, 2);
  });

  it('blocks Continue when every worksheet is skipped', () => {
    let configs = buildInitialWorksheetProjectConfigs([OAK]);
    let resolutions: Readonly<Record<string, WorksheetResolutionDraft>> =
      buildDefaultWorksheetResolutions(configs);
    const skipped = skipWorksheetAssignment({
      configs,
      resolutions,
      worksheetId: 'oak',
    });
    configs = skipped.configs;
    resolutions = skipped.resolutions;
    assert.equal(
      canContinueWorksheetProjects(configs, resolutions, new Map([['oak', OAK]])),
      false
    );
  });

  it('re-including a skipped worksheet returns it to Needs review', () => {
    let configs = buildInitialWorksheetProjectConfigs([OAK]);
    let resolutions = buildDefaultWorksheetResolutions(configs);
    const skipped = skipWorksheetAssignment({ configs, resolutions, worksheetId: 'oak' });
    const included = includeWorksheetForAssignment({
      configs: skipped.configs,
      resolutions: skipped.resolutions,
      worksheetId: 'oak',
    });
    configs = included.configs;
    resolutions = included.resolutions;
    assert.equal(configs[0]?.included, true);
    assert.equal(
      deriveWorksheetProjectStatus({
        config: configs[0]!,
        resolution: resolutions.oak,
        importable: true,
      }),
      'needs_review'
    );
  });

  it('marks No data for empty worksheets in row views', () => {
    const configs = buildInitialWorksheetProjectConfigs([OAK, EMPTY]);
    const resolutions = buildDefaultWorksheetResolutions(configs);
    const sheetsById = new Map([
      ['oak', OAK],
      ['sunset', EMPTY],
    ]);
    const views = buildWorksheetProjectRowViews({ configs, resolutions, sheetsById });
    assert.equal(views[0]?.status, 'needs_review');
    assert.equal(views[1]?.status, 'no_data');
    assert.equal(views[1]?.importable, false);
  });

  it('syncs skip resolutions for unincluded sheets before Continue', () => {
    const configs = buildInitialWorksheetProjectConfigs([OAK, MAPLE]);
    let resolutions = buildDefaultWorksheetResolutions(configs);
    resolutions = assignWorksheetExistingProject({
      resolutions,
      worksheetId: 'oak',
      projectId: 'p1',
      projectLabel: 'Oak',
    });
    const unchecked = configs.map((config) =>
      config.worksheetId === 'maple' ? { ...config, included: false } : config
    );
    const synced = syncWorksheetResolutionsForContinue({
      configs: unchecked,
      resolutions,
    });
    assert.equal(synced.maple?.kind, 'skip');
    assert.equal(synced.maple?.confirmed, true);
    assert.equal(synced.oak?.confirmed, true);
  });

  it('uses configured Project terminology in worksheet Projects copy', () => {
    const copy = createBuildCoreDashboardContent(
      resolveEntityTerminology({ project: 'Job', subproject: 'Unit' })
    ).crm.spreadsheetImport.interview.worksheetProjects;
    assert.match(copy.foundSupporting, /Job/);
    assert.match(copy.colProjectName, /Job/);
    assert.match(copy.howThisWorksBody, /units/i);
    assert.match(copy.newProjectButton, /Job/);
  });
});
