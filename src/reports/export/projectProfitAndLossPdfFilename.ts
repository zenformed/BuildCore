/** Safe download name: `{slug}_P-and-L.pdf` (no raw `&`). */
export function projectProfitAndLossPdfFilename(projectSlug: string): string {
  const safe =
    projectSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project';
  return `${safe}_P-and-L.pdf`;
}
