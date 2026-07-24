/**
 * Deterministic spreadsheet structure recommendations (no AI).
 */

import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export type CrmImportStructureRecommendationKind =
  | 'one_project'
  | 'multiple_by_column'
  | 'multiple_by_combination';

export type CrmImportStructureRecommendation = {
  readonly id: string;
  readonly kind: CrmImportStructureRecommendationKind;
  readonly title: string;
  readonly reason: string;
  readonly estimatedParentGroups: number;
  readonly estimatedSubprojects: number;
  readonly columnIndexes: readonly number[];
  readonly columnHeaders: readonly string[];
  readonly confidence: number;
};

function nonEmpty(row: readonly string[], col: number): string {
  return (row[col] ?? '').trim();
}

function columnStats(matrix: readonly (readonly string[])[], col: number, dataStart: number) {
  const values: string[] = [];
  let blanks = 0;
  for (let r = dataStart; r < matrix.length; r += 1) {
    const v = nonEmpty(matrix[r] ?? [], col);
    if (!v) {
      blanks += 1;
      continue;
    }
    values.push(normalizeImportText(v));
  }
  const unique = new Set(values);
  const dataRows = Math.max(1, matrix.length - dataStart);
  return {
    uniqueCount: unique.size,
    blankRatio: blanks / dataRows,
    fillRatio: values.length / dataRows,
    values,
  };
}

const PROJECT_HEADER_RE =
  /\b(complex|community|property|project|site|customer|account|parent|building|hoa)\b/i;
const SUBPROJECT_HEADER_RE =
  /\b(unit|apartment|suite|lot|lead|work\s*order|job|sub\s*project|subproject)\b/i;

/**
 * Analyze data rows below headerRowIndex and return up to 3 recommendations.
 */
export function recommendSpreadsheetStructures(input: {
  readonly headers: readonly string[];
  readonly matrix: readonly (readonly string[])[];
  readonly headerRowIndex: number;
}): readonly CrmImportStructureRecommendation[] {
  const dataStart = input.headerRowIndex + 1;
  const dataRowCount = Math.max(0, input.matrix.length - dataStart);
  if (dataRowCount === 0 || input.headers.length === 0) return [];

  const recommendations: CrmImportStructureRecommendation[] = [];

  // Always offer one-project when there are data rows
  recommendations.push({
    id: 'one_project',
    kind: 'one_project',
    title: `This appears to be one project with ${dataRowCount} individual rows.`,
    reason: 'Each spreadsheet row can become a subproject under a single parent project.',
    estimatedParentGroups: 1,
    estimatedSubprojects: dataRowCount,
    columnIndexes: [],
    columnHeaders: [],
    confidence: 0.4,
  });

  type ScoredCol = {
    index: number;
    header: string;
    uniqueCount: number;
    score: number;
  };
  const scored: ScoredCol[] = [];

  for (let col = 0; col < input.headers.length; col += 1) {
    const header = input.headers[col] ?? `Column ${col + 1}`;
    const stats = columnStats(input.matrix, col, dataStart);
    if (stats.fillRatio < 0.5) continue;
    if (stats.uniqueCount < 2) continue;
    if (stats.uniqueCount > dataRowCount * 0.85) continue; // too unique = row identity

    let score = 0;
    // Prefer moderate cardinality (few groups relative to rows)
    const ratio = stats.uniqueCount / dataRowCount;
    if (ratio >= 0.02 && ratio <= 0.4) score += 40;
    else if (ratio < 0.02) score += 15;
    else score += 10;
    score += (1 - stats.blankRatio) * 20;
    if (PROJECT_HEADER_RE.test(header)) score += 35;
    if (SUBPROJECT_HEADER_RE.test(header)) score -= 25;
    scored.push({ index: col, header, uniqueCount: stats.uniqueCount, score });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored[0] != null && scored[0].score >= 40) {
    const top = scored[0];
    recommendations.push({
      id: `multi_col_${top.index}`,
      kind: 'multiple_by_column',
      title: `This appears to contain ${top.uniqueCount} projects grouped by ${top.header}.`,
      reason: `"${top.header}" repeats across rows with ${top.uniqueCount} distinct values.`,
      estimatedParentGroups: top.uniqueCount,
      estimatedSubprojects: dataRowCount,
      columnIndexes: [top.index],
      columnHeaders: [top.header],
      confidence: Math.min(0.95, top.score / 100),
    });
  }

  // Combination of two moderate-cardinality columns
  if (scored.length >= 2) {
    const a = scored[0]!;
    const b = scored[1]!;
    const combo = new Set<string>();
    for (let r = dataStart; r < input.matrix.length; r += 1) {
      const row = input.matrix[r] ?? [];
      const left = normalizeImportText(nonEmpty(row, a.index));
      const right = normalizeImportText(nonEmpty(row, b.index));
      if (!left && !right) continue;
      combo.add(`${left}|${right}`);
    }
    if (combo.size >= 2 && combo.size < dataRowCount * 0.85 && combo.size !== a.uniqueCount) {
      recommendations.push({
        id: `multi_combo_${a.index}_${b.index}`,
        kind: 'multiple_by_combination',
        title: `This appears to contain multiple projects using ${a.header} + ${b.header}.`,
        reason: `Combining these columns yields about ${combo.size} distinct project groups.`,
        estimatedParentGroups: combo.size,
        estimatedSubprojects: dataRowCount,
        columnIndexes: [a.index, b.index],
        columnHeaders: [a.header, b.header],
        confidence: 0.55,
      });
    }
  }

  return recommendations
    .sort((x, y) => y.confidence - x.confidence)
    .slice(0, 3);
}
