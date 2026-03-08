/**
 * GET /api/auth/validate-invitation?token=xxx
 *
 * PUBLIC endpoint (no auth required) -- validates an invitation token.
 * Used by the registration page server component to pre-validate before rendering the form.
 *
 * The token itself is the proof of authorization. Only reveals limited info
 * (org name, role name, email) when a valid token is provided.
 */

import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken } from '@/lib/services/registration-service';

export async function GET(req: NextRequest) {
  // Rate limiting: 5 requests per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (token.length < 32) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    const result = await validateInvitationToken(token);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Validate invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
