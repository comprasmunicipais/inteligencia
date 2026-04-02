import { NextRequest } from 'next/server'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS = 5

// In-memory store: ip → list of request timestamps within the current window.
// Note: this is per-instance — on Vercel with multiple serverless instances,
// each instance has its own store. Acceptable for brute-force protection;
// use Upstash Redis for cross-instance enforcement.
const store = new Map<string, number[]>()

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Sliding-window rate limiter.
 * Returns { limited: true } when the IP has exceeded MAX_REQUESTS in WINDOW_MS.
 */
export function checkRateLimit(ip: string): { limited: boolean } {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const prev = store.get(ip) ?? []
  const timestamps = prev.filter((t) => t > windowStart)

  if (timestamps.length >= MAX_REQUESTS) {
    store.set(ip, timestamps)
    return { limited: true }
  }

  timestamps.push(now)
  store.set(ip, timestamps)
  return { limited: false }
}
