/**
 * Public lead capture rate limiting hook.
 * V1: no-op placeholder so routes can call a single guard before processing.
 * Replace with Redis / edge rate limiter when scaling public lead endpoints.
 */
export function assertLeadCaptureRateLimit(_leadToken: string): void {
  // Intentionally empty — structure only for future rate limiting.
}
