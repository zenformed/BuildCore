'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatProjectFinancialPaymentHierarchyLabel,
  isProjectFinancialChildPaymentRow,
} from '@/reports/formatReportValues';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectFinancialReport } from '@/presentation/features/crmProjectDetail/useProjectFinancialReport';
import { useProjectProfitAndLossPdfExport } from '@/presentation/features/crmProjectDetail/useProjectProfitAndLossPdfExport';
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

      <div className={styles.projectFinancialReportBody}>
        <div className={styles.projectFinancialReportMain}>
          <section className={styles.projectFinancialReportSection} aria-labelledby="project-financial-summary-heading">
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
          </section>

          <section className={styles.projectFinancialReportSection} aria-labelledby="project-financial-payments-heading">
            <h3 id="project-financial-payments-heading" className={styles.projectFinancialReportSectionTitle}>
              {copy.paymentsTitle}
            </h3>
            {report.payments.length > 0 ? (
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
