/**
 * Ensures ZIP entry file names stay unique without overwriting.
 * e.g. photo.jpg, photo (2).jpg, photo (3).jpg
 */
export function uniqueZipEntryFileNames(fileNames: readonly string[]): string[] {
  const usedCounts = new Map<string, number>();

  return fileNames.map((rawName) => {
    const trimmed = rawName.trim() || 'file';
    const count = usedCounts.get(trimmed) ?? 0;
    usedCounts.set(trimmed, count + 1);
    if (count === 0) return trimmed;

    const suffix = count + 1;
    const lastDot = trimmed.lastIndexOf('.');
    if (lastDot > 0) {
      return `${trimmed.slice(0, lastDot)} (${suffix})${trimmed.slice(lastDot)}`;
    }
    return `${trimmed} (${suffix})`;
  });
}

/** Safe ZIP archive base name from a project/subproject display name. */
export function buildDocumentsZipFileName(projectName: string, now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  const safeName = projectName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  if (!safeName) return `documents-${stamp}.zip`;
  return `${safeName}-documents-${stamp}.zip`;
}

export function buildPhotosZipFileName(now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `photos-${stamp}.zip`;
}
