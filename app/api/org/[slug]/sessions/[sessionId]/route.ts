/**
 * Session Revoke API
 *
 * DELETE /api/org/[slug]/sessions/[sessionId] - Revoke a specific session
 *
 * Users can revoke any of their sessions except the current one.
 * The current session is identified by the Authorization bearer token.
 *
 * Protected by requireOrgAuth middleware (any org member).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { revokeSession } from '@/lib/services/session-service';
import prisma from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * DELETE /api/org/[slug]/sessions/[sessionId]
 * Revoke a specific session. Cannot revoke the current session.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { sessionId } = await params;

  try {
    // Extract current session token from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.slice(7); // Remove "Bearer "

    // Find the current session by token to get its ID
    const currentSession = await prisma.session.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: 'Current session not found' },
        { status: 401 }
      );
    }

    // revokeSession validates that sessionId !== currentSessionId
    await revokeSession(sessionId, currentSession.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';

    // Known validation errors from session service
    if (message === 'Cannot revoke your current session. Use logout instead.' ||
        message === 'Session not found') {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    console.error('Failed to revoke session:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
