import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatProjectFinancialPaymentHierarchyLabel,
  formatReportCurrency,
  formatReportPercent,
  formatReportText,
} from '../formatReportValues';
import type { ProjectFinancialReportData } from '../types/projectFinancialReport';

const MARGIN = 40;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LABEL_COL_WIDTH = 124;
const HEADING_COLOR: [number, number, number] = [30, 41, 59];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const SECTION_GAP = 12;
const SECTION_GAP_LOOSE = SECTION_GAP * 2;
const CUSTOMER_TITLE_TO_GRID = 4;
const SUMMARY_ROW_HEIGHT = 12;
const CUSTOMER_GRID_ROW_HEIGHT = 10;

const TABLE_MARGIN = { left: MARGIN, right: MARGIN, top: 0, bottom: 0 } as const;
const NUMERIC_TABLE_HEAD_FILL: [number, number, number] = [51, 65, 85];

function buildFullWidthColumnStyles(
  widths: readonly number[],
  rightAlignIndexes: readonly number[] = []
): Record<number, { cellWidth: number; halign?: 'right' }> {
  const styles: Record<number, { cellWidth: number; halign?: 'right' }> = {};
  const widthSum = widths.reduce((total, width) => total + width, 0);
  const scale = widthSum > 0 ? CONTENT_WIDTH / widthSum : 1;
  let allocated = 0;

  widths.forEach((width, index) => {
    const isLast = index === widths.length - 1;
    const cellWidth = isLast
      ? CONTENT_WIDTH - allocated
      : Math.round(width * scale);
    allocated += cellWidth;
    styles[index] = { cellWidth };
    if (rightAlignIndexes.includes(index)) {
      styles[index].halign = 'right';
    }
  });

  return styles;
}

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

function writeFinancialSummaryTable(
  doc: jsPDF,
  rows: readonly { label: string; value: string }[],
  startY: number
): number {
  autoTable(doc, {
    startY,
    margin: TABLE_MARGIN,
    tableWidth: CONTENT_WIDTH,
    body: rows.map((row) => [row.label, row.value]),
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 2, bottom: 2, left: 0, right: 0 },
      overflow: 'linebreak',
      textColor: HEADING_COLOR,
      lineWidth: 0,
      minCellHeight: SUMMARY_ROW_HEIGHT,
    },
    columnStyles: buildFullWidthColumnStyles([200, 332], [1]),
  });

  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? startY + 8;
}

function writeSummarySection(
  doc: jsPDF,
  title: string,
  rows: readonly { label: string; value: string }[],
  y: number,
  gapBefore: number = SECTION_GAP
): number {
  y = writeSectionTitle(doc, title, y, gapBefore, SECTION_GAP);
  return writeFinancialSummaryTable(doc, rows, y);
}

function writeMutedNote(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
  doc.text(lines, MARGIN, y);
  return y + lines.length * 10 + 4;
}

export async function renderProjectProfitAndLossPdf(
  data: ProjectFinancialReportData
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  let y = MARGIN;
  const summary = data.financialSummary;

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
  y = writeKeyValueGrid(
    doc,
    [
      { label: 'Customer', value: data.customerName },
      { label: 'Email', value: data.contactEmail },
      { label: 'Contact', value: data.contactName },
      { label: 'Phone', value: data.contactPhone },
    ],
    y
  );

  y = writeSummarySection(
    doc,
    'Financial Summary',
    [
      { label: 'Value', value: formatReportCurrency(summary.valueCents) },
      { label: 'Collected', value: formatReportCurrency(summary.collectedCents) },
      { label: 'Balance', value: formatReportCurrency(summary.balanceCents) },
      { label: 'Costs', value: formatReportCurrency(summary.costsCents) },
      { label: 'Actual Profit', value: formatReportCurrency(summary.actualProfitCents) },
      { label: 'Projected Profit', value: formatReportCurrency(summary.projectedProfitCents) },
    ],
    y,
    SECTION_GAP_LOOSE
  );

  y = writeSectionTitle(doc, 'Payments', y, SECTION_GAP_LOOSE, SECTION_GAP);

  if (data.payments.length > 0) {
    const showProjectColumn = data.isParentRollup;
    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      tableWidth: CONTENT_WIDTH,
      head: [
        showProjectColumn
          ? ['Project', 'Payment', 'Amount', 'Status', 'Paid Date', 'Paid']
          : ['Payment', 'Amount', 'Status', 'Paid Date', 'Paid'],
      ],
      body: data.payments.map((row) =>
        showProjectColumn
          ? [
              formatProjectFinancialPaymentHierarchyLabel(row.projectLabel, data.projectName),
              row.title,
              formatReportCurrency(row.amountCents),
              row.statusLabel,
              row.paidAtLabel,
              row.paidIndicator === 'paid' ? 'Paid' : 'Unpaid',
            ]
          : [
              row.title,
              formatReportCurrency(row.amountCents),
              row.statusLabel,
              row.paidAtLabel,
              row.paidIndicator === 'paid' ? 'Paid' : 'Unpaid',
            ]
      ),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: NUMERIC_TABLE_HEAD_FILL, textColor: 255, halign: 'left' },
      columnStyles: showProjectColumn
        ? buildFullWidthColumnStyles([108, 184, 80, 72, 76, 52], [2])
        : buildFullWidthColumnStyles([236, 88, 88, 88, 68], [1]),
      didParseCell: applyRightAlignForColumns(showProjectColumn ? [2] : [1]),
    });
    y = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;
  } else {
    y = writeMutedNote(doc, 'No payment milestones recorded.', y);
  }

  if (y > 620) {
    doc.addPage();
    y = MARGIN;
  }

  y = writeSectionTitle(
    doc,
    'Costs',
    y,
    y === MARGIN ? 0 : SECTION_GAP_LOOSE,
    SECTION_GAP
  );

  if (data.costRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      tableWidth: CONTENT_WIDTH,
      head: [['Category', 'Amount', '% of total costs', 'Items']],
      body: data.costRows.map((row) => [
        row.categoryLabel,
        formatReportCurrency(row.costCents),
        formatReportPercent(row.percentOfTotalCost),
        String(row.itemCount),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: NUMERIC_TABLE_HEAD_FILL, textColor: 255, halign: 'left' },
      columnStyles: buildFullWidthColumnStyles([244, 116, 116, 92], [1, 2, 3]),
      didParseCell: applyRightAlignForColumns([1, 2, 3]),
    });

    y = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;

    if (data.categoryTotals.length > 0) {
      if (y > 640) {
        doc.addPage();
        y = MARGIN;
      }

      y = writeSectionTitle(doc, 'Cost breakdown', y, SECTION_GAP_LOOSE, SECTION_GAP);
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
        columnStyles: buildFullWidthColumnStyles([260, 136, 136], [1, 2]),
        didParseCell: applyRightAlignForColumns([1, 2]),
      });
    }
  } else {
    y = writeMutedNote(doc, 'No costs recorded yet.', y);
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
