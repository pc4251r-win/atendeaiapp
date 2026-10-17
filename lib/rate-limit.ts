import 'server-only'

const buckets = new Map<string, { tokens: number; at: number }>()

/** Token bucket em memória por instância. Para escala real, troque por Redis/Upstash. */
export function rateLimit(key: string, max: number, perMs: number) {
  const now = Date.now()
  const b = buckets.get(key) ?? { tokens: max, at: now }
  b.tokens = Math.min(max, b.tokens + ((now - b.at) / perMs) * max)
  b.at = now
  if (b.tokens < 1) {
    buckets.set(key, b)
    return false
  }
  b.tokens -= 1
  buckets.set(key, b)
  return true
}

export const clientIp = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon'
