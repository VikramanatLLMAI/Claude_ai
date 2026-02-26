/**
 * Super Admin Organization API - Activate
 *
 * POST /api/admin/organizations/[id]/activate - Activate a suspended organization
 *
 * Requires Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { activateOrganization } from '@/lib/services/org-service';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/organizations/[id]/activate
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    const org = await activateOrganization(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: 'Organization activated.',
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
      if (error.message.includes('already active')) {
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
