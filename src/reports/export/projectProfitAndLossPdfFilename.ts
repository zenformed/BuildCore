/** Safe download name: `{slug}_Financial-Report.pdf` */
export function projectProfitAndLossPdfFilename(projectSlug: string): string {
  const safe =
    projectSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project';
  return `${safe}_Financial-Report.pdf`;
}
