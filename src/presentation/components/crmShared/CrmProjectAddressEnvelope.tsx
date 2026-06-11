'use client';

import type { ReactElement } from 'react';
import type { CrmProjectAddress } from '@/domain/crm';
import { formatCrmProjectAddressEnvelopeLines } from '@/domain/crm/projectAddress';
import shared from './crmShared.module.css';

export type CrmProjectAddressEnvelopeProps = {
  readonly address: CrmProjectAddress;
};

export function CrmProjectAddressEnvelope({
  address,
}: CrmProjectAddressEnvelopeProps): ReactElement {
  const { line1, line2 } = formatCrmProjectAddressEnvelopeLines(address);

  if (!line1 && !line2) {
    return <>—</>;
  }

  return (
    <span className={shared.addressEnvelope}>
      {line1 ? <span className={shared.addressEnvelopeLine}>{line1}</span> : null}
      {line2 ? <span className={shared.addressEnvelopeLine}>{line2}</span> : null}
    </span>
  );
}
