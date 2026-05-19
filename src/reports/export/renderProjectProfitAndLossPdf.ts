import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatReportCurrency,
  formatReportPercent,
  formatReportText,
} from '../formatReportValues';
import type { ProjectProfitAndLossReportData } from '../types';

const MARGIN = 40;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LABEL_COL_WIDTH = 124;
const HEADING_COLOR: [number, number, number] = [30, 41, 59];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

/** Uniform space: end of block → next title, and title → first row beneath it. */
const SECTION_GAP = 12;
/** Extra space before a major block (Revenue, table sections). */
const SECTION_GAP_LOOSE = SECTION_GAP * 2;
/** Title → first row for Customer grid (tighter than summary sections). */
const CUSTOMER_TITLE_TO_GRID = 4;
const SUMMARY_ROW_HEIGHT = 12;
const CUSTOMER_GRID_ROW_HEIGHT = 10;

const TABLE_MARGIN = { left: MARGIN, right: MARGIN, top: 0, bottom: 0 } as const;

const NUMERIC_TABLE_HEAD_FILL: [number, number, number] = [51, 65, 85];

function applyRightAlignForColumns(columnIndexes: readonly number[]) {
  return (data: { section: string; column: { index: number }; cell: { styles: { halign?: string } } }) => {
    if (columnIndexes.includes(data.column.index)) {
      data.cell.styles.halign = 'right';
    }
  };
}

function writeSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  gapBefore: number = SECTION_GAP,
  titleToContent: number = SECTION_GAP
): number {
  const titleY = y + gapBefore;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(title, MARGIN, titleY);
  return titleY + titleToContent;
}

function writeKeyValueGrid(
  doc: jsPDF,
  rows: readonly { label: string; value: string }[],
  startY: number
): number {
  const valueColWidth = CONTENT_WIDTH / 2 - LABEL_COL_WIDTH;
  const body: string[][] = [];

  for (let index = 0; index < rows.length; index += 2) {
    const left = rows[index];
    const right = rows[index + 1];
    body.push([
      `${left.label}:`,
      left.value,
      right ? `${right.label}:` : '',
      right?.value ?? '',
    ]);
  }

  autoTable(doc, {
    startY,
    margin: TABLE_MARGIN,
    tableWidth: CONTENT_WIDTH,
    body,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 0, bottom: 0, left: 0, right: 10 },
      overflow: 'linebreak',
      textColor: HEADING_COLOR,
      lineWidth: 0,
      minCellHeight: CUSTOMER_GRID_ROW_HEIGHT,
    },
    columnStyles: {
      0: { cellWidth: LABEL_COL_WIDTH, fontStyle: 'bold', textColor: MUTED_COLOR },
      1: { cellWidth: valueColWidth, cellPadding: { top: 0, bottom: 0, left: 12, right: 0 } },
      2: { cellWidth: LABEL_COL_WIDTH, fontStyle: 'bold', textColor: MUTED_COLOR },
      3: { cellWidth: valueColWidth, cellPadding: { top: 0, bottom: 0, left: 12, right: 0 } },
    },
  });

  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? startY + 8;
}

function writeVerticalSummaryRows(
  doc: jsPDF,
  rows: readonly { label: string; value: string }[],
  startY: number
): number {
  let y = startY;
  for (const row of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...HEADING_COLOR);
    doc.text(row.label, MARGIN, y);
    doc.text(row.value, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += SUMMARY_ROW_HEIGHT;
  }
  return y;
}

function writeSummarySection(
  doc: jsPDF,
  title: string,
  rows: readonly { label: string; value: string }[],
  y: number,
  gapBefore: number = SECTION_GAP
): number {
  y = writeSectionTitle(doc, title, y, gapBefore, SECTION_GAP);
  return writeVerticalSummaryRows(doc, rows, y);
}

export async function renderProjectProfitAndLossPdf(
  data: ProjectProfitAndLossReportData
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(data.reportTitle, MARGIN, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.projectName, MARGIN, y);
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated ${data.generatedAtLabel}`, MARGIN, y);
  y += SECTION_GAP;

  y = writeSectionTitle(doc, 'Customer & project', y, SECTION_GAP, CUSTOMER_TITLE_TO_GRID);
  y = writeKeyValueGrid(doc, [
    { label: 'Customer', value: data.customerName },
    { label: 'Email', value: data.contactEmail },
    { label: 'Contact', value: data.contactName },
    { label: 'Phone', value: data.contactPhone },
  ], y);

  const marginLabel =
    data.financial.performance.marginPercent === null
      ? '—'
      : formatReportPercent(data.financial.performance.marginPercent);

  y = writeSummarySection(
    doc,
    'Revenue',
    [
      {
        label: 'Total Invoiced',
        value: formatReportCurrency(data.financial.revenue.totalInvoicedCents),
      },
      { label: 'Total Paid', value: formatReportCurrency(data.financial.revenue.totalPaidCents) },
      {
        label: 'Remaining Receivables',
        value: formatReportCurrency(data.financial.revenue.remainingReceivablesCents),
      },
    ],
    y,
    SECTION_GAP_LOOSE
  );

  y = writeSummarySection(doc, 'Cost', [
    { label: 'Total Budget', value: formatReportCurrency(data.financial.performance.totalBudgetCents) },
    { label: 'Total Cost', value: formatReportCurrency(data.financial.performance.totalCostCents) },
  ], y);

  y = writeSummarySection(doc, 'Profit', [
    { label: 'Actual Profit', value: formatReportCurrency(data.financial.performance.actualProfitCents) },
    { label: 'Margin', value: marginLabel },
  ], y);

  if (data.lineItems.length > 0) {
    y = writeSectionTitle(doc, 'Budget & cost line items', y, SECTION_GAP_LOOSE, SECTION_GAP);

    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      tableWidth: CONTENT_WIDTH,
      head: [['Item name', 'Category', 'Cost', 'Budget', 'Remaining']],
      body: data.lineItems.map((row) => [
        row.itemName,
        row.categoryLabel,
        formatReportCurrency(row.costCents),
        formatReportCurrency(row.budgetCents),
        formatReportCurrency(row.remainingCents),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: NUMERIC_TABLE_HEAD_FILL, textColor: 255, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 200 },
        1: { cellWidth: 100 },
        2: { cellWidth: 77, halign: 'right' },
        3: { cellWidth: 77, halign: 'right' },
        4: { cellWidth: 78, halign: 'right' },
      },
      didParseCell: applyRightAlignForColumns([2, 3, 4]),
    });

    y = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;
  }

  if (data.categoryTotals.length > 0) {
    if (y > 640) {
      doc.addPage();
      y = MARGIN;
    }

    y = writeSectionTitle(
      doc,
      'Category breakdown',
      y,
      y === MARGIN ? 0 : SECTION_GAP_LOOSE,
      SECTION_GAP
    );

    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      tableWidth: CONTENT_WIDTH,
      head: [['Category', 'Total cost', '% of total cost']],
      body: data.categoryTotals.map((row) => [
        row.categoryLabel,
        formatReportCurrency(row.costCents),
        formatReportPercent(row.percentOfTotalCost),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: NUMERIC_TABLE_HEAD_FILL, textColor: 255, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 260 },
        1: { cellWidth: 136, halign: 'right' },
        2: { cellWidth: 136, halign: 'right' },
      },
      didParseCell: applyRightAlignForColumns([1, 2]),
    });

    y = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;
  } else if (data.lineItems.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    doc.text('No budget line items recorded.', MARGIN, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      `${formatReportText(data.projectSlug)} · Page ${page} of ${pageCount}`,
      PAGE_WIDTH / 2,
      780,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
