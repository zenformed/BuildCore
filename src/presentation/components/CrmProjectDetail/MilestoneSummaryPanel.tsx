'use client';

import type { ReactElement } from 'react';
import type { CrmMilestoneStatus, CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectDetailPaymentFinancials } from '@/presentation/features/crmProjectDetail/useProjectDetailPaymentFinancials';
import {
  formatMilestoneStatus,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import styles from './ProjectDetail.module.css';

function milestoneStatusClass(status: CrmMilestoneStatus): string {
  return styles[`milestoneStatus_${status}`] ?? styles.milestoneStatus_pending;
}

export type MilestoneSummaryPanelProps = {
  project: CrmProjectDetail;
};

export function MilestoneSummaryPanel({ project }: MilestoneSummaryPanelProps): ReactElement {
  const { summary, milestonePayment } = project;
  const { childSummaries } = useProjectDetailShell();
  const paymentFinancials = useProjectDetailPaymentFinancials({
    project,
    childSummaries: childSummaries?.allRows ?? null,
  });
  const fields = content.projectDetail.fields;
  const isSubproject = summary.parentProjectId != null;
  const valueLabel = isSubproject ? fields.subValue : fields.projectValue;

  return (
    <section className={styles.card} aria-labelledby="milestone-summary-heading">
      <h3 id="milestone-summary-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.financials}
      </h3>
      <div className={styles.metricRow}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{valueLabel}</span>
          <span className={styles.metricValue}>{formatCentsAsUsd(paymentFinancials.valueCents)}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{fields.balance}</span>
          <span className={styles.metricValue}>
            {formatCentsAsUsd(paymentFinancials.balanceDueCents)}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{fields.invoiced}</span>
          <span className={styles.metricValue}>{formatCentsAsUsd(milestonePayment.invoicedCents)}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{fields.paid}</span>
          <span className={styles.metricValue}>{formatCentsAsUsd(milestonePayment.paidCents)}</span>
        </div>
      </div>
      {milestonePayment.milestones.length === 0 ? (
        <p className={styles.subtitle}>{content.projectDetail.milestones.empty}</p>
      ) : (
        <ul className={styles.milestoneList}>
          {milestonePayment.milestones.map((milestone) => (
            <li key={milestone.id} className={styles.milestoneItem}>
              <span>
                {milestone.label} · {formatCentsAsUsd(milestone.amountCents)}
                {milestone.dueAt ? ` · due ${formatShortDate(milestone.dueAt)}` : null}
              </span>
              <span className={milestoneStatusClass(milestone.status)}>
                {formatMilestoneStatus(milestone.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
