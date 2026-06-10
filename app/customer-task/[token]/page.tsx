import type { ReactElement } from 'react';
import { CustomerTaskPortal } from '@/presentation/components/CustomerTaskPortal/CustomerTaskPortal';

type PageProps = {
  params: { token: string };
};

export default function CustomerTaskPage({ params }: PageProps): ReactElement {
  return <CustomerTaskPortal token={params.token} />;
}
