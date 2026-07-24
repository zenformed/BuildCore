/**
 * Pure helpers for header-confirmation screen presentation (no React).
 */

import {
  buildHeaderConfirmationPanelModel,
  scoreSpreadsheetHeaderCandidate,
  type SpreadsheetHeaderConfirmationPanelModel,
  type SpreadsheetHeaderDetectionConfidence,
} from '@/domain/crm/spreadsheetImportHeaderDetection';

export type HeaderConfirmationCopy = {
  readonly autoFoundTitle: string;
  readonly autoReviewTitle: string;
  readonly autoRowLabel: (row: number) => string;
  readonly manualTitle: (row: number) => string;
  readonly confidenceHigh: string;
  readonly confidenceMedium: string;
  readonly confidenceLow: string;
};

export function resolveDetectedHeaderScore(
  matrix: readonly (readonly string[])[],
  detectedZeroBasedIndex: number
): number {
  return scoreSpreadsheetHeaderCandidate(matrix[detectedZeroBasedIndex] ?? []);
}

export function buildHeaderConfirmationPanelViewModel(input: {
  readonly selectedZeroBasedIndex: number;
  readonly detectedZeroBasedIndex: number;
  readonly matrix: readonly (readonly string[])[];
  readonly copy: HeaderConfirmationCopy;
}): {
  readonly model: SpreadsheetHeaderConfirmationPanelModel;
  readonly title: string;
  readonly detail: string;
  readonly confidenceLabel: string | null;
  readonly tone: 'success' | 'warning' | 'neutral';
} {
  const detectedScore = resolveDetectedHeaderScore(input.matrix, input.detectedZeroBasedIndex);
  const model = buildHeaderConfirmationPanelModel({
    selectedZeroBasedIndex: input.selectedZeroBasedIndex,
    detectedZeroBasedIndex: input.detectedZeroBasedIndex,
    detectedScore,
  });

  if (model.kind === 'manual') {
    return {
      model,
      title: input.copy.manualTitle(model.userFacingRow),
      detail: '',
      confidenceLabel: null,
      tone: 'neutral',
    };
  }

  const confidence = model.confidence as SpreadsheetHeaderDetectionConfidence;
  const isHigh = confidence === 'high';
  return {
    model,
    title: isHigh ? input.copy.autoFoundTitle : input.copy.autoReviewTitle,
    detail: input.copy.autoRowLabel(model.userFacingRow),
    confidenceLabel:
      confidence === 'high'
        ? input.copy.confidenceHigh
        : confidence === 'medium'
          ? input.copy.confidenceMedium
          : input.copy.confidenceLow,
    tone: isHigh ? 'success' : 'warning',
  };
}
