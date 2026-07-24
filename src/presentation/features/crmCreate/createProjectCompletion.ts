/**
 * Explicit completion behaviors for Project creation UI.
 * Navigation decisions stay in the presentation layer — never inferred from route.
 */

export type CreateProjectCompletionBehavior =
  | 'default'
  | 'create_and_import'
  | 'select_for_import';

export type CreateProjectPostCreateAction =
  | { readonly type: 'none' }
  | { readonly type: 'navigate_detail'; readonly withImportQuery: boolean }
  | { readonly type: 'navigate_subdetail' };

/**
 * Resolve what should happen after a successful primary Create submit.
 */
export function resolveCreateProjectPrimaryCompletion(input: {
  readonly completionBehavior: CreateProjectCompletionBehavior;
  readonly redirectOnCreate: boolean;
  readonly hasParentProject: boolean;
}): CreateProjectPostCreateAction {
  if (input.completionBehavior === 'select_for_import') {
    return { type: 'none' };
  }
  if (input.completionBehavior === 'create_and_import') {
    return { type: 'navigate_detail', withImportQuery: true };
  }
  // default
  if (!input.redirectOnCreate) {
    return { type: 'none' };
  }
  if (input.hasParentProject) {
    return { type: 'navigate_subdetail' };
  }
  return { type: 'navigate_detail', withImportQuery: false };
}

/**
 * Resolve what should happen after "Create & Import Spreadsheet".
 */
export function resolveCreateProjectImportCompletion(input: {
  readonly completionBehavior: CreateProjectCompletionBehavior;
}): CreateProjectPostCreateAction {
  if (input.completionBehavior === 'select_for_import') {
    return { type: 'none' };
  }
  return { type: 'navigate_detail', withImportQuery: true };
}

export function shouldShowCreateAndImportAction(input: {
  readonly completionBehavior: CreateProjectCompletionBehavior;
  readonly isEditMode: boolean;
  readonly hasParentProject: boolean;
}): boolean {
  if (input.isEditMode || input.hasParentProject) return false;
  // Only ordinary create surfaces the deliberate Create & Import action.
  return input.completionBehavior === 'default';
}

export function buildCreatedProjectDetailHref(input: {
  readonly projectDetailPath: string;
  readonly withImportQuery: boolean;
}): string {
  return input.withImportQuery
    ? `${input.projectDetailPath}?importSpreadsheet=1`
    : input.projectDetailPath;
}
