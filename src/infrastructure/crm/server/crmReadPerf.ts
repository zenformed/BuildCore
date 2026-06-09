import { performance } from 'node:perf_hooks';

export type CrmReadPerfTimings = Record<string, number>;

export function startCrmReadPerfTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

export function logCrmProjectDetailPerf(
  slug: string,
  timings: CrmReadPerfTimings
): void {
  if (process.env.NODE_ENV !== 'development') return;
  const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
  console.info('[PERF] getCrmProjectDetailBySlugForOrg', { slug, totalMs: total, ...timings });
}
