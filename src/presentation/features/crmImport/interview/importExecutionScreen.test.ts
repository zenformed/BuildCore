import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

describe('Import execution screen copy and styles', () => {
  it('uses honest safe-close copy without promising email delivery', () => {
    const exec = content.crm.spreadsheetImport.interview.importExecution;
    assert.match(exec.headingRunning, /Importing your spreadsheet/i);
    assert.match(exec.bodyRunning, /creating your/i);
    assert.match(exec.safeLeaveBody, /close this window and return later/i);
    assert.equal(/email/i.test(exec.safeLeaveBody), false);
    assert.equal(/in-app notification/i.test(exec.safeLeaveBody), false);
    assert.match(exec.stagePreparing, /Preparing results/i);
    assert.equal(/Sending results/i.test(exec.stagePreparing), false);
  });

  it('labels metrics with configured Project/Subproject terminology', () => {
    const exec = content.crm.spreadsheetImport.interview.importExecution;
    assert.match(exec.metricSubprojects, /subprojects created/i);
    assert.match(exec.metricProjects, /projects created/i);
  });

  it('includes responsive vertical timeline and progressbar-oriented styles', () => {
    const css = readFileSync(
      new URL(
        '../../../components/CrmImport/SpreadsheetImportWizard.module.css',
        import.meta.url
      ),
      'utf8'
    );
    assert.match(css, /\.importExecutionScreen\s*\{/);
    assert.match(css, /\.importTimeline\s*\{/);
    assert.match(css, /\.importCompletionToast\s*\{/);
    assert.match(css, /@media \(max-width: 767px\)/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /--color-primary/);
    assert.match(css, /--theme-surface-card/);
  });

  it('stays on the progress screen for completion (Finish + toast copy)', () => {
    const actions = content.crm.spreadsheetImport.actions;
    const exec = content.crm.spreadsheetImport.interview.importExecution;
    assert.equal(actions.finish, 'Finish');
    assert.match(exec.toastCompleted, /Import complete/i);
    assert.match(exec.completeBadgeLabel, /Complete/i);
  });
});
