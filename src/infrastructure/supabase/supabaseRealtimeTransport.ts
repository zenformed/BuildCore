/**
 * Node.js < 22 has no global WebSocket. @supabase/supabase-js throws on createClient
 * unless a transport (e.g. `ws`) is provided. Browsers / Node 22+ need no change.
 */

type RealtimeTransport = new (...args: never[]) => unknown;

let cachedTransport: RealtimeTransport | null | undefined;

export function resolveSupabaseRealtimeTransport(): RealtimeTransport | undefined {
  if (typeof WebSocket !== 'undefined') return undefined;
  if (cachedTransport !== undefined) return cachedTransport ?? undefined;

  try {
    // Dynamic require: only needed in Node without global WebSocket.
    const ws = require('ws') as RealtimeTransport;
    cachedTransport = ws;
    return ws;
  } catch {
    cachedTransport = null;
    return undefined;
  }
}

export function withSupabaseRealtimeTransport<T extends object>(options: T): T {
  const transport = resolveSupabaseRealtimeTransport();
  if (transport == null) return options;
  const existingRealtime =
    'realtime' in options && options.realtime != null && typeof options.realtime === 'object'
      ? (options.realtime as object)
      : {};
  return {
    ...options,
    realtime: {
      ...existingRealtime,
      transport,
    },
  };
}
