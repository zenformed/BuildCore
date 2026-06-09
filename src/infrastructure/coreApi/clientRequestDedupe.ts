const inFlight = new Map<string, Promise<unknown>>();
const sessionCache = new Map<string, unknown>();

/** Share one concurrent request for the same key (StrictMode-safe). */
export function runInFlight<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader().finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, promise);
  return promise;
}

export function peekSessionCache<T>(key: string): T | undefined {
  if (!sessionCache.has(key)) return undefined;
  return sessionCache.get(key) as T;
}

/** Cache successful results for the current browser session. */
export function runSessionCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (sessionCache.has(key)) {
    return Promise.resolve(sessionCache.get(key) as T);
  }
  return runInFlight(`session:${key}`, async () => {
    const value = await loader();
    sessionCache.set(key, value);
    return value;
  });
}

export function invalidateSessionCache(key: string): void {
  sessionCache.delete(key);
}

export function invalidateSessionCachePrefix(prefix: string): void {
  for (const key of sessionCache.keys()) {
    if (key.startsWith(prefix)) {
      sessionCache.delete(key);
    }
  }
}
