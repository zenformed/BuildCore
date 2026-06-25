export type BulkMarkInactiveCrmProjectsResult = {
  readonly updatedCount: number;
  readonly updatedSlugs: readonly string[];
  readonly failedSlugs: readonly string[];
};
