export type BulkArchiveCrmProjectsResult = {
  readonly deletedCount: number;
  readonly deletedSlugs: readonly string[];
  readonly failedSlugs: readonly string[];
};
