import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreatedProjectDetailHref,
  resolveCreateProjectImportCompletion,
  resolveCreateProjectPrimaryCompletion,
  shouldShowCreateAndImportAction,
} from '@/presentation/features/crmCreate/createProjectCompletion';

describe('createProjectCompletion', () => {
  it('default primary create navigates to project detail without import query', () => {
    assert.deepEqual(
      resolveCreateProjectPrimaryCompletion({
        completionBehavior: 'default',
        redirectOnCreate: true,
        hasParentProject: false,
      }),
      { type: 'navigate_detail', withImportQuery: false }
    );
    assert.equal(
      buildCreatedProjectDetailHref({
        projectDetailPath: '/projects/oak',
        withImportQuery: false,
      }),
      '/projects/oak'
    );
  });

  it('default Create & Import navigates with importSpreadsheet=1', () => {
    assert.deepEqual(
      resolveCreateProjectImportCompletion({ completionBehavior: 'default' }),
      { type: 'navigate_detail', withImportQuery: true }
    );
    assert.equal(
      buildCreatedProjectDetailHref({
        projectDetailPath: '/projects/oak',
        withImportQuery: true,
      }),
      '/projects/oak?importSpreadsheet=1'
    );
  });

  it('select_for_import never navigates and hides Create & Import', () => {
    assert.deepEqual(
      resolveCreateProjectPrimaryCompletion({
        completionBehavior: 'select_for_import',
        redirectOnCreate: true,
        hasParentProject: false,
      }),
      { type: 'none' }
    );
    assert.deepEqual(
      resolveCreateProjectImportCompletion({ completionBehavior: 'select_for_import' }),
      { type: 'none' }
    );
    assert.equal(
      shouldShowCreateAndImportAction({
        completionBehavior: 'select_for_import',
        isEditMode: false,
        hasParentProject: false,
      }),
      false
    );
  });

  it('select_for_import ignores redirectOnCreate true (no dashboard redirect)', () => {
    const action = resolveCreateProjectPrimaryCompletion({
      completionBehavior: 'select_for_import',
      redirectOnCreate: true,
      hasParentProject: false,
    });
    assert.equal(action.type, 'none');
  });

  it('embedded create with redirectOnCreate false stays put but can still show Create & Import', () => {
    assert.deepEqual(
      resolveCreateProjectPrimaryCompletion({
        completionBehavior: 'default',
        redirectOnCreate: false,
        hasParentProject: false,
      }),
      { type: 'none' }
    );
    assert.equal(
      shouldShowCreateAndImportAction({
        completionBehavior: 'default',
        isEditMode: false,
        hasParentProject: false,
      }),
      true
    );
  });

  it('create_and_import completion forces import query navigation', () => {
    assert.deepEqual(
      resolveCreateProjectPrimaryCompletion({
        completionBehavior: 'create_and_import',
        redirectOnCreate: false,
        hasParentProject: false,
      }),
      { type: 'navigate_detail', withImportQuery: true }
    );
  });

  it('subproject create navigates to subdetail when redirecting', () => {
    assert.deepEqual(
      resolveCreateProjectPrimaryCompletion({
        completionBehavior: 'default',
        redirectOnCreate: true,
        hasParentProject: true,
      }),
      { type: 'navigate_subdetail' }
    );
    assert.equal(
      shouldShowCreateAndImportAction({
        completionBehavior: 'default',
        isEditMode: false,
        hasParentProject: true,
      }),
      false
    );
  });
});
