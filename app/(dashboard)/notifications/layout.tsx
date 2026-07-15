import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Notifications',
};

export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <>{children}</>;
}
