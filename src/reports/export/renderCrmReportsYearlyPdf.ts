import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatReportCurrency, formatReportPercent } from '../formatReportValues';
import type { ReportsPeriodFinancialSnapshot } from '../calculations/reportsPeriodFinancials';
import type { CrmReportsYearlyPdfData } from '../types/crmReportsYearlyPdf';

const MARGIN = 40;
const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADING_COLOR: [number, number, number] = [30, 41, 59];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];
const TABLE_HEAD_FILL: [number, number, number] = [51, 65, 85];

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function formatMargin(marginPercent: number | null): string {
  return marginPercent == null ? '—' : formatReportPercent(marginPercent);
}

function formatAvgDays(days: number | null): string {
  return days == null ? '—' : days.toFixed(1);
}

function writeSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(title, MARGIN, y);
  return y + 14;
}

function writeYearlySummary(
  doc: jsPDF,
  summary: ReportsPeriodFinancialSnapshot,
  labels: Record<string, string>,
  startY: number
): number {
  const rows: [string, string][] = [
    [labels.collectedRevenue, formatReportCurrency(summary.collectedCents)],
    [labels.invoicedRevenue, formatReportCurrency(summary.invoicedCents)],
    [labels.receivables, formatReportCurrency(summary.receivablesCents)],
    [labels.costs, formatReportCurrency(summary.costsCents)],
    [labels.netProfit, formatReportCurrency(summary.netProfitCents)],
    [labels.margin, formatMargin(summary.marginPercent)],
    [labels.paymentsCount, String(summary.paymentCount)],
    [labels.avgPayment, formatReportCurrency(summary.avgPaymentCents)],
    [labels.avgDaysToPay, formatAvgDays(summary.avgDaysToPay)],
  ];

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_WIDTH,
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 2, bottom: 2, left: 0, right: 8 },
      textColor: HEADING_COLOR,
    },
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold', textColor: MUTED_COLOR },
      1: { halign: 'right' },
    },
  });

  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? startY + 8;
}

function writeMonthlyTable(
  doc: jsPDF,
  data: CrmReportsYearlyPdfData,
  labels: Record<string, string>,
  startY: number
): number {
  const head = [
    [
      labels.month,
      labels.collectedRevenue,
      labels.invoicedRevenue,
      labels.costs,
      labels.netProfit,
      labels.margin,
      labels.payments,
      labels.receivables,
    ],
  ];

  const body = data.monthlyRows.map((row) => [
    row.monthLabel,
    formatReportCurrency(row.collectedCents),
    formatReportCurrency(row.invoicedCents),
    formatReportCurrency(row.costsCents),
    formatReportCurrency(row.netProfitCents),
    formatMargin(row.marginPercent),
    String(row.paymentCount),
    formatReportCurrency(row.receivablesCents),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_WIDTH,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: {
      fillColor: TABLE_HEAD_FILL,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  });

  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? startY;
}

function writeMonthHighlights(
  doc: jsPDF,
  data: CrmReportsYearlyPdfData,
  labels: Record<string, string>,
  startY: number
): number {
  let y = startY;

  if (data.monthHighlights.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(labels.noHighlights, MARGIN, y);
    return y + 12;
  }

  for (const highlight of data.monthHighlights) {
    if (y > PAGE_HEIGHT - MARGIN - 60) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...HEADING_COLOR);
    doc.text(`${highlight.monthLabel} ${labels.highlightsSuffix}`, MARGIN, y);
    y += 12;

    const bullets = [
      `${formatReportCurrency(highlight.collectedCents)} ${labels.collectedShort}`,
      `${formatReportCurrency(highlight.invoicedCents)} ${labels.invoicedShort}`,
      `${formatReportCurrency(highlight.costsCents)} ${labels.costsShort}`,
      `${formatReportCurrency(highlight.netProfitCents)} ${labels.netProfitShort} (${formatMargin(highlight.marginPercent)})`,
      `${highlight.paymentCount} ${labels.paymentsReceived}`,
    ];

    if (highlight.topProjectName) {
      bullets.push(`${labels.topProject}: ${highlight.topProjectName}`);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (const line of bullets) {
      doc.text(`• ${line}`, MARGIN + 10, y);
      y += 11;
    }

    y += 6;
  }

  return y;
}

export async function renderCrmReportsYearlyPdf(data: CrmReportsYearlyPdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
  const labels = {
    year: 'Year',
    generated: 'Generated',
    yearlySummary: 'Yearly Summary',
    monthlyBreakdown: 'Monthly Breakdown',
    monthHighlights: 'Monthly Highlights',
    month: 'Month',
    collectedRevenue: 'Collected Revenue',
    invoicedRevenue: 'Invoiced Revenue',
    receivables: 'Receivables',
    costs: 'Costs',
    netProfit: 'Net Profit',
    margin: 'Margin',
    payments: 'Payments',
    paymentsCount: 'Payments Count',
    avgPayment: 'Average Payment',
    avgDaysToPay: 'Average Days To Pay',
    highlightsSuffix: 'Highlights',
    collectedShort: 'collected',
    invoicedShort: 'invoiced',
    costsShort: 'costs',
    netProfitShort: 'net profit',
    paymentsReceived: 'payments received',
    topProject: 'Top project',
    noHighlights: 'No months with financial activity in this year.',
  };

  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...HEADING_COLOR);
  doc.text(data.reportTitle, MARGIN, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(data.organizationName, MARGIN, y);
  y += 12;
  doc.text(`${labels.year}: ${data.year}`, MARGIN, y);
  y += 12;
  doc.text(`${labels.generated}: ${data.generatedAtLabel}`, MARGIN, y);
  y += 20;

  y = writeSectionTitle(doc, labels.yearlySummary, y);
  y = writeYearlySummary(doc, data.yearlySummary, labels, y) + 14;

  if (y > PAGE_HEIGHT - MARGIN - 120) {
    doc.addPage();
    y = MARGIN;
  }

  y = writeSectionTitle(doc, labels.monthlyBreakdown, y);
  y = writeMonthlyTable(doc, data, labels, y) + 14;

  if (y > PAGE_HEIGHT - MARGIN - 80) {
    doc.addPage();
    y = MARGIN;
  }

  y = writeSectionTitle(doc, labels.monthHighlights, y);
  writeMonthHighlights(doc, data, labels, y);

  return doc.output('blob');
}
