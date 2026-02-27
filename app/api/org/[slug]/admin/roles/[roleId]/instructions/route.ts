/**
 * Role System Instructions API
 *
 * GET  /api/org/[slug]/admin/roles/[roleId]/instructions - Get role system instructions
 * PATCH /api/org/[slug]/admin/roles/[roleId]/instructions - Update role system instructions
 *
 * Protected by requireOrgAdmin middleware.
 * Verifies roleId belongs to the current organization to prevent cross-org modification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { getIpAddress } from '@/lib/services/audit-service';
import { saveRoleInstructions } from '@/lib/services/instruction-service';
import { RoleInstructionsSchema, formatValidationErrors } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ slug: string; roleId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { roleId } = await params;

  try {
    // Verify role belongs to this organization
    const role = await auth.tenantDb.role.findFirst({
      where: { id: roleId, organizationId: auth.organization.id },
      select: {
        id: true,
        name: true,
        systemInstructions: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      systemInstructions: role.systemInstructions || '',
      roleName: role.name,
    });
  } catch (error) {
    console.error('Failed to get role instructions:', error);
    return NextResponse.json(
      { error: 'Failed to load role instructions' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { roleId } = await params;

  try {
    // Verify role belongs to this organization
    const role = await auth.tenantDb.role.findFirst({
      where: { id: roleId, organizationId: auth.organization.id },
      select: { id: true, name: true },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Validate request body
    const parsed = RoleInstructionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationErrors(parsed.error.issues) },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(req);
    const result = await saveRoleInstructions(
      roleId,
      auth.organization.id,
      parsed.data.systemInstructions,
      auth.user.id,
      ipAddress,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      systemInstructions: parsed.data.systemInstructions,
      roleName: role.name,
    });
  } catch (error) {
    console.error('Failed to update role instructions:', error);
    return NextResponse.json(
      { error: 'Failed to save role instructions' },
      { status: 500 }
    );
  }
}
