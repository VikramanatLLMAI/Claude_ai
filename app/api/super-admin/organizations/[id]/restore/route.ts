/**
 * Super Admin Organization API - Restore
 *
 * POST /api/super-admin/organizations/[id]/restore - Restore a soft-deleted organization
 *
 * Requires Super Admin authentication.
 * Organization must be within the 30-day grace period.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { restoreOrganization } from '@/lib/services/org-service';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/super-admin/organizations/[id]/restore
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    const org = await restoreOrganization(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: 'Organization restored successfully.',
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
      if (error.message.includes('not deleted')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('grace period has expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 410 }
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
