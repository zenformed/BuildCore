import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PAYMENT_WORKFLOW_STAGE_SLUG, pipelineStageSlugSet } from '@/domain/crm';
import {
  validateCreateWorkflowTaskBody,
  validateUpdateWorkflowTaskBody,
} from './validateWorkflowTaskBody';

const allowedStageSlugs = pipelineStageSlugSet();
const validOpsStage = 'new-lead';

const baseCreateBody = {
  status: 'pending',
  documentsRequired: true,
} as const;

describe('validateCreateWorkflowTaskBody', () => {
  it('accepts payment milestone create with internal payments stage slug', () => {
    const result = validateCreateWorkflowTaskBody(
      {
        ...baseCreateBody,
        title: 'Deposit',
        stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
        amountCents: 50_000,
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.input.stageSlug, PAYMENT_WORKFLOW_STAGE_SLUG);
    assert.equal(result.input.amountCents, 50_000);
  });

  it('rejects internal payments stage slug without amountCents', () => {
    const result = validateCreateWorkflowTaskBody(
      {
        ...baseCreateBody,
        title: 'Not a payment',
        stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, 'Stage is invalid.');
  });

  it('accepts normal workflow task with valid pipeline stage', () => {
    const result = validateCreateWorkflowTaskBody(
      {
        ...baseCreateBody,
        title: 'Site visit',
        stageSlug: validOpsStage,
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.input.stageSlug, validOpsStage);
    assert.equal(result.input.amountCents, null);
  });

  it('forces payments stage when amountCents is present even if client sends ops stage', () => {
    const result = validateCreateWorkflowTaskBody(
      {
        ...baseCreateBody,
        title: 'Final draw',
        stageSlug: validOpsStage,
        amountCents: 100_000,
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.input.stageSlug, PAYMENT_WORKFLOW_STAGE_SLUG);
    assert.equal(result.input.amountCents, 100_000);
  });
});

describe('validateUpdateWorkflowTaskBody', () => {
  it('accepts payment milestone update with internal payments stage slug', () => {
    const result = validateUpdateWorkflowTaskBody(
      {
        title: 'Deposit (revised)',
        stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
        amountCents: 75_000,
        status: 'in_progress',
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.patch.stageSlug, PAYMENT_WORKFLOW_STAGE_SLUG);
    assert.equal(result.patch.amountCents, 75_000);
    assert.equal(result.patch.title, 'Deposit (revised)');
  });

  it('accepts payment milestone patch with payments stage slug only', () => {
    const result = validateUpdateWorkflowTaskBody(
      {
        stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
        status: 'done',
      },
      { allowedStageSlugs }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.patch.stageSlug, PAYMENT_WORKFLOW_STAGE_SLUG);
  });
});
