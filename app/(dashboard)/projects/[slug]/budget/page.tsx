import { redirect } from 'next/navigation';

type RouteContext = { params: { slug: string } };

export default function ProjectBudgetRedirectPage({ params }: RouteContext) {
  redirect(`/projects/${params.slug}/financials`);
}
