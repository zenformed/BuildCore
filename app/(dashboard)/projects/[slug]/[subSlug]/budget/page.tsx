import { redirect } from 'next/navigation';

type RouteContext = { params: { slug: string; subSlug: string } };

export default function ProjectSubBudgetRedirectPage({ params }: RouteContext) {
  redirect(`/projects/${params.slug}/${params.subSlug}/financials`);
}
