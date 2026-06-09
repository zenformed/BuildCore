/**
 * Schedule work after first paint / when the browser is idle so critical route data can load first.
 */
export function deferNonCriticalWork(task: () => void): () => void {
  if (typeof window === 'undefined') {
    task();
    return () => undefined;
  }

  let cancelled = false;
  const run = (): void => {
    if (!cancelled) task();
  };

  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(run, { timeout: 1500 });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(handle);
    };
  }

  const handle = globalThis.setTimeout(run, 1);
  return () => {
    cancelled = true;
    globalThis.clearTimeout(handle);
  };
}
