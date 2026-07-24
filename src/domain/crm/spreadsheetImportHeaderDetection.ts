/**
 * Detect the most likely spreadsheet header row (0-based index).
 * Pure helper — used by the import wizard upload step.
 */

const FIELD_LIKE_LABEL_RE =
  /\b(name|first|last|address|email|e-?mail|phone|tel|project|unit|lot|status|stage|city|state|zip|postal|notes?|contact|company|customer|assignee|owner|value|amount|deal|parent|subproject|job)\b/i;

const DATE_LIKE_RE =
  /^\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?$|^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/;

const NUMBER_LIKE_RE = /^[$€£]?\s*-?\d[\d,]*(?:\.\d+)?%?$/;

export const SPREADSHEET_HEADER_DETECT_MAX_SCAN_ROWS = 20;

/** Confidence tiers derived from the existing header-candidate score. */
export type SpreadsheetHeaderDetectionConfidence = 'high' | 'medium' | 'low';

export function toUserFacingSpreadsheetRowNumber(zeroBasedIndex: number): number {
  return zeroBasedIndex + 1;
}

export function toZeroBasedSpreadsheetRowIndex(userFacingRowNumber: number): number {
  return Math.max(0, userFacingRowNumber - 1);
}

function isBlankRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function nonEmptyCells(row: readonly string[]): string[] {
  return row.map((c) => c.trim()).filter((c) => c.length > 0);
}

function looksNumericOrDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return NUMBER_LIKE_RE.test(trimmed) || DATE_LIKE_RE.test(trimmed);
}

function scoreHeaderCandidate(row: readonly string[]): number {
  const cells = nonEmptyCells(row);
  if (cells.length === 0) return -1000;

  // Title-only / merged-looking single value
  if (cells.length === 1) return -50;

  const unique = new Set(cells.map((c) => c.toLocaleLowerCase('en-US')));
  const uniqueRatio = unique.size / cells.length;
  const textLikeCount = cells.filter((c) => !looksNumericOrDate(c)).length;
  const textRatio = textLikeCount / cells.length;
  const fieldLikeCount = cells.filter((c) => FIELD_LIKE_LABEL_RE.test(c)).length;
  const repeatedPenalty = uniqueRatio < 0.5 ? -40 : 0;

  let score = 0;
  score += Math.min(cells.length, 12) * 8;
  score += textRatio * 40;
  score += uniqueRatio * 35;
  score += fieldLikeCount * 12;
  score += repeatedPenalty;

  // Prefer mostly short label-like cells over long prose
  const avgLen = cells.reduce((sum, c) => sum + c.length, 0) / cells.length;
  if (avgLen > 40) score -= 20;
  if (avgLen <= 24) score += 8;

  return score;
}

/** Public scoring surface for UI confidence (same algorithm as detection). */
export function scoreSpreadsheetHeaderCandidate(row: readonly string[]): number {
  return scoreHeaderCandidate(row);
}

/**
 * Map a header-candidate score to a UI confidence tier.
 * Thresholds are calibrated against the existing scoring formula — not AI.
 */
export function classifySpreadsheetHeaderConfidence(
  score: number
): SpreadsheetHeaderDetectionConfidence {
  if (score >= 100) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export type SpreadsheetHeaderDetectionResult = {
  readonly index: number;
  readonly score: number;
  readonly confidence: SpreadsheetHeaderDetectionConfidence;
};

/**
 * Returns the best 0-based header row index within the first scan window.
 * Falls back to the first non-blank row, then 0.
 */
export function detectSpreadsheetHeaderRowIndex(
  matrix: readonly (readonly string[])[],
  options?: { readonly maxScanRows?: number }
): number {
  return detectSpreadsheetHeaderRow(matrix, options).index;
}

/** Same detection as {@link detectSpreadsheetHeaderRowIndex}, with score + confidence. */
export function detectSpreadsheetHeaderRow(
  matrix: readonly (readonly string[])[],
  options?: { readonly maxScanRows?: number }
): SpreadsheetHeaderDetectionResult {
  if (matrix.length === 0) {
    return { index: 0, score: -1000, confidence: 'low' };
  }

  const maxScan = Math.min(
    options?.maxScanRows ?? SPREADSHEET_HEADER_DETECT_MAX_SCAN_ROWS,
    matrix.length
  );

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  let firstNonBlank = -1;

  for (let i = 0; i < maxScan; i += 1) {
    const row = matrix[i] ?? [];
    if (isBlankRow(row)) continue;
    if (firstNonBlank < 0) firstNonBlank = i;

    const score = scoreHeaderCandidate(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  let index = 0;
  let score = -1000;
  if (bestIndex >= 0 && bestScore > -40) {
    index = bestIndex;
    score = bestScore;
  } else if (firstNonBlank >= 0) {
    index = firstNonBlank;
    score = scoreHeaderCandidate(matrix[firstNonBlank] ?? []);
  }

  return {
    index,
    score,
    confidence: classifySpreadsheetHeaderConfidence(score),
  };
}

export type SpreadsheetHeaderConfirmationPanelKind = 'auto' | 'manual';

export type SpreadsheetHeaderConfirmationPanelModel = {
  readonly kind: SpreadsheetHeaderConfirmationPanelKind;
  readonly userFacingRow: number;
  readonly confidence: SpreadsheetHeaderDetectionConfidence | null;
};

/**
 * Presentation model for the header-confirmation detection panel.
 * Manual selection drops automated confidence claims.
 */
export function buildHeaderConfirmationPanelModel(input: {
  readonly selectedZeroBasedIndex: number;
  readonly detectedZeroBasedIndex: number;
  readonly detectedScore: number;
}): SpreadsheetHeaderConfirmationPanelModel {
  const userFacingRow = toUserFacingSpreadsheetRowNumber(input.selectedZeroBasedIndex);
  if (input.selectedZeroBasedIndex !== input.detectedZeroBasedIndex) {
    return { kind: 'manual', userFacingRow, confidence: null };
  }
  return {
    kind: 'auto',
    userFacingRow,
    confidence: classifySpreadsheetHeaderConfidence(input.detectedScore),
  };
}

export type SpreadsheetSheetSummary = {
  readonly name: string;
  readonly rowCount: number;
  readonly columnCount: number;
};

export function summarizeSpreadsheetSheet(
  name: string,
  matrix: readonly (readonly string[])[]
): SpreadsheetSheetSummary {
  const columnCount = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    name,
    rowCount: matrix.length,
    columnCount,
  };
}
