const buckets = new Map();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (now - entry.start > windowMs * 2) buckets.delete(key);
  }
}

export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  return function check(request) {
    cleanup(windowMs);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const entry = buckets.get(ip);

    if (!entry || now - entry.start > windowMs) {
      buckets.set(ip, { start: now, count: 1 });
      return null;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      return Response.json(
        { error: "Muitas requisições. Tente novamente em alguns segundos." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    return null;
  };
}
