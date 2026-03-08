/**
 * Start Impersonation API
 *
 * POST /api/super-admin/users/[id]/impersonate - Start impersonating a user
 *
 * Requires Super Admin authentication.
 * Covers: SAUD-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { startImpersonation } from '@/lib/services/impersonation-service';
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

const StartImpersonationSchema = z.object({
  duration: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be at most 500 characters'),
});

/**
 * POST /api/super-admin/users/[id]/impersonate
 *
 * Start impersonating a target user.
 * Body: { duration: 15 | 30 | 60, reason: string }
 * Returns: { token, orgSlug }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: targetUserId } = await params;
    const body = await req.json();

    const parsed = StartImpersonationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { duration, reason } = parsed.data;
    const ipAddress = getIpAddress(req);

    const result = await startImpersonation(
      authResult.user.id,
      targetUserId,
      duration,
      reason,
      ipAddress
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Map known errors to appropriate status codes
    if (
      message === 'Target user not found' ||
      message === 'Target user has no active organization membership'
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message === 'Only Super Admins can impersonate users' ||
      message === 'Cannot impersonate another Super Admin'
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error('Start impersonation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
