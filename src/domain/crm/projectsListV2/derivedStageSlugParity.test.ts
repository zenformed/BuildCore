import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveDerivedWorkflowStageSlugFromProgressInput } from '@/domain/buildcore/projectPipelineProgress';
import type { CrmProjectWorkflowProgressInput } from '@/domain/crm/projectWorkflowProgressInput';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import { computeCrmProjectDerivedStageSlugParity } from './derivedStageSlugParity';

const STAGES: readonly PipelineStage[] = [
  { slug: 'new-lead', label: 'New Lead', sortOrder: 1 },
  { slug: 'scheduled', label: 'Scheduled', sortOrder: 2 },
  { slug: 'in-progress', label: 'In Progress', sortOrder: 3 },
  { slug: 'complete', label: 'Complete', sortOrder: 4 },
];

describe('crm_project_derived_stage_slug parity', () => {
  it('matches TS resolver: first incomplete stage with open ops tasks', () => {
    const workflowProgressInput: CrmProjectWorkflowProgressInput = {
      tasks: [
        { stageSlug: 'new-lead', status: 'done', amountCents: null },
        { stageSlug: 'scheduled', status: 'pending', amountCents: null },
      ],
      manualStageCompletionSlugs: [],
    };

    const fromTs = resolveDerivedWorkflowStageSlugFromProgressInput({
      workflowProgressInput,
      stages: STAGES,
    });

    const fromSqlMirror = computeCrmProjectDerivedStageSlugParity({
      activeStageSlugsInOrder: ['new-lead', 'scheduled', 'in-progress'],
      tasks: [
        { stageSlug: 'new-lead', status: 'done', isPayment: false },
        { stageSlug: 'scheduled', status: 'pending', isPayment: false },
      ],
      manualCompletedStageSlugs: [],
    });

    assert.equal(fromTs, 'scheduled');
    assert.equal(fromSqlMirror, fromTs);
  });

  it('matches TS resolver: empty stages use manual completion then advance', () => {
    const workflowProgressInput: CrmProjectWorkflowProgressInput = {
      tasks: [],
      manualStageCompletionSlugs: ['new-lead'],
    };

    const fromTs = resolveDerivedWorkflowStageSlugFromProgressInput({
      workflowProgressInput,
      stages: STAGES,
    });

    const fromSqlMirror = computeCrmProjectDerivedStageSlugParity({
      activeStageSlugsInOrder: ['new-lead', 'scheduled', 'in-progress'],
      tasks: [],
      manualCompletedStageSlugs: ['new-lead'],
    });

    assert.equal(fromTs, 'scheduled');
    assert.equal(fromSqlMirror, fromTs);
  });

  it('matches TS resolver: all complete → complete', () => {
    const workflowProgressInput: CrmProjectWorkflowProgressInput = {
      tasks: [
        { stageSlug: 'new-lead', status: 'done', amountCents: null },
        { stageSlug: 'scheduled', status: 'done', amountCents: null },
        { stageSlug: 'in-progress', status: 'done', amountCents: null },
      ],
      manualStageCompletionSlugs: [],
    };

    const fromTs = resolveDerivedWorkflowStageSlugFromProgressInput({
      workflowProgressInput,
      stages: STAGES,
    });

    const fromSqlMirror = computeCrmProjectDerivedStageSlugParity({
      activeStageSlugsInOrder: ['new-lead', 'scheduled', 'in-progress'],
      tasks: [
        { stageSlug: 'new-lead', status: 'done', isPayment: false },
        { stageSlug: 'scheduled', status: 'done', isPayment: false },
        { stageSlug: 'in-progress', status: 'done', isPayment: false },
      ],
      manualCompletedStageSlugs: [],
    });

    assert.equal(fromTs, CRM_PROJECT_COMPLETE_STAGE_SLUG);
    assert.equal(fromSqlMirror, fromTs);
  });

  it('ignores payment tasks when deriving stage', () => {
    const fromSqlMirror = computeCrmProjectDerivedStageSlugParity({
      activeStageSlugsInOrder: ['new-lead'],
      tasks: [{ stageSlug: 'new-lead', status: 'pending', isPayment: true }],
      manualCompletedStageSlugs: ['new-lead'],
    });
    assert.equal(fromSqlMirror, CRM_PROJECT_COMPLETE_STAGE_SLUG);
  });
});
