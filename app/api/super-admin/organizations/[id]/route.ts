/**
 * Super Admin Organization API - Single Organization
 *
 * GET    /api/super-admin/organizations/[id] - Get organization details
 * PATCH  /api/super-admin/organizations/[id] - Update organization
 * DELETE /api/super-admin/organizations/[id] - Soft-delete organization
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/services/org-service';
import {
  UpdateOrgSchema,
  formatValidationErrors,
} from '@/lib/validation';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/super-admin/organizations/[id]
 * Get a single organization with roles, settings, and member count.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const org = await getOrganization(id);
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(org);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/organizations/[id]
 * Update organization name, slug, or logoDisplayMode.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const org = await updateOrganization(
      id,
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(org);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
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

/**
 * DELETE /api/super-admin/organizations/[id]
 * Soft-delete an organization (30-day grace period).
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const ipAddress = getIpAddress(req);
    await deleteOrganization(id, authResult.user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message:
        'Organization scheduled for deletion. Data will be permanently removed in 30 days.',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('already deleted')) {
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
