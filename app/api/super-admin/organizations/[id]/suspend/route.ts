/**
 * Super Admin Organization API - Suspend
 *
 * POST /api/super-admin/organizations/[id]/suspend - Suspend an organization
 *
 * Requires Super Admin authentication.
 * Suspending invalidates all sessions for the organization immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { suspendOrganization } from '@/lib/services/org-service';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/super-admin/organizations/[id]/suspend
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    const org = await suspendOrganization(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: 'Organization suspended. All active sessions have been invalidated.',
      organization: org,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('already suspended')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
