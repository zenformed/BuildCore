/**
 * Guided-interview wizard state machine for spreadsheet import.
 */

import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';
import type { CrmImportColumnComposition } from '@/domain/crm/spreadsheetImportComposition';
import type { CrmImportConflictResolutionMap } from '@/domain/crm/spreadsheetImportConflictResolution';
import type { CrmImportStructureRecommendation } from '@/domain/crm/spreadsheetImportStructureAnalysis';
import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import type { WorksheetResolutionDraft } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

export type CrmImportStructureChoice = 'one_project' | 'multiple_projects' | 'unsure';

/** How multiple Projects are laid out in the spreadsheet (asked after Multiple Projects). */
export type CrmImportMultiProjectOrganization =
  | 'repeating_column'
  | 'header_rows'
  | 'worksheet_per_project'
  | 'unsure';

export type CrmImportInterviewScreen =
  | 'upload'
  | 'header'
  | 'structure'
  | 'multi_project_organization'
  | 'coming_soon_header_rows'
  | 'select_sheets'
  | 'worksheet_projects'
  | 'worksheet_headers'
  | 'worksheet_resolve'
  | 'worksheet_resolve_summary'
  | 'worksheet_subproject_setup'
  | 'coming_soon_worksheet'
  | 'recommend'
  | 'choose_parent'
  | 'project_identity'
  | 'subproject_identity'
  | 'fields'
  | 'hierarchy_preview'
  | 'parent_resolve'
  | 'conflict'
  | 'review'
  | 'import'
  | 'results';

export type { WorksheetProjectConfig, WorksheetResolutionDraft };
export type CrmImportProgressMilestone =
  | 'upload'
  | 'structure'
  | 'fields'
  | 'review'
  | 'import';

export type CrmImportFieldPlacement = 'project' | 'subproject' | 'ignore';

export type CrmImportRemainingFieldDraft = {
  readonly sourceIndex: number;
  readonly destinationKey: string; // standard:* | existing_cf:* | new_cf:* | ignored
  readonly placement: CrmImportFieldPlacement;
};

export type CrmImportInterviewState = {
  readonly screen: CrmImportInterviewScreen;
  readonly history: readonly CrmImportInterviewScreen[];
  readonly launchMode: CrmImportMode;
  readonly structureChoice: CrmImportStructureChoice | null;
  readonly multiProjectOrganization: CrmImportMultiProjectOrganization | null;
  readonly recommendationId: string | null;
  readonly selectedParentProjectId: string | null;
  readonly selectedParentLabel: string | null;
  readonly projectComposition: CrmImportColumnComposition | null;
  readonly subprojectComposition: CrmImportColumnComposition | null;
  readonly contactComposition: CrmImportColumnComposition | null;
  /** One Project per worksheet branch — persisted selections and names. */
  readonly worksheetProjects: readonly WorksheetProjectConfig[] | null;
  /** Per-worksheet create / attach / skip decisions. */
  readonly worksheetResolutions: Readonly<Record<string, WorksheetResolutionDraft>> | null;
  /** Worksheet currently focused in the one-at-a-time resolve interview. */
  readonly activeWorksheetResolveId: string | null;
  /**
   * When headers differ across worksheets, queue of worksheetIds for per-sheet
   * Subproject identity setup. Null/empty means shared single setup.
   */
  readonly worksheetSubprojectQueue: readonly string[] | null;
  readonly activeWorksheetSetupId: string | null;
  readonly remainingFields: readonly CrmImportRemainingFieldDraft[];
  readonly groupResolutions: Readonly<
    Record<
      string,
      {
        readonly type: 'create_new' | 'attach_existing' | 'ignore';
        readonly attachProjectId?: string;
        readonly attachLabel?: string;
        readonly conflictResolutions?: CrmImportConflictResolutionMap;
      }
    >
  >;
  readonly activeGroupKey: string | null;
  readonly activeConflictFieldKey: string | null;
  readonly structuralLocked: boolean;
  /** When true, Continue after an Edit from Review returns to Review when safe. */
  readonly returnToReview: boolean;
};

export function createInitialInterviewState(input: {
  readonly launchMode: CrmImportMode;
  readonly fixedParentProjectId?: string | null;
  readonly fixedParentDisplayName?: string | null;
}): CrmImportInterviewState {
  const hasFixedParent =
    input.launchMode === 'into_existing_parent' && Boolean(input.fixedParentProjectId);

  return {
    screen: 'upload',
    history: [],
    launchMode: input.launchMode,
    structureChoice: hasFixedParent ? 'one_project' : null,
    multiProjectOrganization: null,
    recommendationId: null,
    selectedParentProjectId: input.fixedParentProjectId ?? null,
    selectedParentLabel: input.fixedParentDisplayName ?? null,
    projectComposition: null,
    subprojectComposition: null,
    contactComposition: null,
    worksheetProjects: null,
    worksheetResolutions: null,
    activeWorksheetResolveId: null,
    worksheetSubprojectQueue: null,
    activeWorksheetSetupId: null,
    remainingFields: [],
    groupResolutions: {},
    activeGroupKey: null,
    activeConflictFieldKey: null,
    structuralLocked: false,
    returnToReview: false,
  };
}

export function interviewScreenToMilestone(
  screen: CrmImportInterviewScreen
): CrmImportProgressMilestone {
  switch (screen) {
    case 'upload':
    case 'header':
      return 'upload';
    case 'structure':
    case 'multi_project_organization':
    case 'coming_soon_header_rows':
    case 'select_sheets':
    case 'worksheet_projects':
    case 'worksheet_headers':
    case 'worksheet_resolve':
    case 'worksheet_resolve_summary':
    case 'worksheet_subproject_setup':
    case 'coming_soon_worksheet':
    case 'recommend':
    case 'choose_parent':
    case 'project_identity':
    case 'subproject_identity':
      return 'structure';
    case 'fields':
    case 'hierarchy_preview':
    case 'parent_resolve':
    case 'conflict':
      return 'fields';
    case 'review':
      return 'review';
    case 'import':
    case 'results':
      return 'import';
    default:
      return 'upload';
  }
}

export function milestonesForInterview(state: CrmImportInterviewState): readonly CrmImportProgressMilestone[] {
  return ['upload', 'structure', 'fields', 'review', 'import'];
}

export function resolveEffectiveImportMode(state: CrmImportInterviewState): CrmImportMode {
  if (state.launchMode === 'into_existing_parent') return 'into_existing_parent';
  if (state.multiProjectOrganization === 'worksheet_per_project') return 'master_hierarchy';
  if (state.structureChoice === 'one_project') return 'into_existing_parent';
  return 'master_hierarchy';
}

function nextAfterStructure(state: CrmImportInterviewState): CrmImportInterviewScreen {
  if (state.structureChoice === 'unsure') return 'recommend';
  if (state.structureChoice === 'one_project') {
    if (state.selectedParentProjectId && state.launchMode === 'into_existing_parent') {
      return 'subproject_identity';
    }
    return 'select_sheets';
  }
  return 'multi_project_organization';
}

function nextAfterMultiProjectOrganization(
  state: CrmImportInterviewState
): CrmImportInterviewScreen | null {
  switch (state.multiProjectOrganization) {
    case 'repeating_column':
      // Headers were deferred until after structure for projects-page launches.
      return 'header';
    case 'header_rows':
      return 'coming_soon_header_rows';
    case 'worksheet_per_project':
      return 'worksheet_projects';
    case 'unsure':
      return 'recommend';
    default:
      return null;
  }
}

export function getNextInterviewScreen(state: CrmImportInterviewState): CrmImportInterviewScreen | null {
  switch (state.screen) {
    case 'upload':
      // Projects-page flow: structure before headers so sheet/parent choices come first.
      return state.launchMode === 'into_existing_parent' ? 'header' : 'structure';
    case 'header':
      if (state.launchMode === 'into_existing_parent') return 'subproject_identity';
      if (state.structureChoice === 'one_project') return 'subproject_identity';
      if (state.multiProjectOrganization === 'repeating_column') return 'project_identity';
      return 'structure';
    case 'structure':
      return nextAfterStructure(state);
    case 'multi_project_organization':
      return nextAfterMultiProjectOrganization(state);
    case 'select_sheets':
      return 'choose_parent';
    case 'worksheet_projects':
      return 'worksheet_headers';
    case 'worksheet_headers':
      return 'worksheet_resolve_summary';
    case 'worksheet_resolve':
      return 'worksheet_resolve_summary';
    case 'worksheet_resolve_summary':
      // Overridden by wizard when headers mismatch (worksheet_subproject_setup).
      return 'subproject_identity';
    case 'worksheet_subproject_setup':
      return 'fields';
    case 'coming_soon_header_rows':
    case 'coming_soon_worksheet':
      return null;
    case 'recommend':
      return state.structureChoice === 'one_project' ? 'select_sheets' : 'project_identity';
    case 'choose_parent':
      return 'header';
    case 'project_identity':
      return 'subproject_identity';
    case 'subproject_identity':
      return 'fields';
    case 'fields':
      return 'review';
    case 'hierarchy_preview':
    case 'parent_resolve':
    case 'conflict':
      // Kept for back-compat if present in history; no longer in the forward path.
      return 'review';
    case 'review':
      return 'import';
    case 'import':
      return 'results';
    case 'results':
      return null;
    default:
      return null;
  }
}

export function goInterviewForward(state: CrmImportInterviewState): CrmImportInterviewState {
  const next = getNextInterviewScreen(state);
  if (next == null) return state;
  return {
    ...state,
    history: [...state.history, state.screen],
    screen: next,
  };
}

export function goInterviewBack(state: CrmImportInterviewState): CrmImportInterviewState {
  if (state.history.length === 0) return state;
  if (state.structuralLocked && (state.screen === 'import' || state.screen === 'results')) {
    return state;
  }
  const previous = state.history[state.history.length - 1]!;
  return {
    ...state,
    screen: previous,
    history: state.history.slice(0, -1),
    returnToReview: previous === 'review' ? false : state.returnToReview,
  };
}

export function jumpInterviewTo(
  state: CrmImportInterviewState,
  screen: CrmImportInterviewScreen
): CrmImportInterviewState {
  if (state.structuralLocked && (state.screen === 'import' || state.screen === 'results')) {
    return state;
  }
  return {
    ...state,
    history: [...state.history, state.screen],
    screen,
  };
}

/** Edit from Review: preserve answers and mark that Continue should return to Review when safe. */
export function jumpInterviewFromReview(
  state: CrmImportInterviewState,
  screen: CrmImportInterviewScreen
): CrmImportInterviewState {
  if (state.structuralLocked && (state.screen === 'import' || state.screen === 'results')) {
    return state;
  }
  return {
    ...state,
    history: [...state.history, state.screen],
    screen,
    returnToReview: true,
  };
}

/** Changing one/multiple clears incompatible downstream answers. */
export function applyStructureChoice(
  state: CrmImportInterviewState,
  choice: CrmImportStructureChoice
): CrmImportInterviewState {
  const keepParent =
    choice === 'one_project' && state.launchMode === 'into_existing_parent'
      ? {
          selectedParentProjectId: state.selectedParentProjectId,
          selectedParentLabel: state.selectedParentLabel,
        }
      : choice === 'one_project'
        ? {
            selectedParentProjectId: state.selectedParentProjectId,
            selectedParentLabel: state.selectedParentLabel,
          }
        : { selectedParentProjectId: null, selectedParentLabel: null };

  return {
    ...state,
    structureChoice: choice,
    multiProjectOrganization: null,
    recommendationId: null,
    projectComposition: choice === 'multiple_projects' ? state.projectComposition : null,
    worksheetProjects: choice === 'one_project' ? state.worksheetProjects : null,
    worksheetResolutions: null,
    activeWorksheetResolveId: null,
    worksheetSubprojectQueue: null,
    activeWorksheetSetupId: null,
    groupResolutions: {},
    activeGroupKey: null,
    activeConflictFieldKey: null,
    ...keepParent,
  };
}

export function applyMultiProjectOrganization(
  state: CrmImportInterviewState,
  organization: CrmImportMultiProjectOrganization
): CrmImportInterviewState {
  return {
    ...state,
    multiProjectOrganization: organization,
    recommendationId: null,
    // Non-column layouts cannot use the existing project-column composition yet.
    projectComposition:
      organization === 'repeating_column' ? state.projectComposition : null,
    worksheetProjects:
      organization === 'worksheet_per_project' ? state.worksheetProjects : null,
    worksheetResolutions:
      organization === 'worksheet_per_project' ? state.worksheetResolutions : null,
    activeWorksheetResolveId:
      organization === 'worksheet_per_project' ? state.activeWorksheetResolveId : null,
    worksheetSubprojectQueue:
      organization === 'worksheet_per_project' ? state.worksheetSubprojectQueue : null,
    activeWorksheetSetupId:
      organization === 'worksheet_per_project' ? state.activeWorksheetSetupId : null,
    groupResolutions: {},
    activeGroupKey: null,
    activeConflictFieldKey: null,
  };
}

export function applyRecommendation(
  state: CrmImportInterviewState,
  recommendation: CrmImportStructureRecommendation
): CrmImportInterviewState {
  if (recommendation.kind === 'one_project') {
    return {
      ...applyStructureChoice(state, 'one_project'),
      recommendationId: recommendation.id,
      projectComposition: null,
    };
  }
  return {
    ...applyStructureChoice(state, 'multiple_projects'),
    recommendationId: recommendation.id,
    multiProjectOrganization: 'repeating_column',
    projectComposition: {
      columnIndexes: recommendation.columnIndexes,
      separator: recommendation.columnIndexes.length > 1 ? ' - ' : ' ',
    },
  };
}

export function clearDownstreamAfterHeaderChange(
  state: CrmImportInterviewState
): CrmImportInterviewState {
  return {
    ...state,
    multiProjectOrganization: null,
    projectComposition: null,
    subprojectComposition: null,
    contactComposition: null,
    worksheetProjects: null,
    worksheetResolutions: null,
    activeWorksheetResolveId: null,
    worksheetSubprojectQueue: null,
    activeWorksheetSetupId: null,
    remainingFields: [],
    groupResolutions: {},
    activeGroupKey: null,
    activeConflictFieldKey: null,
    recommendationId: null,
  };
}

export function clearDownstreamAfterProjectIdentityChange(
  state: CrmImportInterviewState
): CrmImportInterviewState {
  return {
    ...state,
    groupResolutions: {},
    activeGroupKey: null,
    activeConflictFieldKey: null,
  };
}
