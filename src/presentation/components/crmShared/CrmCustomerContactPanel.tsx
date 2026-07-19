'use client';

import type { ReactElement } from 'react';
import type { CrmContact } from '@/domain/crm/contact';
import type { CrmProjectAddress } from '@/domain/crm/projectAddress';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatContactEmailDisplay,
  formatPhoneDisplay,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectSummaryAddress } from '@/presentation/components/CrmProjectDetail/ProjectSummaryAddress';
import { SubprojectMobileContactValue } from '@/presentation/components/CrmProjectDetail/SubprojectMobileContactValue';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type CrmCustomerContactPanelProps = {
  readonly headingId: string;
  readonly heading: string;
  readonly customerName: string;
  readonly contact: Pick<CrmContact, 'name' | 'email' | 'phone' | 'emails' | 'phones'>;
  readonly address?: CrmProjectAddress | null;
  readonly maskForMember?: boolean;
  readonly assignedDisplay?: string | null;
  readonly updatedDisplay?: string | null;
  readonly notes?: string | null;
  readonly onContactCopied?: (message: string) => void;
};

/**
 * Shared customer/contact panel used by project detail and Member task detail.
 * Uses ProjectDetail card/dl tokens and existing contact value / address components.
 */
export function CrmCustomerContactPanel({
  headingId,
  heading,
  customerName,
  contact,
  address = null,
  maskForMember = false,
  assignedDisplay = null,
  updatedDisplay = null,
  notes = null,
  onContactCopied,
}: CrmCustomerContactPanelProps): ReactElement {
  const fields = content.projectDetail.fields;
  const emails = nonEmptyContactValues(contact.emails);
  const phones = nonEmptyContactValues(contact.phones);
  const displayEmail = formatContactEmailDisplay(contact.email, { maskForMember });
  const displayPhone = formatPhoneDisplay(contact.phone);

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.cardTitle}>
        {heading}
      </h3>
      <p className={styles.customerName}>{customerName}</p>
      <dl className={styles.dl}>
        <div className={styles.dlRow}>
          <dt>{fields.contact}</dt>
          <dd>{contact.name || '—'}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{fields.email}</dt>
          <dd>
            <SubprojectMobileContactValue
              kind="email"
              values={emails}
              displayValue={displayEmail}
              formatDisplayValue={(email) =>
                formatContactEmailDisplay(email, { maskForMember })
              }
              getCopyValue={(email) =>
                maskForMember
                  ? formatContactEmailDisplay(email, { maskForMember: true })
                  : email.trim()
              }
              onCopied={onContactCopied}
              isMemberRole={maskForMember}
              valueClassName={styles.summaryText}
            />
          </dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{fields.phone}</dt>
          <dd>
            <SubprojectMobileContactValue
              kind="phone"
              values={phones}
              displayValue={displayPhone}
              formatDisplayValue={(phone) => formatPhoneDisplay(phone)}
              getCopyValue={(phone) => formatPhoneDisplay(phone) || phone.trim()}
              onCopied={onContactCopied}
              isMemberRole={maskForMember}
              valueClassName={styles.summaryText}
            />
          </dd>
        </div>
        {address != null ? (
          <div className={styles.dlRow}>
            <dt>{fields.address}</dt>
            <dd>
              <ProjectSummaryAddress
                address={address}
                label={fields.address}
                layout="value"
              />
            </dd>
          </div>
        ) : null}
        {assignedDisplay != null ? (
          <div className={styles.dlRow}>
            <dt>{fields.assigned}</dt>
            <dd>{assignedDisplay}</dd>
          </div>
        ) : null}
        {updatedDisplay != null ? (
          <div className={styles.dlRow}>
            <dt>{fields.updated}</dt>
            <dd>{updatedDisplay}</dd>
          </div>
        ) : null}
      </dl>
      {notes ? <p className={styles.notesBlock}>{notes}</p> : null}
    </section>
  );
}
