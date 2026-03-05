/**
 * Impersonation Management API
 *
 * GET    /api/super-admin/impersonation - Check impersonation status
 * DELETE /api/super-admin/impersonation - End impersonation session
 *
 * Uses the current session token from Authorization header.
 * Covers: SAUD-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getImpersonationStatus,
  endImpersonation,
} from '@/lib/services/impersonation-service';

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * GET /api/super-admin/impersonation
 *
 * Check current impersonation status for the session.
 * Returns impersonation details or { isImpersonating: false }.
 */
export async function GET(req: NextRequest) {
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'No session token' },
        { status: 401 }
      );
    }

    const status = await getImpersonationStatus(token);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Get impersonation status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/impersonation
 *
 * End the current impersonation session.
 * The impersonatorId from the session is used to verify authorization.
 */
export async function DELETE(req: NextRequest) {
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'No session token' },
        { status: 401 }
      );
    }

    // Get the impersonation status to find the impersonatorId
    const status = await getImpersonationStatus(token);
    if (!status.isImpersonating) {
      return NextResponse.json(
        { error: 'Not currently impersonating' },
        { status: 400 }
      );
    }

    // Look up the session to get impersonatorId
    const { default: prisma } = await import('@/lib/db');
    const session = await prisma.session.findUnique({
      where: { token },
      select: { impersonatorId: true },
    });

    if (!session?.impersonatorId) {
      return NextResponse.json(
        { error: 'Not an impersonation session' },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    await endImpersonation(token, session.impersonatorId, ipAddress);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (
      message === 'Session not found' ||
      message === 'This is not an impersonation session' ||
      message === 'Not authorized to end this impersonation session'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('End impersonation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
