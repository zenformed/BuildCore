import { jsPDF } from 'jspdf';
import { formatReportCurrency, formatReportPercent } from '../formatReportValues';
import type {
  CrmReportsSummaryPdfData,
  ReportsSummaryPdfColumnKey,
  ReportsSummaryPdfMetricCells,
  ReportsSummaryPdfSection,
} from '../types/crmReportsSummaryPdf';

type ColumnHeaderRow = CrmReportsSummaryPdfData['columnHeaders'];

const MARGIN = 36;
const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const DETAIL_INDENT = 14;
const ROW_HEIGHT = 12;
const DETAIL_ROW_HEIGHT = 13;
const HEADER_FONT_SIZE = 5.75;
const SECTION_TITLE_GAP = 6;
const RULE_OFFSET_AFTER_DETAIL = 5;
const TOTAL_ROW_OFFSET_AFTER_RULE = 14;
const BETWEEN_SECTIONS_GAP = 20;
const BETWEEN_SUMMARY_LINES_GAP = 16;
const HEADING_COLOR: [number, number, number] = [30, 41, 59];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];
const RULE_COLOR: [number, number, number] = [30, 41, 59];

const COLUMN_ORDER: readonly ReportsSummaryPdfColumnKey[] = [
  'mtd',
  'ytd',
  'lastYearMtd',
  'lastYearYtd',
];

const AMT_COL_WIDTH = 58;
const PCT_COL_WIDTH = 62;
const BETWEEN_AMT_AND_PCT = 10;
const BETWEEN_GROUPS = 14;

type MetricColumnPositions = {
  readonly amountRight: number;
  readonly percentRight: number;
};

function buildMetricColumnPositions(): Record<ReportsSummaryPdfColumnKey, MetricColumnPositions> {
  const positions = {} as Record<ReportsSummaryPdfColumnKey, MetricColumnPositions>;
  let right = CONTENT_RIGHT;

  for (const key of [...COLUMN_ORDER].reverse()) {
    const percentRight = right;
    right -= PCT_COL_WIDTH + BETWEEN_AMT_AND_PCT;
    const amountRight = right;
    right -= AMT_COL_WIDTH + BETWEEN_GROUPS;
    positions[key] = { amountRight, percentRight };
  }

  return positions;
}

const METRIC_COLUMNS = buildMetricColumnPositions();
const METRICS_START_X = METRIC_COLUMNS.mtd.amountRight - AMT_COL_WIDTH;

function drawColumnHeaders(doc: jsPDF, y: number, columnHeaders: ColumnHeaderRow): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setTextColor(...MUTED_COLOR);

  COLUMN_ORDER.forEach((key, index) => {
    const pos = METRIC_COLUMNS[key];
    const headers = columnHeaders[index];
    doc.text(headers.amount, pos.amountRight, y, { align: 'right' });
    doc.text(headers.percent, pos.percentRight, y, { align: 'right' });
  });

  return y + ROW_HEIGHT + 6;
}

function drawMetricCells(
  doc: jsPDF,
  y: number,
  cells: ReportsSummaryPdfMetricCells,
  options: { bold?: boolean; fontSize?: number } = {}
): void {
  const { bold = false, fontSize = 8 } = options;
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...HEADING_COLOR);

  for (const key of COLUMN_ORDER) {
    const pos = METRIC_COLUMNS[key];
    const cell = cells[key];
    doc.text(formatReportCurrency(cell.amountCents), pos.amountRight, y, {
      align: 'right',
    });
    doc.text(formatReportPercent(cell.percent), pos.percentRight, y, {
      align: 'right',
    });
  }
}

function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(title, MARGIN, y);
  return y + ROW_HEIGHT;
}

function drawDetailLine(
  doc: jsPDF,
  y: number,
  label: string,
  cells: ReportsSummaryPdfMetricCells
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(`- ${label}`, MARGIN + DETAIL_INDENT, y);
  drawMetricCells(doc, y, cells);
  return y + DETAIL_ROW_HEIGHT;
}

function drawSectionTotal(
  doc: jsPDF,
  y: number,
  totalLabel: string,
  cells: ReportsSummaryPdfMetricCells
): number {
  const ruleY = y + RULE_OFFSET_AFTER_DETAIL;
  doc.setDrawColor(...RULE_COLOR);
  doc.setLineWidth(0.5);
  doc.line(METRICS_START_X, ruleY, CONTENT_RIGHT, ruleY);

  const textY = ruleY + TOTAL_ROW_OFFSET_AFTER_RULE;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(totalLabel, MARGIN, textY);
  drawMetricCells(doc, textY, cells, { bold: true, fontSize: 9 });
  return textY + ROW_HEIGHT + BETWEEN_SECTIONS_GAP;
}

function drawSummaryLine(
  doc: jsPDF,
  y: number,
  label: string,
  cells: ReportsSummaryPdfMetricCells
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(label, MARGIN, y);
  drawMetricCells(doc, y, cells, { bold: true, fontSize: 9 });
  return y + ROW_HEIGHT + BETWEEN_SUMMARY_LINES_GAP;
}

function drawSection(
  doc: jsPDF,
  y: number,
  section: ReportsSummaryPdfSection,
  columnHeaders: ColumnHeaderRow
): number {
  y = drawSectionHeader(doc, y, section.title);
  y += SECTION_TITLE_GAP;

  for (const detail of section.details) {
    if (y > PAGE_HEIGHT - MARGIN - DETAIL_ROW_HEIGHT) {
      doc.addPage();
      y = MARGIN;
      y = drawColumnHeaders(doc, y, columnHeaders);
    }
    y = drawDetailLine(doc, y, detail.label, detail.cells);
  }

  if (y > PAGE_HEIGHT - MARGIN - ROW_HEIGHT * 4) {
    doc.addPage();
    y = MARGIN;
    y = drawColumnHeaders(doc, y, columnHeaders);
  }

  return drawSectionTotal(doc, y, section.totalLabel, section.total);
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  neededRows: number,
  columnHeaders: ColumnHeaderRow
): number {
  if (y > PAGE_HEIGHT - MARGIN - ROW_HEIGHT * neededRows) {
    doc.addPage();
    let nextY = MARGIN;
    nextY = drawColumnHeaders(doc, nextY, columnHeaders);
    return nextY + 2;
  }
  return y;
}

export async function renderCrmReportsSummaryPdf(data: CrmReportsSummaryPdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(data.reportTitle, MARGIN, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`As of ${data.asOfLabel}`, MARGIN, y);
  y += 10;
  doc.text(data.yearContextLine, MARGIN, y);
  y += 10;
  doc.text(`Generated ${data.generatedAtLabel}`, MARGIN, y);
  y += 16;

  y = drawColumnHeaders(doc, y, data.columnHeaders);
  y += 2;

  for (const block of data.blocks) {
    y = ensureSpace(doc, y, block.kind === 'section' ? 8 : 2, data.columnHeaders);
    if (block.kind === 'section') {
      y = drawSection(doc, y, block.section, data.columnHeaders);
    } else {
      y = drawSummaryLine(doc, y, block.line.label, block.line.cells);
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(data.footerNote, MARGIN, Math.min(y + 8, PAGE_HEIGHT - MARGIN), {
    maxWidth: CONTENT_RIGHT - MARGIN,
  });

  return doc.output('blob');
}
