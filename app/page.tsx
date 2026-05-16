import { redirect } from 'next/navigation';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

export default function HomePage(): never {
  redirect(buildcoreAppDefinition.dashboardRoute ?? '/dashboard');
}
