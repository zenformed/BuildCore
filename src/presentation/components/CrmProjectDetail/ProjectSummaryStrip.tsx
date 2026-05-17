'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd, formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

function priorityClass(priority: string): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

type SummaryMetricProps = {
  label: string;
  children: ReactNode;
};

function SummaryMetric({ label, children }: SummaryMetricProps): ReactElement {
  return (
    <div className={styles.summaryMetric} role="group" aria-label={label}>
      <div className={styles.summaryValue}>{children}</div>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}

export type ProjectSummaryStripProps = {
  project: CrmProjectDetail;
};

export function ProjectSummaryStrip({ project }: ProjectSummaryStripProps): ReactElement {
  const { summary } = project;
  const fields = content.projectDetail.fields;

  return (
    <section className={styles.summaryStrip} aria-label="Project summary">
      <SummaryMetric label={fields.customer}>
        <span className={styles.summaryText}>{summary.client.name}</span>
      </SummaryMetric>
      <SummaryMetric label={fields.contact}>
        <span className={styles.summaryText}>{summary.contact.name}</span>
      </SummaryMetric>
      <SummaryMetric label={fields.email}>
        <a className={styles.summaryLink} href={`mailto:${summary.contact.email}`}>
          {summary.contact.email}
        </a>
      </SummaryMetric>
      <SummaryMetric label={fields.phone}>
        <a className={styles.summaryLink} href={`tel:${summary.contact.phone}`}>
          {summary.contact.phone}
        </a>
      </SummaryMetric>
      <SummaryMetric label={content.projectDetail.currentStage}>
        <span className={shared.stagePill}>{formatStageLabel(summary.currentStageSlug)}</span>
      </SummaryMetric>
      <SummaryMetric label={fields.priority}>
        <span className={priorityClass(summary.priority)}>{summary.priority}</span>
      </SummaryMetric>
      <SummaryMetric label={fields.dealValue}>
        <span className={styles.summaryText}>{formatCentsAsUsd(summary.dealValueCents)}</span>
      </SummaryMetric>
      <SummaryMetric label={fields.balance}>
        <span className={styles.summaryText}>{formatCentsAsUsd(summary.balanceRemainingCents)}</span>
      </SummaryMetric>
    </section>
  );
}
