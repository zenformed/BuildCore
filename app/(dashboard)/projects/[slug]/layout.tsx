'use client';

import type { ReactElement, ReactNode } from 'react';
import { ProjectDetailRouteLayout } from '@/presentation/components/CrmProjectDetail/ProjectDetailRouteLayout';

export default function ProjectSlugLayout({ children }: { children: ReactNode }): ReactElement {
  return <ProjectDetailRouteLayout>{children}</ProjectDetailRouteLayout>;
}
