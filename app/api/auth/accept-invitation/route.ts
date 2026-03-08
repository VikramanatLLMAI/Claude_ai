/**
 * POST /api/auth/accept-invitation
 *
 * PUBLIC endpoint (no auth required) -- accepts an invitation and registers a new user.
 * Creates user account, org membership, and session atomically.
 *
 * Request body: { token: string, name: string, password: string }
 * Response 201: { user: { id, email, name }, token: string, expiresAt: string, organization: { id, name, slug } }
 * Response 400: { error: string, details?: string[] } -- validation/token errors
 * Response 409: { error: string } -- email already registered
 */

import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { acceptInvitation } from '@/lib/services/registration-service';

const AcceptInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  password: z.string().min(1, 'Password is required'),
  // Actual password policy validation happens in the service layer
});

export async function POST(req: NextRequest) {
  // Rate limiting: 5 requests per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  try {
    const body = await req.json();

    // Validate input shape
    const parsed = AcceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, name, password } = parsed.data;
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = req.headers.get('user-agent') || null;

    const result = await acceptInvitation(
      token,
      name,
      password,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      // Map error types to HTTP status codes
      const statusMap: Record<string, number> = {
        not_found: 400,
        expired: 400,
        revoked: 400,
        already_accepted: 400,
        org_unavailable: 400,
        already_registered: 409,
        password_policy: 400,
        validation: 400,
      };
      const status = statusMap[result.errorType || ''] || 400;
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status }
      );
    }

    return NextResponse.json(
      {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt,
        organization: result.organization,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
