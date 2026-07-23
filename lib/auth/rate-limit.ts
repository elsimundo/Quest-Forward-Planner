// In-memory login attempt limiter, keyed by IP + username/email. Resets on server
// restart — fine for a single-instance deploy; revisit if this ever runs multi-instance.
type Entry = { attempts: number[] };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const buckets = new Map<string, Entry>();

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = buckets.get(key) ?? { attempts: [] };
  entry.attempts = entry.attempts.filter((ts) => now - ts <= WINDOW_MS);

  if (entry.attempts.length >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - entry.attempts[0]);
    buckets.set(key, entry);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  entry.attempts.push(now);
  buckets.set(key, entry);
  return { allowed: true };
}
