import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildHeaderConfirmationPanelModel,
  classifySpreadsheetHeaderConfidence,
  detectSpreadsheetHeaderRow,
  detectSpreadsheetHeaderRowIndex,
  scoreSpreadsheetHeaderCandidate,
  toUserFacingSpreadsheetRowNumber,
} from './spreadsheetImportHeaderDetection';
import { buildHeaderConfirmationPanelViewModel } from '@/presentation/features/crmImport/interview/headerConfirmationPresentation';

const COPY = {
  autoFoundTitle: 'BuildCore found your column names',
  autoReviewTitle: 'Please double-check this selection',
  autoRowLabel: (row: number): string => `Row ${row} appears to be the header row.`,
  manualTitle: (row: number): string => `You selected Row ${row} as the header row`,
  confidenceHigh: 'High confidence',
  confidenceMedium: 'Medium confidence',
  confidenceLow: 'Low confidence',
};

describe('spreadsheetImportHeaderDetection confidence', () => {
  it('classifies high / medium / low from existing score thresholds', () => {
    assert.equal(classifySpreadsheetHeaderConfidence(120), 'high');
    assert.equal(classifySpreadsheetHeaderConfidence(100), 'high');
    assert.equal(classifySpreadsheetHeaderConfidence(55), 'medium');
    assert.equal(classifySpreadsheetHeaderConfidence(40), 'medium');
    assert.equal(classifySpreadsheetHeaderConfidence(10), 'low');
  });

  it('scores a clear field-label header as high confidence', () => {
    const score = scoreSpreadsheetHeaderCandidate([
      'First Name',
      'Last Name',
      'Address',
      'Email',
      'Phone',
      'City',
      'State',
      'Zip',
    ]);
    assert.ok(score >= 100);
    assert.equal(classifySpreadsheetHeaderConfidence(score), 'high');
  });

  it('keeps detectSpreadsheetHeaderRowIndex behavior while exposing confidence', () => {
    const matrix = [
      ['First Name', 'Last Name', 'Address', 'Email'],
      ['Ada', 'Lovelace', '1 Main', 'a@x.com'],
    ];
    const result = detectSpreadsheetHeaderRow(matrix);
    assert.equal(result.index, detectSpreadsheetHeaderRowIndex(matrix));
    assert.equal(result.index, 0);
    assert.equal(result.confidence, classifySpreadsheetHeaderConfidence(result.score));
  });
});

describe('header confirmation panel model', () => {
  it('shows high-confidence auto copy for a strong detected header', () => {
    const matrix = [
      ['First Name', 'Last Name', 'Address', 'Email', 'Phone', 'City'],
      ['Ada', 'Lovelace', '1 Main', 'a@x.com', '1', 'Town'],
    ];
    const detected = detectSpreadsheetHeaderRow(matrix);
    const view = buildHeaderConfirmationPanelViewModel({
      selectedZeroBasedIndex: detected.index,
      detectedZeroBasedIndex: detected.index,
      matrix,
      copy: COPY,
    });
    assert.equal(view.model.kind, 'auto');
    assert.equal(view.tone, 'success');
    assert.equal(view.title, COPY.autoFoundTitle);
    assert.equal(view.detail, COPY.autoRowLabel(1));
    assert.equal(view.confidenceLabel, COPY.confidenceHigh);
    assert.equal(toUserFacingSpreadsheetRowNumber(detected.index), 1);
  });

  it('shows medium/low-confidence review copy when the score is weaker', () => {
    // Repeated tokens score lower uniqueness → medium confidence under existing formula.
    const matrix = [
      ['x', 'x', 'x', 'x'],
      ['1', '2', '3', '4'],
    ];
    const detected = detectSpreadsheetHeaderRow(matrix);
    assert.ok(detected.confidence === 'medium' || detected.confidence === 'low');
    const view = buildHeaderConfirmationPanelViewModel({
      selectedZeroBasedIndex: detected.index,
      detectedZeroBasedIndex: detected.index,
      matrix,
      copy: COPY,
    });
    assert.equal(view.model.kind, 'auto');
    assert.equal(view.tone, 'warning');
    assert.equal(view.title, COPY.autoReviewTitle);
    assert.ok(
      view.confidenceLabel === COPY.confidenceMedium || view.confidenceLabel === COPY.confidenceLow
    );
  });

  it('manual row selection removes automated confidence wording', () => {
    const model = buildHeaderConfirmationPanelModel({
      selectedZeroBasedIndex: 2,
      detectedZeroBasedIndex: 0,
      detectedScore: 150,
    });
    assert.equal(model.kind, 'manual');
    assert.equal(model.confidence, null);
    assert.equal(model.userFacingRow, 3);

    const view = buildHeaderConfirmationPanelViewModel({
      selectedZeroBasedIndex: 2,
      detectedZeroBasedIndex: 0,
      matrix: [
        ['Name', 'Email'],
        ['Ada', 'a@x.com'],
        ['Grace', 'g@x.com'],
      ],
      copy: COPY,
    });
    assert.equal(view.tone, 'neutral');
    assert.equal(view.title, COPY.manualTitle(3));
    assert.equal(view.confidenceLabel, null);
    assert.equal(view.detail, '');
  });

  it('user-facing row numbering remains one-based', () => {
    assert.equal(toUserFacingSpreadsheetRowNumber(0), 1);
    assert.equal(toUserFacingSpreadsheetRowNumber(4), 5);
  });
});
