/**
 * Registration API (DISABLED)
 *
 * Direct registration is disabled in multi-tenant mode.
 * Users must be invited to join an organization (Phase 2: invite flow).
 */

import { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function POST(req: NextRequest) {
  // Rate limiting: 5 requests per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  return Response.json(
    { error: 'Registration is invite-only. Please use your invitation link.' },
    { status: 403 }
  );
}
