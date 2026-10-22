/**
 * Small in-memory limiter for login and order creation. It protects a single server
 * process; on Vercel each instance counts separately, so put Upstash or Vercel's
 * firewall in front for hard guarantees. Supabase Auth also rate-limits on its side.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - (recent[0] ?? now))) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return { ok: true, retryAfterSeconds: 0 };
}
