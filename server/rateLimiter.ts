/**
 * Fixed-window rate limiter keyed by client (IP). In-memory, so it is per server instance:
 * a cheap first line of defence against a leaked URL burning the Gemini quota. Hosts add their own
 * limits on top (Cloudflare rate-limiting rules, Azure API Management, etc).
 */
export interface RateLimiter {
  /** Returns true if the request is allowed, false if the client is over its limit. */
  take(clientKey: string): boolean;
}

export const createRateLimiter = (
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter => {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    take(clientKey) {
      const t = now();
      const w = windows.get(clientKey);
      if (!w || t - w.start >= windowMs) {
        windows.set(clientKey, { start: t, count: 1 });
        if (windows.size > 10_000) {
          for (const [key, value] of windows) if (t - value.start >= windowMs) windows.delete(key);
        }
        return true;
      }
      if (w.count >= limit) return false;
      w.count += 1;
      return true;
    },
  };
};
