import type { ReactElement } from 'react';
import { LeadCapturePage } from '@/presentation/components/leadCapture/LeadCapturePage';

type PageProps = {
  params: { token: string };
};

export default function LeadCaptureRoutePage({ params }: PageProps): ReactElement {
  return <LeadCapturePage token={params.token} />;
}
