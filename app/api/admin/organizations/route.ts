/**
 * Super Admin Organization API - List & Create
 *
 * GET  /api/admin/organizations - List all organizations with stats
 * POST /api/admin/organizations - Create a new organization
 *
 * All routes require Super Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { createOrganization, listOrganizations } from '@/lib/services/org-service';
import {
  CreateOrgSchema,
  formatValidationErrors,
} from '@/lib/validation';

/**
 * GET /api/admin/organizations
 * List all organizations with user counts and deletion status.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const orgs = await listOrganizations();
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations
 * Create a new organization with optional initial admin invitation.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const org = await createOrganization(
      parsed.data,
      authResult.user.id,
      ipAddress
    );

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
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
