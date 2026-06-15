'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatProjectFinancialPaymentHierarchyLabel,
  formatReportText,
  isProjectFinancialChildPaymentRow,
} from '@/reports/formatReportValues';
import type { ProjectFinancialReportPaymentRow } from '@/reports/types/projectFinancialReport';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectFinancialReport } from '@/presentation/features/crmProjectDetail/useProjectFinancialReport';
import { useProjectProfitAndLossPdfExport } from '@/presentation/features/crmProjectDetail/useProjectProfitAndLossPdfExport';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { BudgetCategoryPieChart } from './BudgetCategoryPieChart';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import styles from './ProjectDetail.module.css';

export type ProjectFinancialReportContentProps = {
  readonly project: CrmProjectDetail;
  readonly onRefresh: () => Promise<void>;
  readonly onRefreshError: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function ProjectFinancialReportContent({
  project,
  onRefresh,
  onRefreshError,
  onError,
}: ProjectFinancialReportContentProps): ReactElement {
  const copy = content.projectDetail.projectReport;
  const report = useProjectFinancialReport(project);
  const { exporting, exportPdf } = useProjectProfitAndLossPdfExport(project, onError);
  const isMobileLayout = useDashboardMobileLayout();
  const showProjectColumn = report.isParentRollup;

  return (
    <section className={`${styles.paymentsPanel} ${styles.projectFinancialReport}`} aria-labelledby="project-financial-report-heading">
      <DetailPanelHeader title={copy.title} titleId="project-financial-report-heading">
        <DetailPanelHeaderActions>
          <DetailPanelSectionRefresh
            sectionLabel={copy.title}
            onRefresh={onRefresh}
            onError={onRefreshError}
          />
          <DetailPanelHeaderButton
            variant="download"
            title={copy.downloadPdf}
            disabled={exporting}
            onClick={() => void exportPdf()}
          />
        </DetailPanelHeaderActions>
      </DetailPanelHeader>

      <div
        className={
          isMobileLayout
            ? `${styles.projectFinancialReportBody} ${styles.projectFinancialReportBody_mobile}`
            : styles.projectFinancialReportBody
        }
      >
        <div className={styles.projectFinancialReportMain}>
          <section className={styles.projectFinancialReportSection} aria-labelledby="project-financial-summary-heading">
            {isMobileLayout ? (
              <>
                <h3 id="project-financial-summary-heading" className={styles.projectFinancialReportSectionTitle}>
                  {copy.summaryTitle}
                </h3>
                <FinancialSummaryMobileCard
                  value={formatCentsAsUsd(report.financialSummary.valueCents)}
                  collected={formatCentsAsUsd(report.financialSummary.collectedCents)}
                  balance={formatCentsAsUsd(report.financialSummary.balanceCents)}
                  costs={formatCentsAsUsd(report.financialSummary.costsCents)}
                  actualProfit={formatCentsAsUsd(report.financialSummary.actualProfitCents)}
                  projectedProfit={formatCentsAsUsd(report.financialSummary.projectedProfitCents)}
                  labels={{
                    value: copy.value,
                    collected: copy.collected,
                    balance: copy.balance,
                    costs: copy.costs,
                    actualProfit: copy.actualProfit,
                    projectedProfit: copy.projectedProfit,
                  }}
                />
              </>
            ) : (
              <>
                <h3 id="project-financial-summary-heading" className={styles.projectFinancialReportSectionTitle}>
                  {copy.summaryTitle}
                </h3>
                <div className={styles.projectFinancialKpiGrid} role="list" aria-label={copy.summaryTitle}>
                  <FinancialKpiCard label={copy.value} value={formatCentsAsUsd(report.financialSummary.valueCents)} />
                  <FinancialKpiCard label={copy.collected} value={formatCentsAsUsd(report.financialSummary.collectedCents)} />
                  <FinancialKpiCard label={copy.balance} value={formatCentsAsUsd(report.financialSummary.balanceCents)} />
                  <FinancialKpiCard label={copy.costs} value={formatCentsAsUsd(report.financialSummary.costsCents)} />
                  <FinancialKpiCard label={copy.actualProfit} value={formatCentsAsUsd(report.financialSummary.actualProfitCents)} />
                  <FinancialKpiCard
                    label={copy.projectedProfit}
                    value={formatCentsAsUsd(report.financialSummary.projectedProfitCents)}
                  />
                </div>
              </>
            )}
          </section>

          <section className={styles.projectFinancialReportSection} aria-labelledby="project-financial-payments-heading">
            <h3 id="project-financial-payments-heading" className={styles.projectFinancialReportSectionTitle}>
              {copy.paymentsTitle}
            </h3>
            {report.payments.length > 0 ? (
              isMobileLayout ? (
                <div className={styles.projectFinancialPaymentsMobileList}>
                  {report.payments.map((row, index) => (
                    <FinancialReportPaymentMobileCard
                      key={`${row.projectLabel ?? 'own'}-${row.title}-${index}`}
                      row={row}
                      projectName={project.summary.name}
                      labels={{
                        payment: copy.paymentColumn,
                        project: copy.projectColumn,
                        amount: copy.amount,
                        status: copy.status,
                        paidDate: copy.paidDate,
                      }}
                      paidLabel={row.paidIndicator === 'paid' ? copy.paid : copy.unpaid}
                    />
                  ))}
                </div>
              ) : (
              <div className={`${styles.detailPanelTableCard} ${styles.projectFinancialReportTableCard}`}>
                <div className={styles.projectFinancialPaymentsTableWrap}>
                  <div
                    className={`${styles.tableHeader} ${showProjectColumn ? styles.projectFinancialPaymentsGridParent : styles.projectFinancialPaymentsGrid}`}
                    role="row"
                  >
                    {showProjectColumn ? <span role="columnheader">{copy.projectColumn}</span> : null}
                    <span role="columnheader">{copy.paymentColumn}</span>
                    <span role="columnheader">{copy.amount}</span>
                    <span role="columnheader">{copy.status}</span>
                    <span role="columnheader">{copy.paidDate}</span>
                    <span role="columnheader">{copy.paidIndicator}</span>
                  </div>
                  <div className={styles.projectFinancialTableScroll}>
                    {report.payments.map((row, index) => (
                      <div
                        key={`${row.projectLabel ?? 'own'}-${row.title}-${index}`}
                        className={`${styles.tableRow} ${showProjectColumn ? styles.projectFinancialPaymentsGridParent : styles.projectFinancialPaymentsGrid}`}
                        role="row"
                      >
                        {showProjectColumn ? (
                          <span
                            className={
                              isProjectFinancialChildPaymentRow(row.projectLabel)
                                ? `${styles.gridCellWrap} ${styles.projectFinancialPaymentChildLabel}`
                                : styles.gridCellWrap
                            }
                          >
                            {formatProjectFinancialPaymentHierarchyLabel(
                              row.projectLabel,
                              project.summary.name
                            )}
                          </span>
                        ) : null}
                        <span className={styles.gridCellWrap}>{row.title}</span>
                        <span>{formatCentsAsUsd(row.amountCents)}</span>
                        <span>{row.statusLabel}</span>
                        <span>{row.paidAtLabel}</span>
                        <span>{row.paidIndicator === 'paid' ? copy.paid : copy.unpaid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )
            ) : (
              <p className={styles.subtitle}>{copy.noPayments}</p>
            )}
          </section>

          <section className={styles.projectFinancialReportSection} aria-labelledby="project-financial-costs-heading">
            <h3 id="project-financial-costs-heading" className={styles.projectFinancialReportSectionTitle}>
              {copy.costsTitle}
            </h3>
            {report.costRows.length > 0 ? (
              <div className={`${styles.detailPanelTableCard} ${styles.projectFinancialReportTableCard}`}>
                <div className={styles.projectFinancialCostsTableWrap}>
                  <div className={`${styles.tableHeader} ${styles.projectFinancialCostsGrid}`} role="row">
                    <span role="columnheader">{copy.category}</span>
                    <span role="columnheader">{copy.amount}</span>
                    <span role="columnheader">{copy.percentOfCosts}</span>
                    <span role="columnheader">{copy.itemCount}</span>
                  </div>
                  <div className={styles.projectFinancialTableScroll}>
                    {report.costRows.map((row) => (
                      <div key={row.categoryLabel} className={`${styles.tableRow} ${styles.projectFinancialCostsGrid}`} role="row">
                        <span className={styles.budgetCategoryNameCell}>
                          <span
                            className={styles.budgetCategorySwatch}
                            style={{ background: row.color }}
                            aria-hidden
                          />
                          {row.categoryLabel}
                        </span>
                        <span>{formatCentsAsUsd(row.costCents)}</span>
                        <span>{row.percentOfTotalCost.toFixed(1)}%</span>
                        <span>{row.itemCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.subtitle}>{copy.noCosts}</p>
            )}
          </section>
        </div>

        <aside className={styles.projectFinancialReportGraph} aria-labelledby="project-financial-graph-heading">
          <h3 id="project-financial-graph-heading" className={styles.projectFinancialReportSectionTitle}>
            {copy.graphTitle}
          </h3>
          <div className={`${styles.detailPanelTableCard} ${styles.projectFinancialReportGraphCard}`}>
            <div className={styles.projectFinancialReportGraphBody}>
              {report.costRows.length > 0 ? (
                <BudgetCategoryPieChart categoryCosts={report.budgetCategoryCosts} layout="fill" />
              ) : (
                <p className={styles.subtitle}>{copy.noCosts}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function formatReportPaymentProjectLabel(
  row: ProjectFinancialReportPaymentRow,
  projectName: string
): string {
  if (row.projectLabel != null) {
    return formatReportText(row.projectLabel);
  }
  return formatReportText(projectName);
}

function FinancialReportPaymentMobileCard({
  row,
  projectName,
  labels,
  paidLabel,
}: {
  readonly row: ProjectFinancialReportPaymentRow;
  readonly projectName: string;
  readonly labels: {
    readonly payment: string;
    readonly project: string;
    readonly amount: string;
    readonly status: string;
    readonly paidDate: string;
  };
  readonly paidLabel: string;
}): ReactElement {
  const isPaid = row.paidIndicator === 'paid';
  const paidDisplay = isPaid ? `✓ ${paidLabel}` : `✕ ${paidLabel}`;
  const paidValueClass = isPaid
    ? styles.projectFinancialPaymentPaidValue
    : styles.projectFinancialPaymentUnpaidValue;

  return (
    <article
      className={`${styles.card} ${styles.workflowTaskMobileCard}`}
      aria-label={`${labels.payment}: ${row.title}`}
    >
      <div className={styles.workflowTaskMobileCardGrid2}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{labels.payment}</span>
          <span className={styles.workflowTaskMobileCardValue}>{row.title}</span>
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{labels.project}</span>
          <span className={styles.workflowTaskMobileCardValue}>
            {formatReportPaymentProjectLabel(row, projectName)}
          </span>
        </div>
      </div>
      <div className={styles.workflowTaskMobileCardGrid3}>
        <div className={styles.workflowTaskMobileCardCell}>
          <span className={styles.projectInfoMobileLabel}>{labels.amount}</span>
          <span className={styles.workflowTaskMobileCardValue}>{formatCentsAsUsd(row.amountCents)}</span>
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}>
          <span className={styles.projectInfoMobileLabel}>{labels.status}</span>
          <span className={styles.workflowTaskMobileCardValue}>{row.statusLabel}</span>
        </div>
        <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
          <span className={styles.projectInfoMobileLabel}>{labels.paidDate}</span>
          <span className={styles.workflowTaskMobileCardValue}>{row.paidAtLabel}</span>
        </div>
      </div>
      <div className={styles.projectFinancialPaymentStatusRow}>
        <span className={paidValueClass}>{paidDisplay}</span>
      </div>
    </article>
  );
}

function FinancialSummaryMobileCard({
  value,
  collected,
  balance,
  costs,
  actualProfit,
  projectedProfit,
  labels,
}: {
  readonly value: string;
  readonly collected: string;
  readonly balance: string;
  readonly costs: string;
  readonly actualProfit: string;
  readonly projectedProfit: string;
  readonly labels: {
    readonly value: string;
    readonly collected: string;
    readonly balance: string;
    readonly costs: string;
    readonly actualProfit: string;
    readonly projectedProfit: string;
  };
}): ReactElement {
  const rows: [
    [{ label: string; value: string }, { label: string; value: string }],
    [{ label: string; value: string }, { label: string; value: string }],
    [{ label: string; value: string }, { label: string; value: string }],
  ] = [
    [
      { label: labels.value, value },
      { label: labels.collected, value: collected },
    ],
    [
      { label: labels.balance, value: balance },
      { label: labels.costs, value: costs },
    ],
    [
      { label: labels.actualProfit, value: actualProfit },
      { label: labels.projectedProfit, value: projectedProfit },
    ],
  ];

  return (
    <article
      className={styles.projectFinancialKpiMobileCard}
      aria-labelledby="project-financial-summary-heading"
    >
      <div className={styles.projectFinancialKpiMobileGrid} role="list">
        {rows.map((row) => (
          <div
            key={`${row[0].label}-${row[1].label}`}
            className={styles.projectFinancialKpiMobileRow}
            role="presentation"
          >
            {row.map((item, index) => (
              <div
                key={item.label}
                className={
                  index === 1
                    ? `${styles.projectFinancialKpiMobileCell} ${styles.projectFinancialKpiMobileCell_right}`
                    : styles.projectFinancialKpiMobileCell
                }
                role="listitem"
              >
                <span className={styles.projectInfoMobileLabel}>{item.label}</span>
                <span className={styles.projectFinancialKpiMobileValue}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function FinancialKpiCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <article
      className={styles.projectFinancialKpiCard}
      role="listitem"
      aria-label={`${label}: ${value}`}
    >
      <span className={styles.projectFinancialKpiLabel}>{label}</span>
      <span className={styles.projectFinancialKpiValue}>{value}</span>
    </article>
  );
}
