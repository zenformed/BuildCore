export function organizationExportFilename(date: Date = new Date()): string {
  const isoDate = date.toISOString().slice(0, 10);
  return `buildcore-organization-export-${isoDate}.xlsx`;
}
