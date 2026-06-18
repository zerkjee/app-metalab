import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const USE_UPSTASH = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let redis = null;
function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

const upstashLimiters = new Map();

function getIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Upstash (distribuído, funciona entre instâncias serverless) ──────────────
function upstashRateLimit({ windowMs, max, prefix = "rl" }) {
  const key = `${prefix}:${windowMs}:${max}`;
  if (!upstashLimiters.has(key)) {
    upstashLimiters.set(
      key,
      new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
        prefix: `metalab:${prefix}`,
      })
    );
  }
  const limiter = upstashLimiters.get(key);

  return async function check(request) {
    try {
      const ip = getIp(request);
      const { success, reset } = await limiter.limit(ip);
      if (success) return null;
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return Response.json(
        { error: "Muitas requisições. Tente novamente em alguns segundos." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    } catch {
      return null;
    }
  };
}

// ── Fallback in-memory (single-instance, dev/sem Upstash) ───────────────────
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

function memoryRateLimit({ windowMs, max }) {
  return function check(request) {
    cleanup(windowMs);
    const ip = getIp(request);
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
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    return null;
  };
}

// ── API pública (mesma assinatura, troca automaticamente) ───────────────────
export function rateLimit({ windowMs = 60_000, max = 10, prefix = "rl" } = {}) {
  if (USE_UPSTASH) {
    const limiter = upstashRateLimit({ windowMs, max, prefix });
    return function check(request) {
      return limiter(request);
    };
  }
  return memoryRateLimit({ windowMs, max });
}
