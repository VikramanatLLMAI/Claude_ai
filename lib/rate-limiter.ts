/**
 * In-memory sliding window rate limiter
 *
 * Provides per-key rate limiting with configurable windows and request counts.
 * Used by auth, API, and chat routes (wired in plan 02).
 *
 * Exports: checkRateLimit, rateLimitResponse, RATE_LIMITS
 */

import { NextResponse } from 'next/server';

// ============================================
// Types
// ============================================

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

// ============================================
// Store
// ============================================

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 60 seconds — remove expired entries
// Use 15 minutes (largest window) as the max expiry check
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_WINDOW_MS = 15 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < MAX_WINDOW_MS
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    });
  }, CLEANUP_INTERVAL_MS);
}

// ============================================
// Rate Limiting
// ============================================

/**
 * Check if a request is allowed under the given rate limit config.
 *
 * Uses a sliding window approach: only timestamps within windowMs are counted.
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration (maxRequests, windowMs)
 * @returns RateLimitResult with allowed status, retry info, and remaining count
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Filter to only timestamps within the current window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    // Rate limit exceeded — calculate retry delay from oldest timestamp in window
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    store.set(key, entry);

    return {
      allowed: false,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      remaining: 0,
    };
  }

  // Allowed — record this request
  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

// ============================================
// Response Helper
// ============================================

/**
 * Create a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

// ============================================
// Preset Configurations
// ============================================

/**
 * Standard rate limit tiers:
 * - auth: 5 requests per 15 minutes (login, register, password reset)
 * - api: 60 requests per minute (general API calls)
 * - chat: 10 requests per minute (AI chat streaming)
 */
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 } as RateLimitConfig,
  api: { maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
  chat: { maxRequests: 10, windowMs: 60 * 1000 } as RateLimitConfig,
} as const;
