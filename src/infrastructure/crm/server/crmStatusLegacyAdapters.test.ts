import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('legacy status route adapters', () => {
  const root = join(process.cwd(), 'src/infrastructure/crm/server');

  it('mark-inactive delegates to setCrmProjectsStatusForOrg', () => {
    const source = readFileSync(join(root, 'crmMarkProjectsInactiveService.ts'), 'utf8');
    assert.match(source, /setCrmProjectsStatusForOrg/);
    assert.match(source, /source:\s*'legacy_adapter'/);
    assert.doesNotMatch(source, /\.from\('crm_projects'\)\s*\.update/);
  });

  it('mark-active delegates to setCrmProjectsStatusForOrg', () => {
    const source = readFileSync(join(root, 'crmMarkProjectsActiveService.ts'), 'utf8');
    assert.match(source, /setCrmProjectsStatusForOrg/);
    assert.match(source, /status:\s*'active'/);
    assert.doesNotMatch(source, /\.from\('crm_projects'\)\s*\.update/);
  });

  it('completion delegates to setCrmProjectsStatusForOrg', () => {
    const source = readFileSync(join(root, 'crmSetProjectCompletionService.ts'), 'utf8');
    assert.match(source, /setCrmProjectsStatusForOrg/);
    assert.match(source, /complete \? 'completed' : 'active'/);
    assert.match(source, /confirmIncompleteTasks/);
    assert.doesNotMatch(source, /\.from\('crm_projects'\)\s*\.update/);
  });
});

describe('manual stage complete UI removed', () => {
  it('WorkflowTasksTable no longer wires Mark all as complete', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/presentation/components/CrmProjectDetail/WorkflowTasksTable.tsx'),
      'utf8'
    );
    assert.doesNotMatch(source, /markAllEmptyStagesComplete|completeAction|WorkflowTasksBatchCompleteButton/);
    assert.doesNotMatch(source, /onRequestToggleManualStageCompletion/);
  });
});
